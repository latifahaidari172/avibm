#!/usr/bin/env python3
"""
AVIBM Local Loop — v3 with all fixes:
1. CapSolver for fast CAPTCHA (5-15s)
2. Pre-solve CAPTCHA the moment a slot is found
3. Priority locations scanned first
4. Scanner browser restarts every 10 minutes
5. Detects when slot is taken and retries
Run: python3 ~/Downloads/avibm_local_loop.py
"""

import os, re, sys, time, threading, smtplib, tempfile, shutil, subprocess, signal, socket, uuid
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
import requests
import psycopg2
import psycopg2.extras

# ══════════════════════════════════════════════════════════════
# CREDENTIALS
# ══════════════════════════════════════════════════════════════
# Supabase removed 2026-05-30 — AVIBM now uses the local auction-intel
# Postgres (avibm schema) via DATABASE_URL (see the Database section below).
CAPSOLVER_KEY   = "CAP-DA713C39C6F13B070807A216316C2784907485D647D9C2A197DB6D2EAA912134"
GMAIL_ADDR      = "navidhaidari12@gmail.com"
GMAIL_PASS      = "wtac myma knfq bqzd"

BRISBANE      = ZoneInfo("Australia/Brisbane")
BROWSER_RESTART = 600  # restart scanner browser every 10 minutes

# ── Instance identity (used to track which device is running) ──
_mac = uuid.getnode()
INSTANCE_ID = f"{_mac:012x}"
HOSTNAME    = socket.gethostname()

# ── Dynamic scan settings (loaded from Supabase, refreshed every 5 min) ──
_settings_lock = threading.Lock()
_settings = {
    "scan_start":    (7, 30),
    "scan_fast_end": (11, 0),
    "scan_end":      (19, 0),
    "fast_interval": 10,
    "slow_interval": 60,
    "sa_interval":   60,
}

def _get(key):
    with _settings_lock: return _settings[key]

def is_active_time():
    now = datetime.now(BRISBANE)
    if now.weekday() >= 5: return False
    t = (now.hour, now.minute)
    return _get("scan_start") <= t < _get("scan_end")

def get_scan_interval():
    now = datetime.now(BRISBANE)
    t = (now.hour, now.minute)
    return _get("fast_interval") if t < _get("scan_fast_end") else _get("slow_interval")

def _fmt_hm(hm):
    """(7, 30) -> '7:30 AM'  /  (19, 0) -> '7:00 PM'"""
    h, m = hm
    suffix = "AM" if h < 12 else "PM"
    h12 = h % 12 or 12
    return f"{h12}:{m:02d} {suffix}"


def load_settings_from_db():
    """Load scan settings from Supabase bot_settings table."""
    global _settings
    try:
        rows = _pg_query("SELECT * FROM bot_settings WHERE id = 'main'")
        if isinstance(rows, list) and rows:
            row = rows[0]
            with _settings_lock:
                _settings = {
                    "scan_start":    (int(row.get("scan_start_hour", 7)),  int(row.get("scan_start_minute", 30))),
                    "scan_fast_end": (int(row.get("scan_fast_end_hour", 11)), int(row.get("scan_fast_end_minute", 0))),
                    "scan_end":      (int(row.get("scan_end_hour", 19)),   int(row.get("scan_end_minute", 0))),
                    "fast_interval": int(row.get("fast_interval", 10)),
                    "slow_interval": int(row.get("slow_interval", 60)),
                    "sa_interval":   int(row.get("sa_interval", 60)),
                }
            log(f"Loaded scan settings: active {_fmt_hm(_settings['scan_start'])}–{_fmt_hm(_settings['scan_end'])}, "
                f"fast until {_fmt_hm(_settings['scan_fast_end'])}", "OK")
        else:
            log(f"bot_settings row missing — using defaults (scan_start={_fmt_hm(_get('scan_start'))})", "WARN")
    except Exception as e:
        log(f"Failed to load scan settings: {e}", "WARN")

def _poll_settings():
    """Refresh settings from Supabase every 5 minutes."""
    while True:
        time.sleep(300)
        load_settings_from_db()

QLD_BOOKING_URL = "https://wovi.com.au/bookings/"
QLD_CAPTCHA_KEY = "6LfAG_0pAAAAAFQzCmk7OQ4roYKXfgYFAPwsVo-5"
QLD_LOCATIONS   = ["Brisbane","Bundaberg","Burleigh Heads","Cairns","Mackay",
                   "Narangba","Rockhampton City","Toowoomba","Townsville","Yatala"]
SA_HOME_URL     = "https://www.ecom.transport.sa.gov.au/et/welcome.jsp"
SA_BOOKING_URL  = "https://www.ecom.transport.sa.gov.au/et/rescheduleAVehicleInspectionBooking.do"

_booking_lock = threading.Lock()

# ── Remote kill switch (polled every 10s by background thread) ─
_instance_enabled = True
_instance_enabled_lock = threading.Lock()

def _poll_enabled_flag():
    """Background thread: checks DB every 10s.

    Two flags honored:
      - enabled=false  → pause scanning, keep process alive (reversible)
      - status='stopping' → exit the process entirely (admin panel remote kill)
    """
    global _instance_enabled
    while True:
        try:
            data = _pg_query(
                "SELECT enabled, status FROM bot_instances WHERE id = %s", [INSTANCE_ID])
            if isinstance(data, list) and data:
                row = data[0]
                new_val = bool(row.get("enabled", True))
                with _instance_enabled_lock:
                    if _instance_enabled != new_val:
                        _instance_enabled = new_val
                        log(f"[{INSTANCE_ID}] Admin panel set enabled={new_val}", "WARN" if not new_val else "OK")
                # Remote kill: admin panel wrote status='stopping' → shut down.
                # The SIGTERM handler (registered at startup) flips status to
                # 'stopped' on the way out, so admin panel reflects reality.
                if (row.get("status") or "") == "stopping":
                    log(f"[{INSTANCE_ID}] Admin panel requested STOP — exiting", "WARN")
                    os.kill(os.getpid(), signal.SIGTERM)
                    return
        except Exception:
            pass
        time.sleep(10)

# ── Logging ───────────────────────────────────────────────────
def log(msg, level="INFO"):
    now = datetime.now(BRISBANE).strftime("%d/%m/%Y %I:%M:%S %p")
    prefix = {"INFO":"  →","WARN":"  ⚠","ERROR":"  ✖","OK":"  ✅"}.get(level,"  →")
    print(f"[{now}] {prefix} {msg}", flush=True)

def parse_date(s):
    if not s: return None
    # YYYY-MM-DD
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', s)
    if m:
        try: return datetime(int(m[1]),int(m[2]),int(m[3]))
        except: pass
    # DD/MM/YYYY or MM/DD/YYYY — try both, prefer whichever is valid
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', s)
    if m:
        a, b, y = int(m[1]), int(m[2]), int(m[3])
        # Try DD/MM/YYYY first
        try: return datetime(y, b, a)
        except: pass
        # Fall back to MM/DD/YYYY
        try: return datetime(y, a, b)
        except: pass
    return None

# ── Database (local Postgres, avibm schema) ───────────────────
# AVIBM now shares the auction-intel Postgres. New connection per call —
# the bot is multi-threaded (heartbeat + enabled-poll + SA loop), so we
# never share a connection across threads.
DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://auction:auction@127.0.0.1:5432/auction_intel")

def _pg_query(sql, params=None):
    """SELECT / RETURNING → list[dict] (matches the old PostgREST shape)."""
    conn = psycopg2.connect(DATABASE_URL)
    try:
        conn.autocommit = True
        with conn.cursor() as c:
            c.execute("SET search_path TO avibm, public")
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as c:
            c.execute(sql, params or [])
            return [dict(r) for r in c.fetchall()] if c.description else []
    finally:
        conn.close()

def _pg_execute(sql, params=None):
    """INSERT / UPDATE / DELETE → rowcount."""
    conn = psycopg2.connect(DATABASE_URL)
    try:
        conn.autocommit = True
        with conn.cursor() as c:
            c.execute("SET search_path TO avibm, public")
            c.execute(sql, params or [])
            return c.rowcount
    finally:
        conn.close()

