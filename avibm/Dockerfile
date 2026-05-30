# AVIBM Booking Monitor — runs 24/7 monitoring QLD/SA inspection slots
# Connects to chrome-vnc container for real Chrome browser (CAPTCHA solving)
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps — minimal, no Chrome needed (uses remote Selenium)
RUN pip install --no-cache-dir \
    selenium==4.27.1 \
    webdriver-manager==4.0.2 \
    requests==2.32.3

# Copy the monitor script
COPY avibm_local_loop.py .
COPY docker_entrypoint.py .

HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
    CMD python -c "import requests; requests.get('http://chrome-vnc:4444/status', timeout=5)" || exit 1

CMD ["python", "-u", "docker_entrypoint.py"]
