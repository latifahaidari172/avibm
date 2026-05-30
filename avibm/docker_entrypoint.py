"""
Docker entrypoint for AVIBM monitor.

Patches the main script to:
  1. Read credentials from environment variables (not hardcoded)
  2. Connect to the remote Chrome browser (chrome-vnc container via Selenium Grid)
  3. Run forever with auto-recovery on crash

This wrapper exists so avibm_local_loop.py stays untouched and can still
run directly on a local Mac for development.
"""
import os
import sys
import time
import importlib
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("avibm-docker")

# ── Override credentials from environment ────────────────────────────
os.environ.setdefault("SUPABASE_URL", "")
os.environ.setdefault("SUPABASE_KEY", "")
os.environ.setdefault("CAPSOLVER_API_KEY", "")
os.environ.setdefault("GMAIL_USER", "")
os.environ.setdefault("GMAIL_PASSWORD", "")
os.environ.setdefault("SELENIUM_REMOTE_URL", "http://chrome-vnc:4444/wd/hub")

# Read the main script and patch credentials
script_path = os.path.join(os.path.dirname(__file__), "avibm_local_loop.py")
with open(script_path, "r") as f:
    source = f.read()

# Replace hardcoded credentials with env var reads
patches = [
    # Supabase
    ('SUPABASE_URL    = "https://aqvdzgffgjiduqjaucnk.supabase.co"',
     'SUPABASE_URL    = os.environ.get("SUPABASE_URL", "https://aqvdzgffgjiduqjaucnk.supabase.co")'),
    ('SUPABASE_KEY    = "eyJ',
     'SUPABASE_KEY    = os.environ.get("SUPABASE_KEY", "eyJ'),
    # CapSolver
    ('CAPSOLVER_KEY   = "CAP-',
     'CAPSOLVER_KEY   = os.environ.get("CAPSOLVER_API_KEY", "CAP-'),
    # Gmail
    ('GMAIL_ADDR      = "navidhaidari12@gmail.com"',
     'GMAIL_ADDR      = os.environ.get("GMAIL_USER", "navidhaidari12@gmail.com")'),
    ('GMAIL_PASS      = "wtac myma knfq bqzd"',
     'GMAIL_PASS      = os.environ.get("GMAIL_PASSWORD", "wtac myma knfq bqzd")'),
]

for old, new in patches:
    if old in source:
        source = source.replace(old, new, 1)

# Patch Chrome to use remote Selenium Grid instead of local Chrome
# Find where webdriver.Chrome() is called and replace with Remote
REMOTE_PATCH = '''
def _create_remote_driver(**kwargs):
    """Connect to remote Chrome in the chrome-vnc container."""
    from selenium.webdriver import Remote
    from selenium.webdriver.chrome.options import Options
    remote_url = os.environ.get("SELENIUM_REMOTE_URL", "http://chrome-vnc:4444/wd/hub")
    opts = Options()
    # No headless — chrome-vnc runs a real visible Chrome
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_argument("--window-size=1440,900")
    return Remote(command_executor=remote_url, options=opts)

# Monkey-patch: replace local Chrome with remote
import selenium.webdriver as _wd
_original_Chrome = _wd.Chrome
def _patched_Chrome(*args, **kwargs):
    try:
        return _create_remote_driver(**kwargs)
    except Exception as e:
        print(f"[avibm-docker] Remote Chrome failed ({e}), trying local...")
        return _original_Chrome(*args, **kwargs)
_wd.Chrome = _patched_Chrome
'''

# Inject the remote Chrome patch at the top of the script (after imports)
import_end = source.find("\n# ══════")
if import_end > 0:
    source = source[:import_end] + "\n" + REMOTE_PATCH + "\n" + source[import_end:]


def run_forever():
    """Execute the patched script in a loop — auto-restart on crash."""
    while True:
        logger.info("Starting AVIBM monitor...")
        try:
            exec(compile(source, script_path, "exec"), {"__name__": "__main__"})
        except KeyboardInterrupt:
            logger.info("Shutting down.")
            break
        except Exception as exc:
            logger.error(f"AVIBM crashed: {exc}", exc_info=True)
            logger.info("Restarting in 30 seconds...")
            time.sleep(30)


if __name__ == "__main__":
    # Wait for Chrome to be ready
    logger.info("Waiting for Chrome browser to be ready...")
    import requests as _req
    for attempt in range(30):
        try:
            r = _req.get(os.environ.get("SELENIUM_REMOTE_URL", "http://chrome-vnc:4444/wd/hub").replace("/wd/hub", "/status"), timeout=5)
            if r.status_code == 200:
                logger.info("Chrome is ready!")
                break
        except Exception:
            pass
        time.sleep(2)
    else:
        logger.warning("Chrome not ready after 60s — starting anyway")

    run_forever()