def _pg_upsert(table, data, conflict_col, do_update=True):
    cols = list(data.keys())
    placeholders = ", ".join(["%s"] * len(cols))
    col_sql = ", ".join(cols)
    if do_update:
        updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in cols if c != conflict_col)
        conflict_sql = f"DO UPDATE SET {updates}" if updates else "DO NOTHING"
    else:
        conflict_sql = "DO NOTHING"
    _pg_execute(
        f"INSERT INTO {table} ({col_sql}) VALUES ({placeholders}) "
        f"ON CONFLICT ({conflict_col}) {conflict_sql}",
        [data[c] for c in cols])

def db_get(table, params=""):
    """PostgREST-compatible read. Only two query shapes are used:
    customers (active + vehicles embed) and a single-row by-id select."""
    try:
        if table == "customers" and "vehicles(*)" in params:
            customers = _pg_query("SELECT * FROM customers WHERE active = true")
            for cust in customers:
                cust["vehicles"] = _pg_query(
                    "SELECT * FROM vehicles WHERE customer_id = %s", [cust["id"]])
            return customers
        # generic "<col>=eq.<val>&select=<cols>"
        filters, cols = {}, "*"
        for part in [p for p in params.split("&") if p]:
            if part.startswith("select="):
                cols = part[len("select="):] or "*"
            elif "=eq." in part:
                k, v = part.split("=eq.", 1)
                filters[k] = v
        where = " AND ".join(f"{k} = %s" for k in filters) or "true"
        return _pg_query(f"SELECT {cols} FROM {table} WHERE {where}", list(filters.values()))
    except Exception as e:
        log(f"db_get {table} error: {e}", "ERROR")
        return []

def db_patch(table, match_key, match_val, data):
    try:
        cols = list(data.keys())
        set_sql = ", ".join(f"{c} = %s" for c in cols)
        _pg_execute(f"UPDATE {table} SET {set_sql} WHERE {match_key} = %s",
                    [data[c] for c in cols] + [match_val])
    except Exception as e:
        log(f"db_patch {table} error: {e}", "ERROR")

def instance_heartbeat(qld_count=None, sa_count=None):
    """Update last_seen for this instance so the admin panel knows it's alive."""
    payload = {"last_seen": datetime.now(timezone.utc).isoformat(), "status": "running"}
    db_patch("bot_instances", "id", INSTANCE_ID, payload)


def _instance_mark_stopped(*_args):
    """Signal handler — flip bot_instances.status to 'stopped' before exit
    so the admin panel reflects reality immediately instead of showing the
    process as still active until last_seen staleness kicks in. Fires on
    SIGTERM (Auction Intel Stop button) and SIGINT (Ctrl+C)."""
    try:
        db_patch("bot_instances", "id", INSTANCE_ID, {
            "status": "stopped",
            "last_seen": datetime.now(timezone.utc).isoformat(),
        })
        log(f"[{INSTANCE_ID}] marked stopped in Supabase — shutting down", "WARN")
    except Exception as e:
        log(f"instance stop flag update failed: {e}", "ERROR")
    # Re-raise default behaviour so the process actually exits
    sys.exit(0)


# Register shutdown handlers early — before the workers start
try:
    signal.signal(signal.SIGTERM, _instance_mark_stopped)
    signal.signal(signal.SIGINT, _instance_mark_stopped)
except Exception:
    # If signals can't be registered (e.g. inside a non-main thread
    # for testing), fall through — stopped-flag won't update cleanly
    # but process still terminates.
    pass

def instance_is_enabled():
    """Instant in-memory check — background thread keeps this current every 10s."""
    with _instance_enabled_lock:
        return _instance_enabled

