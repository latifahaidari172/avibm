"""
AVIBM live log stream service.

Exposes two endpoints:
  GET /recent?lines=500       -> last N lines of avibm.log as JSON
  GET /stream                 -> server-sent events (SSE) tail of avibm.log

Auth: Bearer token via the AVIBM_LOG_SECRET env var.

Setup on the VPS:
  sudo apt install python3-pip
  pip install --user fastapi 'uvicorn[standard]'

  # Pick a long random secret
  echo "AVIBM_LOG_SECRET=$(openssl rand -hex 24)" | sudo tee /etc/avibm-log-stream.env

  # Copy the systemd unit (avibm-log-stream.service in this same dir)
  sudo cp scripts/avibm-log-stream.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable --now avibm-log-stream

  # Verify
  curl -H "Authorization: Bearer $(grep -oP 'AVIBM_LOG_SECRET=\K.*' /etc/avibm-log-stream.env)" \
       http://127.0.0.1:8090/recent?lines=20

Then expose port 8090 to the internet via Cloudflare Tunnel ingress, e.g.
add to ~/.cloudflared/config.yml under the existing tunnel:

  ingress:
    - hostname: logs.auction-intel.com
      service: http://localhost:8090
    - <existing ingress rules>

(Or whatever hostname / path you prefer. Keep the secret in
AVIBM_LOG_SECRET on the Vercel side too — the Next.js Edge proxy
attaches it on every upstream request.)
"""
import asyncio
import os
import subprocess
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

LOG_PATH = os.getenv('AVIBM_LOG_PATH', '/home/auction/gdrive/AI Projects/avibm/avibm.log')
SECRET = os.getenv('AVIBM_LOG_SECRET', '').strip()

app = FastAPI()


def _check_auth(req: Request) -> None:
    if not SECRET:
        raise HTTPException(status_code=503, detail='AVIBM_LOG_SECRET not set')
    if req.headers.get('authorization') != f'Bearer {SECRET}':
        raise HTTPException(status_code=401, detail='unauthorized')


@app.get('/recent')
async def recent(req: Request, lines: int = 500):
    _check_auth(req)
    n = max(1, min(int(lines), 5000))
    try:
        out = subprocess.check_output(
            ['tail', '-n', str(n), LOG_PATH],
            timeout=10,
        ).decode('utf-8', errors='replace')
    except (subprocess.CalledProcessError, FileNotFoundError):
        out = ''
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail='tail timeout')
    return JSONResponse({'lines': out.splitlines()})


@app.get('/stream')
async def stream(req: Request):
    _check_auth(req)

    async def gen():
        # tail -F follows the file by name (handles log rotation).
        # -n 0 means "don't backfill, just show new lines from now on" —
        # the client should call /recent first for backfill.
        proc = await asyncio.create_subprocess_exec(
            'tail', '-n', '0', '-F', LOG_PATH,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        try:
            # Open the SSE stream with a comment so the browser sees
            # the connection is live straight away.
            yield ': connected\n\n'
            while True:
                try:
                    line = await asyncio.wait_for(proc.stdout.readline(), timeout=15)
                except asyncio.TimeoutError:
                    if await req.is_disconnected():
                        break
                    # Heartbeat keeps the connection open through proxies
                    # (Cloudflare idle-timeout is ~100s on free plans).
                    yield ': heartbeat\n\n'
                    continue
                if not line:
                    # tail process died (file truly gone or signal). Try
                    # to restart it once.
                    break
                text = line.decode('utf-8', errors='replace').rstrip('\r\n')
                # SSE format: each event is one or more "data:" lines
                # followed by a blank line. Newlines inside a single
                # logical message must each be prefixed.
                yield f'data: {text}\n\n'
                if await req.is_disconnected():
                    break
        finally:
            try:
                proc.terminate()
                await asyncio.wait_for(proc.wait(), timeout=2)
            except (ProcessLookupError, asyncio.TimeoutError):
                try:
                    proc.kill()
                except ProcessLookupError:
                    pass

    return StreamingResponse(
        gen(),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache, no-transform',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
        },
    )


@app.get('/health')
async def health():
    return {'ok': True, 'log_path': LOG_PATH, 'log_exists': os.path.isfile(LOG_PATH)}