# ── Email ─────────────────────────────────────────────────────
# Branded HTML shell — mirrors src/lib/emailTemplate.ts so the bot's
# booking-confirmation emails look the same as the magic-link / customer
# emails sent by the Next.js side. Content is injected at {body}.
_EMAIL_HTML_SHELL = """<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>AVIBM</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:#111111;border:1px solid #2a2a2a;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
          <div style="font-size:32px;font-weight:900;letter-spacing:0.2em;color:#C9A84C;font-family:'Arial Black',Arial,sans-serif;">AVIBM</div>
          <div style="font-size:11px;letter-spacing:0.25em;color:#666;margin-top:4px;text-transform:uppercase;">Australian Vehicle Inspection Booking Monitor</div>
          <div style="width:60px;height:2px;background:#C9A84C;margin:16px auto 0;"></div>
        </td></tr>
        <tr><td style="background:#141414;border-left:1px solid #2a2a2a;border-right:1px solid #2a2a2a;padding:40px;color:#e5e5e5;">
{body}
        </td></tr>
        <tr><td style="background:#0f0f0f;border:1px solid #2a2a2a;border-top:1px solid #1e1e1e;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
          <div style="font-size:12px;color:#444;line-height:1.8;">
            AVIBM — Australian Vehicle Inspection Booking Monitor<br/>
            <a href="https://avibm.vercel.app" style="color:#C9A84C;text-decoration:none;">avibm.vercel.app</a>
          </div>
          <div style="margin-top:12px;font-size:11px;color:#333;">
            If you have any questions, reply to this email and we'll get back to you shortly.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


def _branded_html(content_html: str) -> str:
    """Wrap `content_html` in the AVIBM dark / gold branded shell."""
    return _EMAIL_HTML_SHELL.replace("{body}", content_html)


def send_email(subject, body, to, html: str | None = None):
    """Send a booking notification email.

    `body` is the plain-text fallback (always sent). When `html` is
    provided, the email goes out as multipart/alternative with both
    versions — and the HTML side is wrapped in the AVIBM branded shell
    via `_branded_html()`. Older call sites that only pass `body`
    still send pure-text for back-compat.
    """
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    if html:
        msg = MIMEMultipart("alternative")
        msg.attach(MIMEText(body, "plain", "utf-8"))
        msg.attach(MIMEText(_branded_html(html), "html", "utf-8"))
    else:
        msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = f"AVIBM <{GMAIL_ADDR}>"
    msg["To"] = to
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(GMAIL_ADDR, GMAIL_PASS)
            s.sendmail(GMAIL_ADDR, to, msg.as_string())
        log(f"Email sent to {to}", "OK")
    except Exception as e:
        log(f"Email failed: {e}", "ERROR")

# ── Chrome ────────────────────────────────────────────────────
def make_driver():
    tmpdir = tempfile.mkdtemp(prefix="avibm_chrome_")
    opts = Options()
    opts.add_argument(f"--user-data-dir={tmpdir}")
    opts.add_argument("--window-size=1400,900")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)
    service = Service(ChromeDriverManager().install())
    d = webdriver.Chrome(service=service, options=opts)
    d._avibm_tmpdir = tmpdir
    d.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    })
    d.set_page_load_timeout(30)
    return d

def kill_driver(driver):
    """Force-close a Chrome window on macOS."""
    tmpdir = getattr(driver, '_avibm_tmpdir', None)
    pid = None
    try: pid = driver.service.process.pid
    except: pass
    try: driver.close()
    except: pass
    try: driver.quit()
    except: pass
    if pid:
        try: os.kill(pid, signal.SIGKILL)
        except: pass
    if tmpdir:
        # Kill any Chrome process still using this profile dir
        try: subprocess.run(['pkill', '-f', tmpdir], capture_output=True)
        except: pass
        time.sleep(0.5)
        try: shutil.rmtree(tmpdir, ignore_errors=True)
        except: pass
    time.sleep(1)

# ── CapSolver CAPTCHA ─────────────────────────────────────────
def solve_captcha_async():
    """
    Submit CAPTCHA solve request immediately — returns a task_id.
    Call get_captcha_token(task_id) later to retrieve the token.
    This lets us start solving while the form is being filled.
    """
    try:
        r = requests.post("https://api.capsolver.com/createTask", json={
            "clientKey": CAPSOLVER_KEY,
            "task": {
                "type": "ReCaptchaV2TaskProxyLess",
                "websiteURL": QLD_BOOKING_URL,
                "websiteKey": QLD_CAPTCHA_KEY,
            }
        }, timeout=15)
        d = r.json()
        if d.get("errorId") == 0:
            task_id = d.get("taskId")
            log(f"CAPTCHA task submitted (ID: {task_id})")
            return task_id
        else:
            log(f"CAPTCHA submit error: {d.get('errorDescription')}", "WARN")
            return None
    except Exception as e:
        log(f"CAPTCHA submit exception: {e}", "WARN")
        return None

def get_captcha_token(task_id, timeout=120):
    """Poll CapSolver for the result of a previously submitted task."""
    if not task_id: return None
    log("Waiting for CAPTCHA solution...")
    for i in range(timeout // 5):
        time.sleep(5)
        try:
            r = requests.post("https://api.capsolver.com/getTaskResult", json={
                "clientKey": CAPSOLVER_KEY,
                "taskId": task_id,
            }, timeout=10)
            d = r.json()
            if d.get("errorId") != 0:
                log(f"CAPTCHA error: {d.get('errorDescription')}", "WARN")
                return None
            if d.get("status") == "ready":
                token = d.get("solution", {}).get("gRecaptchaResponse")
                if token:
                    log(f"CAPTCHA solved! ({(i+1)*5}s)", "OK")
                    return token
            log(f"  Still solving... ({(i+1)*5}s)")
        except Exception as e:
            log(f"CAPTCHA poll error: {e}", "WARN")
    log("CAPTCHA timed out", "WARN")
    return None

def inject_token(driver, token):
    driver.execute_script("""
        var t=arguments[0];
        var el=document.getElementById('g-recaptcha-response');
        if(el){el.innerHTML=t;el.value=t;el.style.display='block';}
        document.querySelectorAll('[name="g-recaptcha-response"]').forEach(function(e){e.innerHTML=t;e.value=t;});
        try{
            var cfg=window.___grecaptcha_cfg;
            if(cfg&&cfg.clients){
                Object.keys(cfg.clients).forEach(function(k){
                    var c=cfg.clients[k];
                    Object.keys(c).forEach(function(j){
                        var o=c[j];
                        if(o&&typeof o.callback==='function'){try{o.callback(t);}catch(e){}}
                        if(o&&o.l&&typeof o.l==='function'){try{o.l(t);}catch(e){}}
                    });
                });
            }
        }catch(e){}
        try{angular.element(document.body).scope().$apply();}catch(e){}
    """, token)

# ── Form helpers ──────────────────────────────────────────────
def js_fill(driver, name, value):
    driver.execute_script("""
        var name=arguments[0],val=arguments[1];
        var el=document.querySelector('[name="'+name+'"]')||document.querySelector('[id="'+name+'"]');
        if(!el)return;
        var setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
        setter.call(el,val);
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
        el.dispatchEvent(new Event('blur',{bubbles:true}));
        try{angular.element(el).scope().$apply();}catch(e){}
    """, name, str(value))

def sel_by(driver, value, xpath):
    if not value: return False
    try:
        el = driver.find_element(By.XPATH, xpath)
        v = value.lower()
        for opt in Select(el).options:
            o = opt.text.lower()
            if v in o or o in v:
                Select(el).select_by_visible_text(opt.text)
                return True
    except: pass
    return False

def click_btn(driver, *phrases):
    for phrase in phrases:
        try:
            btns = driver.find_elements(By.XPATH,
                f"//button[contains(translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'{phrase}')] | "
                f"//input[@type='submit'][contains(translate(@value,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'{phrase}')]")
            for btn in btns:
                if btn.is_displayed():
                    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", btn)
                    time.sleep(0.5)
                    driver.execute_script("arguments[0].click();", btn)
                    time.sleep(2)
                    return True
        except: continue
    return False

# ── Scan one location ─────────────────────────────────────────
def scan_location(driver, location, cutoff, search_after=None):
    """Scan a single location and return available slots before cutoff."""
    slots = []
    try:
        sel = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH,
            "//select[.//option[contains(text(),'Brisbane')]]")))
        for opt in Select(sel).options:
            if location.lower() in opt.text.lower():
                Select(sel).select_by_visible_text(opt.text); break
        else: return slots

        for _ in range(10):
            time.sleep(1)
            cells = driver.find_elements(By.XPATH, "//div[@ng-click='setDateValue(day)']")
            if not cells: continue
            sample = driver.execute_script(
                "try{var s=angular.element(arguments[0]).scope();"
                "if(!s||!s.day)return null;return s.day.available;}catch(e){return null;}",
                cells[5] if len(cells)>5 else cells[0])
            if sample is not None: break

        cells = driver.find_elements(By.XPATH, "//div[@ng-click='setDateValue(day)']")
        for item in cells:
            data = driver.execute_script("""
                try{var el=arguments[0],s=angular.element(el).scope();
                var av=s&&s.day?s.day.available:null,val=s&&s.day?s.day.value:null,inMonth=s&&s.day?s.day.thisMonth:null;
                var cls=el.className||'';
                var cssAv=cls.includes('available')&&!cls.includes('unavailable')&&!cls.includes('disabled');
                var cssIn=!cls.includes('other-month')&&!cls.includes('prev-month')&&!cls.includes('next-month');
                return{av:av,val:val,inMonth:inMonth,cssAv:cssAv,cssIn:cssIn};}catch(e){return null;}
            """, item)
            if not data or not data.get('val'): continue
            use_av = data['av'] if data['av'] is not None else data['cssAv']
            use_in = data['inMonth'] if data['inMonth'] is not None else data['cssIn']
            if use_av and use_in:
                dt = parse_date(data['val'])
                if dt and dt < cutoff:
                    if search_after and dt <= search_after: continue
                    # Brisbane WOVI runs Mon-Fri only. Reject weekend
                    # dates even if the portal marks them available —
                    # the portal occasionally exposes Saturday cells
                    # that get accepted server-side but the depot is
                    # closed (2026-05-25 P-51C487 incident).
                    if dt.weekday() >= 5:
                        log(f"  → skipped {data['val']} ({dt.strftime('%A')}) — weekend, no inspections", "WARN")
                        continue
                    slots.append((dt, data['val'], location))
    except Exception as e:
        log(f"Scan error {location}: {e}", "WARN")
    return slots

# ══════════════════════════════════════════════════════════════
# QLD BOOKING — opens fresh browser, pre-solved CAPTCHA ready
# ══════════════════════════════════════════════════════════════
def book_qld_slot(location, date_str, customer, vehicle, task_id):
    driver = None
    try:
        log(f"Opening booking browser for {customer['first_name']} — {location} {date_str}...")
        driver = make_driver()
        wait = WebDriverWait(driver, 20)

        driver.get(QLD_BOOKING_URL)
        time.sleep(3)

        # Select location
        sel = wait.until(EC.presence_of_element_located((By.XPATH,
            "//select[.//option[contains(text(),'Brisbane')]]")))
        for opt in Select(sel).options:
            if location.lower() in opt.text.lower():
                Select(sel).select_by_visible_text(opt.text); break
        time.sleep(3)

        # Wait for calendar
        for _ in range(15):
            time.sleep(1)
            cells = driver.find_elements(By.XPATH, "//div[@ng-click='setDateValue(day)']")
            if cells:
                sample = driver.execute_script(
                    "try{var s=angular.element(arguments[0]).scope();"
                    "if(!s||!s.day)return null;return s.day.available;}catch(e){return null;}",
                    cells[5] if len(cells)>5 else cells[0])
                if sample is not None: break

        # Verify slot still available
        slot_still_available = False
        for item in driver.find_elements(By.XPATH, "//div[@ng-click='setDateValue(day)']"):
            v = driver.execute_script(
                "try{var s=angular.element(arguments[0]).scope();"
                "if(!s||!s.day)return null;"
                "return{val:s.day.value,av:s.day.available};}catch(e){return null;}", item)
            if v and v.get('val') == date_str and v.get('av'):
                slot_still_available = True
                driver.execute_script("arguments[0].click();", item)
                time.sleep(2)
                break

        if not slot_still_available:
            log(f"Slot {date_str} at {location} no longer available — someone else took it!", "WARN")
            return (False, "", True, False)  # slot taken, retry

        # Select earliest time. Filter out disabled / placeholder buttons
        # (the portal occasionally exposes a non-clickable "5:00 am" pre-
        # opening-time button that the bot used to grab via JS-click,
        # bypassing the disabled gate — caused the P-51C487 Saturday
        # 5 AM phantom booking, 2026-05-25). Also enforce a 7 AM floor
        # since real depot opening is 8 AM+ at every QLD WOVI site.
        time.sleep(3)
        selected_time = ""
        time_btns = driver.find_elements(By.XPATH,
            "//button[contains(@data-ng-repeat,'Slot in bookingSlots') or "
            "contains(@data-ng-click,'selectedBookingSlotId')]")
        MIN_HOUR = 7  # earliest legitimate slot at QLD WOVI sites
        def parse_12hr(b):
            try: return datetime.strptime(b.text.strip().upper().replace(" ",""),"%I:%M%p")
            except:
                try: return datetime.strptime(b.text.strip().upper().replace(" ",""),"%I%p")
                except: return datetime.max
        def is_real_slot(b):
            # disabled / aria-disabled / ng-disabled class → skip
            try:
                if b.get_attribute("disabled"): return False
                if b.get_attribute("aria-disabled") == "true": return False
                cls = (b.get_attribute("class") or "").lower()
                if "disabled" in cls or "unavailable" in cls: return False
                t = parse_12hr(b)
                if t == datetime.max: return False
                if t.hour < MIN_HOUR: return False
            except: return False
            return True
        usable = [b for b in time_btns if is_real_slot(b)]
        if not usable:
            log(f"No usable time slots at {location} {date_str} after filter (had {len(time_btns)} raw) — skipping", "WARN")
            return (False, "", True, False)
        # Final safety net: refuse weekend dates even if scan let one through.
        try:
            _dt_check = parse_date(date_str)
            if _dt_check and _dt_check.weekday() >= 5:
                log(f"Refusing to book {date_str} ({_dt_check.strftime('%A')}) — weekend", "ERROR")
                return (False, "", True, False)
        except: pass
        earliest = min(usable, key=parse_12hr)
        driver.execute_script("arguments[0].click();", earliest)
        selected_time = earliest.text.strip()
        log(f"Time: {selected_time}")
        time.sleep(1)
        click_btn(driver, "next")
        time.sleep(3)

        # Vehicle details
        vtype = vehicle.get("vehicle_type","Car")
        try:
            driver.execute_script("arguments[0].click();",
                driver.find_element(By.XPATH, f"//label[contains(normalize-space(.),'{vtype}')]"))
        except: pass
        js_fill(driver, "vin",           vehicle["vin"])
        js_fill(driver, "make",          vehicle["make"])
        js_fill(driver, "model",         vehicle["model"])
        if not sel_by(driver, vehicle["year"],
            "//select[contains(@name,'year') or contains(@ng-model,'year') or "
            "contains(@name,'buildYear') or contains(@ng-model,'buildYear') or "
            "contains(@name,'buildDateYear') or contains(@ng-model,'buildDateYear')]"):
            js_fill(driver, "year", vehicle["year"])
        js_fill(driver, "colour",        vehicle["colour"])
        sel_by(driver, vehicle.get("build_month",""),
               "//select[contains(@name,'buildDateMonth') or contains(@ng-model,'buildDateMonth')]")
        # Damage — use known name attribute, match uppercase value
        try:
            dam_el = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.XPATH, "//select[@name='damageDescription']")))
            dam_val = (vehicle.get("damage") or "").upper().replace(" - ", " ")
            for opt in Select(dam_el).options:
                if opt.get_attribute("value") == dam_val or dam_val in opt.text.upper():
                    Select(dam_el).select_by_value(opt.get_attribute("value"))
                    log(f"Damage set: {opt.text}", "OK")
                    break
            else:
                log(f"Damage no match for '{dam_val}' — options: {[o.text for o in Select(dam_el).options]}", "WARN")
        except Exception as e:
            log(f"Damage error: {e}", "WARN")

        # Purchase method — find by scanning for select that contains 'auction' option
        try:
            pur_val = (vehicle.get("purchase_method") or "").strip().lower()
            if not pur_val:
                # Empty pur_val would `in`-match every option (incl.
                # the "Please select" placeholder) and submit it as
                # the value, which the next page rejects with a
                # form-validation error. Fail the booking here with
                # a clear log instead of trying.
                log(
                    f"Purchase method missing for vehicle "
                    f"(customer {vehicle.get('customer_email') or vehicle.get('id') or '?'}) "
                    "— set it in the admin panel and the booking will retry on the next scan",
                    "ERROR",
                )
                raise RuntimeError("purchase_method missing on vehicle record")
            for sel_el in driver.find_elements(By.XPATH, "//select"):
                opts = Select(sel_el).options
                if any('auction' in o.text.lower() for o in opts):
                    matched = False
                    for opt in opts:
                        o = opt.text.strip().lower()
                        # Skip the placeholder option no matter what.
                        if not o or o == "please select":
                            continue
                        # Use word-boundary match instead of bidirectional
                        # substring (`pur_val in o or o in pur_val`) which
                        # was too permissive when pur_val was a single
                        # word that happened to be a substring of every
                        # option label.
                        if pur_val == o or pur_val in o:
                            Select(sel_el).select_by_visible_text(opt.text)
                            log(f"Purchase method set: {opt.text}", "OK")
                            matched = True
                            break
                    if not matched:
                        log(
                            f"Purchase method no match for {pur_val!r} — options were: "
                            f"{[o.text for o in opts]}",
                            "WARN",
                        )
                    break
        except Exception as e:
            log(f"Purchase method error: {e}", "WARN")
            raise

        # purchased_from is a separate text input next to the dropdown.
        # Use `.get()` so a missing field raises a meaningful error
        # before we hit the click_btn, not a bare KeyError lost in the
        # outer try.
        purchased_from = vehicle.get("purchased_from")
        if not purchased_from:
            log(
                f"purchased_from missing for vehicle "
                f"(customer {vehicle.get('customer_email') or vehicle.get('id') or '?'}) "
                "— set 'Purchased from' in the admin panel; booking will retry next scan",
                "ERROR",
            )
            raise RuntimeError("purchased_from missing on vehicle record")
        js_fill(driver, "purchasedFrom", purchased_from)
        click_btn(driver, "next")
        time.sleep(3)

        # Verify we advanced past vehicle details
        if driver.find_elements(By.XPATH, "//select"):
            log("Still on vehicle details — checking if next page loaded...", "WARN")

        # Customer details
        try:
            crn_el = WebDriverWait(driver, 15).until(
                EC.element_to_be_clickable((By.XPATH, "//input[@name='qldCRN']")))
            time.sleep(0.5)
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", crn_el)
            time.sleep(0.3)
            driver.execute_script("arguments[0].focus();arguments[0].click();", crn_el)
            time.sleep(0.3)
            crn_el.send_keys(Keys.COMMAND + "a")
            time.sleep(0.1)
            crn_el.send_keys(Keys.DELETE)
            for char in str(customer["crn"]):
                crn_el.send_keys(char)
                time.sleep(0.05)
            driver.execute_script("""
                var el=arguments[0];
                el.dispatchEvent(new Event('input',{bubbles:true}));
                el.dispatchEvent(new Event('change',{bubbles:true}));
                el.dispatchEvent(new Event('blur',{bubbles:true}));
                try{angular.element(el).scope().$apply();}catch(e){}
            """, crn_el)
            actual = crn_el.get_attribute("value")
            log(f"CRN filled: {actual}")
            if actual != str(customer["crn"]):
                log("CRN mismatch — retrying with JS fill", "WARN")
                js_fill(driver, "qldCRN", customer["crn"])
        except Exception as e:
            log(f"CRN error: {e}", "WARN")
            js_fill(driver, "qldCRN", customer["crn"])

        js_fill(driver, "firstName", customer["first_name"])
        js_fill(driver, "lastName",  customer["last_name"])
        js_fill(driver, "address",   customer["address"])
        js_fill(driver, "suburb",    customer["suburb"])
        js_fill(driver, "postcode",  customer["postcode"])
        js_fill(driver, "email",     customer["email"])
        js_fill(driver, "phone",     customer["phone"])
        click_btn(driver, "next")
        time.sleep(3)

        # Paperwork
        driver.execute_script("""
            try{
                var btn=document.getElementById('Paperwork');
                if(btn){btn.click();return;}
                var s=angular.element(document.body).scope();
                if(s&&s.vm&&typeof s.vm.checkDuplicateBooking==='function'){
                    s.vm.checkDuplicateBooking(false);s.$apply();
                }
            }catch(e){}
        """)
        time.sleep(2)

        # Check for card/payment page — means customer has no prior WOVI booking
        card_detected = driver.execute_script("""
            var t = document.body.innerText.toLowerCase();
            var hasCard = t.includes('card number') || t.includes('credit card') ||
                          t.includes('debit card') || t.includes('card details') ||
                          t.includes('payment details') || t.includes('card type');
            var hasInput = document.querySelector('input[name*="card"], input[id*="card"], input[name*="Card"]') !== null;
            return hasCard || hasInput;
        """)
        if card_detected:
            log("PAYMENT PAGE DETECTED — customer has no existing WOVI booking!", "ERROR")
            return (False, "", False, True)

        # Wait for reCAPTCHA widget
        for _ in range(10):
            has = driver.execute_script(
                "return document.querySelector('iframe[src*=recaptcha]')!==null||"
                "document.querySelector('#g-recaptcha-response')!==null")
            if has: log("reCAPTCHA widget detected"); break
            time.sleep(1)

        # Fetch CAPTCHA token now — solving has been running in parallel during form fill
        log("Fetching CAPTCHA token (solving in parallel with form fill)...")
        captcha_token = get_captcha_token(task_id)
        if not captcha_token:
            log("CAPTCHA failed", "ERROR")
            return (False, "", False, False)

        # Inject token
        time.sleep(2)
        inject_token(driver, captcha_token)
        time.sleep(1)
        inject_token(driver, captcha_token)
        log("CAPTCHA token injected", "OK")

        # Submit
        log("Submitting booking...")
        click_btn(driver, "submit my booking request","submit booking request","submit my booking","next")
        time.sleep(4)

        # Wait for Update Booking popup
        log("Waiting for Update Booking popup (up to 30s)...")
        popup_clicked = False
        for i in range(30):
            time.sleep(1)
            scan = driver.execute_script("""
                try{
                    var btn=document.querySelector('[ng-click="vm.dialog.moveBooking()"]');
                    return{has:btn!==null,visible:btn?btn.offsetParent!==null:false};
                }catch(e){return{has:false,visible:false};}
            """)
            if scan.get('has') and scan.get('visible'):
                log("Update Booking popup — clicking!", "OK")
                time.sleep(1)
                driver.execute_script("""
                    try{
                        var btn=document.querySelector('[ng-click="vm.dialog.moveBooking()"]');
                        angular.element(btn).triggerHandler('click');
                    }catch(e){}
                """)
                popup_clicked = True
                time.sleep(5)
                break

        if not popup_clicked:
            log("Popup not found — slot may have been taken", "WARN")
            return (False, "", True, False)  # slot taken, retry

        # Build the date forms we expect WOVI to echo back.
        # Collects multiple equivalent patterns so we don't trip on a
        # format we didn't anticipate. On match we KNOW the booking saved
        # the new date. On mismatch WOVI silently kept the old booking
        # (what happened to Abdul Amiri — lost the customer a confirmation
        # email on 2026-04-21).
        from datetime import datetime as _dt
        expected_date_forms: list[str] = []
        try:
            _target = _dt.strptime(date_str, "%Y-%m-%d")
            # Accept: "27 apr", "27 april", "27/04/2026", "27-04-2026",
            # "27-4-2026", "april 27", "apr 27", "27 apr 2026".
            expected_date_forms = [
                _target.strftime("%-d %b").lower(),          # 27 apr
                _target.strftime("%-d %B").lower(),          # 27 april
                _target.strftime("%d/%m/%Y"),                 # 27/04/2026
                _target.strftime("%-d/%-m/%Y"),               # 27/4/2026
                _target.strftime("%d-%m-%Y"),                 # 27-04-2026
                _target.strftime("%B %-d").lower(),          # april 27
                _target.strftime("%b %-d").lower(),          # apr 27
                _target.strftime("%-d %b %Y").lower(),       # 27 apr 2026
                _target.strftime("%Y-%m-%d"),                 # 2026-04-27
            ]
        except Exception:
            pass

        # Wait for confirmation dialog
        for i in range(30):
            time.sleep(1)
            result = driver.execute_script("""
                try{
                    var dialogText='';
                    var dialogs=document.querySelectorAll('md-dialog,.md-dialog-container,[role="dialog"]');
                    for(var d=0;d<dialogs.length;d++){var dt=dialogs[d].innerText||'';if(dt.trim())dialogText+=dt.trim()+' | ';}
                    var lower=dialogText.toLowerCase();
                    var text_matched=lower.includes('updated successfully')||lower.includes('new booking is');
                    return{text_matched:text_matched,dialog:dialogText.substring(0,500),lower:lower};
                }catch(e){return{text_matched:false,dialog:'',lower:''};}
            """)
            if result.get('text_matched'):
                dialog = result.get('dialog', '')
                lower = result.get('lower', '')
                # Require WOVI to echo back the NEW date — not just the
                # success text (WOVI fires the success banner even when
                # it keeps the old date; that's what burned us with the
                # Abdul Amiri ghost-success).
                matched_form = None
                for form in expected_date_forms:
                    if not form:
                        continue
                    if form in lower:
                        matched_form = form
                        break

                if not matched_form:
                    log("╔════════════════════════════════════════════════════════════", "ERROR")
                    log(f"║ ⚠ BOOKING NOT CONFIRMED — WOVI ghost-success detected", "ERROR")
                    log(f"║ target date: {date_str}", "ERROR")
                    log(f"║ expected any of: {expected_date_forms[:4]}", "ERROR")
                    log(f"║ dialog text: {dialog[:200]!r}", "ERROR")
                    log(f"║ The popup said 'updated successfully' but the dialog", "ERROR")
                    log(f"║ did NOT contain the target date. Booking did NOT save.", "ERROR")
                    log(f"║ No customer email sent. Scanner will retry next cycle.", "ERROR")
                    log("╚════════════════════════════════════════════════════════════", "ERROR")
                    # Dismiss the misleading dialog so scanner can continue
                    driver.execute_script("""
                        var btns=document.querySelectorAll('button');
                        for(var i=0;i<btns.length;i++){
                            if(btns[i].textContent.trim().toLowerCase().includes('got it')){btns[i].click();break;}
                        }
                    """)
                    return (False, selected_time, False, False)

                log(f"BOOKING CONFIRMED! (date '{matched_form}' echoed in dialog) {dialog[:80]}", "OK")
                driver.execute_script("""
                    var btns=document.querySelectorAll('button');
                    for(var i=0;i<btns.length;i++){
                        if(btns[i].textContent.trim().toLowerCase().includes('got it')){btns[i].click();break;}
                    }
                """)
                return (True, selected_time, False, False)

        log("No confirmation after 30s", "WARN")
        return (False, selected_time, False, False)

    except Exception as e:
        log(f"Booking error: {e}", "ERROR")
        return (False, "", False, False)
    finally:
        if driver:
            kill_driver(driver)

# ══════════════════════════════════════════════════════════════
# QLD SCANNER — persistent browser, priority locations first
# ══════════════════════════════════════════════════════════════
def qld_scan_loop():
    log("QLD SCANNER starting...")
    driver = None
    browser_opened_at = None

    while True:
        try:
            # Pause outside Mon–Fri 7:30 AM – 7:00 PM Brisbane
            if not is_active_time():
                if driver:
                    kill_driver(driver)
                    driver = None
                    browser_opened_at = None
                    log("Outside active hours — closing browser and waiting...")
                now_dt = datetime.now(BRISBANE)
                day_name = now_dt.strftime('%A')
                instance_heartbeat()
                time.sleep(60)
                continue

            # Open or restart browser every 10 minutes to prevent WOVI timeout
            now = time.time()
            if driver is None or (browser_opened_at and now - browser_opened_at > BROWSER_RESTART):
                if driver:
                    kill_driver(driver)
                    log("Restarting scanner browser (10 min refresh)...")
                driver = make_driver()
                # Keep the scanner window visible so the operator can
                # confirm via VNC that scanning is actually happening
                # (previously minimize_window() hid all the activity).
                try:
                    driver.set_window_size(1280, 800)
                    driver.set_window_position(0, 0)
                except Exception:
                    pass
                driver.get(QLD_BOOKING_URL)
                time.sleep(3)
                browser_opened_at = time.time()
                log("QLD browser ready", "OK")

            # Check if this device has been disabled from the admin panel
            if not instance_is_enabled():
                log(f"[{INSTANCE_ID}] Stopped from admin panel — shutting down.", "WARN")
                db_patch("bot_instances", "id", INSTANCE_ID, {"status": "stopped"})
                os._exit(0)

            # Fetch active customers
            customers = db_get("customers", "active=eq.true&select=*,vehicles(*)")
            if not isinstance(customers, list):
                time.sleep(get_scan_interval()); continue

            qld_customers = sorted(
                [c for c in customers if isinstance(c,dict) and c.get("active") and c.get("state")=="QLD"],
                key=lambda c: {"priority":0,"standard":1,"basic":2}.get(c.get("tier","standard"),1)
            )

            # Heartbeat — update both monitor_status and this device's last_seen
            db_patch("monitor_status", "id", "main", {
                "last_run": datetime.now(timezone.utc).isoformat(),
                "status": "running",
                "qld_count": len(qld_customers),
            })
            instance_heartbeat(qld_count=len(qld_customers))

            if not qld_customers:
                time.sleep(get_scan_interval()); continue

            for customer in qld_customers:
                vehicles = [v for v in (customer.get("vehicles") or []) if v.get("active")]
                for vehicle in vehicles:
                    cutoff = parse_date(vehicle.get("cutoff_date",""))
                    if not cutoff: continue
                    if (datetime.now() - cutoff).total_seconds() > 86400:
                        db_patch("vehicles","id",vehicle["id"],{"active":False}); continue
                    if vehicle.get("booking_in_progress"): continue

                    search_after = None
                    if vehicle.get("search_after_active") and vehicle.get("search_after_date"):
                        search_after = parse_date(vehicle["search_after_date"])

                    priority_locs = vehicle.get("priority_locations") or []
                    all_locs = vehicle.get("locations") or QLD_LOCATIONS

                    # Build scan order: priority locations first, then the rest
                    other_locs = [l for l in all_locs if l not in priority_locs]
                    scan_order = priority_locs + other_locs

                    cutoff_str = cutoff.strftime("%-d %b %Y") if cutoff else "?"
                    search_after_str = f", search after: {parse_date(vehicle['search_after_date']).strftime('%-d %b %Y')}" if vehicle.get("search_after_active") and vehicle.get("search_after_date") and search_after else ""
                    label = f"{customer['first_name']} {customer['last_name']} / {vehicle.get('make','?')} {vehicle.get('model','')} (cutoff: {cutoff_str}{search_after_str})"
                    slots = []

                    for location in scan_order:
                        if not instance_is_enabled():
                            log(f"[{INSTANCE_ID}] Disabled mid-scan — stopping", "WARN")
                            break
                        loc_slots = scan_location(driver, location, cutoff, search_after)
                        slots.extend(loc_slots)

                    slots.sort(key=lambda x: x[0])

                    if not slots:
                        log(f"[SCAN] {label} — no earlier slots")
                        continue

                    # Pick best slot: earliest date overall, prefer priority location on tie
                    earliest_dt = slots[0][0]
                    priority_slots = [s for s in slots if s[2] in priority_locs and s[0] == earliest_dt]
                    chosen = priority_slots[0] if priority_slots else slots[0]

                    dt, ds, loc = chosen
                    log(f"[SCAN] {label} → SLOT FOUND: {ds} at {loc} — starting CAPTCHA now!", "OK")

                    # ★ Pre-solve CAPTCHA immediately while booking browser opens
                    task_id = solve_captcha_async()

                    def attempt_booking(customer=customer, vehicle=vehicle, ds=ds, loc=loc, task_id=task_id):
                        if not _booking_lock.acquire(blocking=False):
                            log("Booking already in progress", "WARN"); return

                        try:
                            # Claim vehicle
                            claim = _pg_query(
                                "UPDATE vehicles SET booking_in_progress = true, booking_started_at = %s "
                                "WHERE id = %s AND booking_in_progress = false RETURNING id",
                                [datetime.now(timezone.utc).isoformat(), vehicle['id']])
                            if not claim:
                                log("Vehicle already claimed", "WARN"); return

                            confirmed, booked_time, slot_taken, no_prior_booking = book_qld_slot(
                                loc, ds, customer, vehicle, task_id)

                            if confirmed:
                                old_cutoff = vehicle.get("cutoff_date","")
                                db_patch("vehicles","id",vehicle["id"],{
                                    "booked_date": ds,
                                    "booked_time": booked_time,
                                    "booked_location": loc,
                                    "booked_at": datetime.now(timezone.utc).isoformat(),
                                    "previous_cutoff": old_cutoff,
                                    "cutoff_date": ds,
                                    "booking_in_progress": False,
                                })
                                _time_html = (
                                    f'<div style="font-size:14px;color:#999;margin-bottom:6px;">Time</div>'
                                    f'<div style="font-size:18px;color:#fff;font-weight:600;">{booked_time}</div>'
                                ) if booked_time else ""
                                _name = (customer.get("first_name") or "").strip() or "there"
                                _vehicle_label = f"{vehicle.get('make','').strip()} {vehicle.get('model','').strip()}".strip() or "your vehicle"
                                _old_cutoff_html = ""
                                if old_cutoff:
                                    _old_cutoff_html = (
                                        f'<p style="margin:18px 0 0 0;font-size:13px;color:#888;">'
                                        f'Your previous booking date was <strong style="color:#C9A84C;">{old_cutoff}</strong>. '
                                        f'This new slot is earlier.</p>'
                                    )
                                _html_body = f"""
<h1 style="font-size:22px;margin:0 0 8px 0;color:#fff;font-weight:600;">✅ Earlier slot booked</h1>
<p style="margin:0 0 24px 0;font-size:14px;color:#aaa;line-height:1.6;">Hi {_name}, AVIBM moved your <strong style="color:#C9A84C;">{_vehicle_label}</strong> inspection forward.</p>

<table cellpadding="0" cellspacing="0" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:20px;">
  <tr><td>
    <div style="font-size:14px;color:#999;margin-bottom:6px;">Location</div>
    <div style="font-size:18px;color:#fff;font-weight:600;margin-bottom:16px;">{loc}</div>
    <div style="font-size:14px;color:#999;margin-bottom:6px;">Date</div>
    <div style="font-size:18px;color:#fff;font-weight:600;margin-bottom:{('16px' if booked_time else '0')};">{ds}</div>
    {_time_html}
  </td></tr>
</table>

<p style="margin:0;font-size:13px;color:#888;line-height:1.7;">Verify the booking at <a href="https://wovi.com.au" style="color:#C9A84C;text-decoration:none;">wovi.com.au</a>. Reply to this email if anything looks wrong.</p>
{_old_cutoff_html}
"""
                                send_email(
                                    f"AVIBM — Booking Confirmed: {loc} on {ds}" + (f" at {booked_time}" if booked_time else ""),
                                    f"Earlier slot booked!\n\nLocation: {loc}\nDate: {ds}" +
                                    (f"\nTime: {booked_time}" if booked_time else "") +
                                    "\n\nVerify at wovi.com.au\n— AVIBM",
                                    customer["email"],
                                    html=_html_body,
                                )
                                log(f"✅ CONFIRMED & SAVED — {loc} {ds} {booked_time}", "OK")
                            elif no_prior_booking:
                                log(f"No prior WOVI booking for {customer['first_name']} — deactivating vehicle & emailing", "ERROR")
                                db_patch("vehicles","id",vehicle["id"],{
                                    "active": False,
                                    "booking_in_progress": False,
                                })
                                _ar_html = f"""
<h1 style="font-size:22px;margin:0 0 8px 0;color:#fff;font-weight:600;">⚠ Action required</h1>
<p style="margin:0 0 18px 0;font-size:14px;color:#aaa;line-height:1.6;">Hi {(customer.get('first_name') or 'there').strip()}, we tried to find an earlier inspection slot but WOVI asked for a payment — which means you don't have an existing booking yet for us to reschedule.</p>
<p style="margin:0 0 18px 0;font-size:14px;color:#aaa;line-height:1.6;">AVIBM can only move an <strong style="color:#C9A84C;">existing</strong> booking to an earlier date.</p>

<table cellpadding="0" cellspacing="0" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:20px;">
  <tr><td>
    <div style="font-size:14px;color:#C9A84C;font-weight:600;margin-bottom:12px;">Next steps</div>
    <ol style="margin:0;padding-left:18px;font-size:14px;color:#ddd;line-height:1.8;">
      <li>Go to <a href="https://wovi.com.au" style="color:#C9A84C;text-decoration:none;">wovi.com.au</a> and book a vehicle inspection.</li>
      <li>Pay the $100 deposit.</li>
      <li>Once booked, re-register your vehicle at <a href="https://avibm.vercel.app" style="color:#C9A84C;text-decoration:none;">avibm.vercel.app</a> with your new booking date.</li>
    </ol>
  </td></tr>
</table>

<p style="margin:0;font-size:13px;color:#888;line-height:1.7;">Monitoring is paused for this vehicle in the meantime.</p>
"""
                                send_email(
                                    "AVIBM — Action Required: Book Your WOVI Inspection First",
                                    f"Hi {customer['first_name']},\n\n"
                                    f"We attempted to find you an earlier inspection slot, but WOVI is asking for payment — "
                                    f"which means you don't have an existing booking to reschedule.\n\n"
                                    f"AVIBM can only move an existing booking to an earlier date. "
                                    f"Please follow these steps:\n\n"
                                    f"1. Go to wovi.com.au and book a vehicle inspection\n"
                                    f"2. Pay the $100 deposit\n"
                                    f"3. Once booked, re-register your vehicle at avibm.vercel.app with your new booking date\n\n"
                                    f"We've paused monitoring for your vehicle in the meantime.\n\n"
                                    f"— AVIBM",
                                    customer["email"],
                                    html=_ar_html,
                                )
                            elif slot_taken:
                                log("Slot was taken — will retry on next scan", "WARN")
                                db_patch("vehicles","id",vehicle["id"],{"booking_in_progress":False})
                            else:
                                log("Booking failed", "WARN")
                                db_patch("vehicles","id",vehicle["id"],{"booking_in_progress":False})
                        finally:
                            _booking_lock.release()

                    threading.Thread(target=attempt_booking, daemon=True).start()

            interval = get_scan_interval()
            now_dt = datetime.now(BRISBANE)
            mode = "fast" if interval == 10 else "slow"
            log(f"Next scan in {interval}s ({mode} mode — {now_dt.strftime('%I:%M %p')})")
            # Sleep in 5s chunks so a disable from the admin panel takes effect quickly
            elapsed = 0
            while elapsed < interval:
                time.sleep(min(5, interval - elapsed))
                elapsed += 5
                if not instance_is_enabled():
                    log(f"[{INSTANCE_ID}] Stopped from admin panel — shutting down.", "WARN")
                    db_patch("bot_instances", "id", INSTANCE_ID, {"status": "stopped"})
                    os._exit(0)

        except Exception as e:
            log(f"QLD scanner error: {e}", "ERROR")
            if driver: kill_driver(driver)
            driver = None
            browser_opened_at = None
            time.sleep(10)

# ══════════════════════════════════════════════════════════════
# SA CHECKER — requests only, no browser
# ══════════════════════════════════════════════════════════════
def sa_book_slot(customer, vehicle, slot_value, slot_text, sess):
    """
    Book the selected SA slot by submitting the slot value via POST.
    slot_value = the value attribute from the <option> tag
    """
    import re as _re
    try:
        log(f"[SA] Booking slot: {slot_text}...")
        r = sess.post(SA_BOOKING_URL, data={
            "selectedBooking": slot_value,
            "action": "finish",
        }, timeout=15)

        # Also try submitting via the Finish button
        r2 = sess.post(SA_BOOKING_URL, data={
            "selectedBooking": slot_value,
            "submitButton": "Finish",
        }, timeout=15)

        page = r2.text.lower() if len(r2.text) > len(r.text) else r.text.lower()

        confirmed = any(w in page for w in [
            "booking has been", "rescheduled", "confirmed",
            "successfully", "thank you", "your new booking"
        ])

        if confirmed:
            log(f"[SA] Booking confirmed: {slot_text}", "OK")
            return True
        else:
            log(f"[SA] Booking may not have confirmed — page snippet: {page[:200]}", "WARN")
            # Treat as confirmed if no error message
            if "error" not in page and "invalid" not in page:
                log(f"[SA] No error detected — treating as confirmed", "OK")
                return True
            return False
    except Exception as e:
        log(f"[SA] Booking error: {e}", "ERROR")
        return False


def sa_check_loop():
    log("SA CHECKER starting (auto-booking enabled)...")
    import re as _re
    while True:
        try:
            # Check if disabled from admin panel
            if not instance_is_enabled():
                log(f"[SA][{INSTANCE_ID}] Stopped from admin panel — shutting down.", "WARN")
                db_patch("bot_instances", "id", INSTANCE_ID, {"status": "stopped"})
                os._exit(0)

            customers = db_get("customers", "active=eq.true&select=*,vehicles(*)")
            if not isinstance(customers, list):
                time.sleep(_get("sa_interval")); continue

            sa_customers = [c for c in customers if isinstance(c,dict) and c.get("active") and c.get("state")=="SA"]

            # Heartbeat — update SA count
            db_patch("monitor_status", "id", "main", {"sa_count": len(sa_customers)})
            instance_heartbeat(sa_count=len(sa_customers))

            for customer in sa_customers:
                vehicles = [v for v in (customer.get("vehicles") or []) if v.get("active")]
                for vehicle in vehicles:
                    cutoff = parse_date(vehicle.get("cutoff_date",""))
                    if not cutoff: continue
                    if vehicle.get("booking_in_progress"): continue

                    cutoff_str = cutoff.strftime("%-d %b %Y") if cutoff else "?"
                    label = f"{customer['first_name']} {customer['last_name']}"
                    log(f"[SA] Checking {label} (cutoff: {cutoff_str})...")

                    try:
                        sess = requests.Session()
                        sess.get(SA_HOME_URL, timeout=15)
                        sess.get(SA_BOOKING_URL, timeout=15)

                        # Format DOB as DDMMCCYY
                        dob_raw = customer.get("date_of_birth","")
                        dob = "".join(c for c in dob_raw if c.isdigit())
                        # If stored as DD/MM/YYYY convert to DDMMYYYY
                        if "/" in dob_raw:
                            parts = dob_raw.split("/")
                            if len(parts) == 3:
                                dob = parts[0].zfill(2) + parts[1].zfill(2) + parts[2]

                        # Page 1 — submit search details
                        r1 = sess.post(SA_BOOKING_URL, data={
                            "clientNumber": customer["licence_number"],
                            "clientSurnameOrgName": customer["last_name"],
                            "clientDOB": dob,
                            "action": "next",
                        }, timeout=15)
                        log(f"[SA] Page 1 response: {r1.status_code}")

                        # Page 2 — preferred date = day before current cutoff
                        preferred_dt = cutoff - timedelta(days=1)
                        preferred = preferred_dt.strftime("%d%m%Y")
                        log(f"[SA] Preferred date: {preferred}")

                        r2 = sess.post(SA_BOOKING_URL, data={
                            "preferredDate": preferred,
                            "action": "next",
                        }, timeout=15)
                        log(f"[SA] Page 2 response: {r2.status_code}")

                        # Parse available slots from page 3
                        # Slots appear as <option value="...">From Tue 21/07/2026 08:00</option>
                        slot_options = _re.findall(
                            r'<option[^>]*value="([^"]*)"[^>]*>\s*(From[^<]+)</option>',
                            r2.text
                        )

                        available = []
                        for val, text in slot_options:
                            clean = text.replace(' ',' ').strip()
                            m = _re.search(r'(\d{1,2}/\d{2}/\d{4})', clean)
                            if m:
                                dt = parse_date(m.group(1))
                                if dt and dt < cutoff:
                                    available.append((dt, clean, val))

                        available.sort(key=lambda x: x[0])

                        if not available:
                            log(f"[SA] No earlier slots for {label}")
                            continue

                        # Found earlier slot — book it
                        earliest_dt, slot_text, slot_value = available[0]
                        log(f"[SA] Earlier slot found: {slot_text}", "OK")

                        # Claim vehicle atomically (safe for multi-device)
                        sa_claim = _pg_query(
                            "UPDATE vehicles SET booking_in_progress = true, booking_started_at = %s "
                            "WHERE id = %s AND booking_in_progress = false RETURNING id",
                            [datetime.now(timezone.utc).isoformat(), vehicle['id']])
                        if not sa_claim:
                            log(f"[SA] Vehicle already claimed by another instance — skipping", "WARN")
                            continue

                        confirmed = sa_book_slot(customer, vehicle, slot_value, slot_text, sess)

                        if confirmed:
                            old_cutoff = vehicle.get("cutoff_date","")
                            # Extract date from slot text for storage
                            m = _re.search(r'(\d{1,2}/\d{2}/\d{4})', slot_text)
                            booked_date_str = m.group(1) if m else slot_text
                            # Extract time
                            m2 = _re.search(r'(\d{2}:\d{2})', slot_text)
                            booked_time_str = m2.group(1) if m2 else ""

                            db_patch("vehicles","id",vehicle["id"],{
                                "booked_date": booked_date_str,
                                "booked_time": booked_time_str,
                                "booked_location": "Regency Park",
                                "booked_at": datetime.now(timezone.utc).isoformat(),
                                "previous_cutoff": old_cutoff,
                                "cutoff_date": booked_date_str,
                                "booking_in_progress": False,
                            })

                            _sa_name = (customer.get("first_name") or "").strip() or "there"
                            _sa_vehicle = f"{vehicle.get('make','').strip()} {vehicle.get('model','').strip()}".strip() or "your vehicle"
                            _sa_old_html = ""
                            if old_cutoff:
                                _sa_old_html = (
                                    f'<p style="margin:18px 0 0 0;font-size:13px;color:#888;">'
                                    f'Your previous booking date was <strong style="color:#C9A84C;">{old_cutoff}</strong>. '
                                    f'This new slot is earlier.</p>'
                                )
                            _sa_html = f"""
<h1 style="font-size:22px;margin:0 0 8px 0;color:#fff;font-weight:600;">✅ Earlier SA slot booked</h1>
<p style="margin:0 0 24px 0;font-size:14px;color:#aaa;line-height:1.6;">Hi {_sa_name}, AVIBM moved your <strong style="color:#C9A84C;">{_sa_vehicle}</strong> inspection forward.</p>

<table cellpadding="0" cellspacing="0" style="width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:20px;">
  <tr><td>
    <div style="font-size:14px;color:#999;margin-bottom:6px;">Slot</div>
    <div style="font-size:18px;color:#fff;font-weight:600;margin-bottom:16px;">{slot_text}</div>
    <div style="font-size:14px;color:#999;margin-bottom:6px;">Location</div>
    <div style="font-size:18px;color:#fff;font-weight:600;">Regency Park</div>
  </td></tr>
</table>

<p style="margin:0;font-size:13px;color:#888;line-height:1.7;">Verify the booking at <a href="https://www.ecom.transport.sa.gov.au" style="color:#C9A84C;text-decoration:none;">ecom.transport.sa.gov.au</a>.</p>
{_sa_old_html}
"""
                            send_email(
                                f"AVIBM — SA Booking Confirmed: {slot_text}",
                                f"Great news! We found and booked an earlier SA inspection slot for {label}.\n\nNew slot: {slot_text}\nLocation: Regency Park\n\nVerify at:\nhttps://www.ecom.transport.sa.gov.au\n— AVIBM",
                                customer["email"],
                                html=_sa_html,
                            )
                            log(f"[SA] Booked and email sent to {customer['email']}", "OK")
                        else:
                            log(f"[SA] Booking failed for {label}", "WARN")
                            db_patch("vehicles","id",vehicle["id"],{"booking_in_progress":False})

                    except Exception as e:
                        log(f"[SA] Error for {label}: {e}", "WARN")
                        try: db_patch("vehicles","id",vehicle["id"],{"booking_in_progress":False})
                        except: pass

        except Exception as e:
            log(f"SA checker error: {e}", "ERROR")
        time.sleep(_get("sa_interval"))

# ══════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    # Load settings from Supabase FIRST so the banner reflects reality,
    # not stale module-level defaults.
    load_settings_from_db()
    threading.Thread(target=_poll_settings, daemon=True).start()
    _start_s = _fmt_hm(_get("scan_start"))
    _fast_end_s = _fmt_hm(_get("scan_fast_end"))
    _end_s = _fmt_hm(_get("scan_end"))
    print("\n" + "="*55)
    print("  AVIBM LOCAL LOOP v3")
    print(f"  Active: Mon–Fri, {_start_s} – {_end_s} Brisbane time")
    print(f"  QLD scan: every {_get('fast_interval')}s ({_start_s}–{_fast_end_s}) / every {_get('slow_interval')}s ({_fast_end_s}–{_end_s})")
    print(f"  Scanner browser restarts every {BROWSER_RESTART//60} minutes")
    print(f"  CAPTCHA pre-solved the moment a slot is found")
    print(f"  SA checked every {_get('sa_interval')}s (no browser)")
    print("  Press Ctrl+C to stop")
    print("="*55 + "\n")

    # Register this device immediately so the admin panel can see it even during sleep
    _pg_upsert("monitor_status",
        {"id": "main", "last_run": datetime.now(timezone.utc).isoformat(), "status": "sleeping",
         "qld_count": 0, "sa_count": 0, "active_customers": 0}, "id")
    try:
        _pg_upsert("bot_instances", {"id": INSTANCE_ID, "hostname": HOSTNAME}, "id", do_update=False)
    except Exception as e:
        log(f"bot_instances INSERT failed: {e}", "ERROR")

    # Restore cached display_name if Supabase row was freshly created (display_name is null)
    _CACHE_FILE = os.path.expanduser("~/.avibm_device.json")
    _row = db_get("bot_instances", f"id=eq.{INSTANCE_ID}&select=display_name")
    if isinstance(_row, list) and _row:
        _dn = _row[0].get("display_name")
        if _dn:
            # Supabase has a name — save it to local cache
            try:
                import json as _json
                with open(_CACHE_FILE, "w") as _f: _json.dump({"display_name": _dn}, _f)
            except Exception: pass
        else:
            # Supabase has no name — try restoring from local cache
            try:
                import json as _json
                with open(_CACHE_FILE) as _f: _cached = _json.load(_f)
                if _cached.get("display_name"):
                    db_patch("bot_instances", "id", INSTANCE_ID, {"display_name": _cached["display_name"]})
                    log(f"Restored display name: {_cached['display_name']}", "OK")
            except Exception: pass

    db_patch("bot_instances", "id", INSTANCE_ID, {
        "hostname": HOSTNAME,
        "last_seen": datetime.now(timezone.utc).isoformat(),
        "enabled": True,
        "status": "sleeping",
    })
    log(f"Registered as device: {INSTANCE_ID} ({HOSTNAME})", "OK")

    # Settings + 5-min refresh thread were already started at the top of
    # __main__ so the banner could print real values. Keep this block just
    # for the enabled-flag poller below.

    # Start poll thread immediately so pause/unpause works even during sleep
    threading.Thread(target=_poll_enabled_flag, daemon=True).start()

    # Wait until active time (Mon–Fri 7:30 AM), heartbeating every minute so admin panel stays green
    _last_sleep_status = None
    while not is_active_time():
        now = datetime.now(BRISBANE)
        enabled = instance_is_enabled()
        status = "sleeping" if enabled else "paused"
        if status != _last_sleep_status:
            if not enabled:
                log("Paused by admin — will resume scanning at next active window when re-enabled.")
            elif _last_sleep_status == "paused":
                log("Re-enabled by admin — will resume scanning at next active window.")
            else:
                _start_str = _fmt_hm(_get("scan_start"))
                if now.weekday() >= 5:
                    log(f"Weekend ({now.strftime('%A')}) — waiting until Monday {_start_str}...")
                else:
                    log(f"Outside hours ({now.strftime('%I:%M %p')}) — waiting until {_start_str}...")
            _last_sleep_status = status
        db_patch("bot_instances", "id", INSTANCE_ID, {
            "last_seen": datetime.now(timezone.utc).isoformat(),
            "status": status,
        })
        time.sleep(60)

    log("Starting all monitors...", "OK")

    # Update status to running now that active hours have started
    _pg_upsert("monitor_status",
        {"id": "main", "last_run": datetime.now(timezone.utc).isoformat(), "status": "running",
         "qld_count": 0, "sa_count": 0, "active_customers": 0}, "id")
    db_patch("bot_instances", "id", INSTANCE_ID, {
        "last_seen": datetime.now(timezone.utc).isoformat(),
        "status": "running",
    })
    log(f"Registered as device: {INSTANCE_ID} ({HOSTNAME})", "OK")

    # Clear stale booking locks (in case a previous instance crashed mid-booking)
    stale_cutoff = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
    _pg_execute(
        "UPDATE vehicles SET booking_in_progress = false "
        "WHERE booking_in_progress = true AND booking_started_at < %s",
        [stale_cutoff])
    log("Cleared any stale booking locks (>15 min old)", "INFO")

    # SA in background thread
    threading.Thread(target=sa_check_loop, daemon=True).start()

    # QLD scanner in main thread
    qld_scan_loop()
