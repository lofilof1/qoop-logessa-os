import os
import sys
import json
import base64
import hashlib
import re
import time
import logging
import subprocess
import urllib.request
import urllib.parse
import urllib.error
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(BASE_DIR, '.env')
CONFIG_FILE = os.path.join(BASE_DIR, 'etsy_config.json')
TOKENS_FILE = os.path.join(BASE_DIR, 'etsy_tokens.json')
AUTH_STATE_FILE = os.path.join(BASE_DIR, 'etsy_auth_state.json')
LISTINGS_FILE = os.path.join(BASE_DIR, 'listings.json')
SHOPS_FILE = os.path.join(BASE_DIR, 'shops.json')

logging.basicConfig(
    filename=os.path.join(BASE_DIR, 'server.log'),
    level=logging.INFO,
    format='%(asctime)s - %(message)s'
)

def utc_now_iso():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

# ==============================================================================
# FİKRİ MÜLKİYET & İDDİA KALKANI (IP Filter & Compliance Guard)
# ==============================================================================
IP_BLOCKLIST = [
    "disney", "marvel", "nintendo", "pokemon", "pokémon", "netflix",
    "star wars", "harry potter", "barbie", "lego", "minecraft", "fortnite",
    "mickey", "spider-man", "spiderman", "frozen", "elsa", "bluey",
    "taylor swift", "nike", "adidas", "gucci", "louis vuitton", "prada", "chanel",
    "coca cola", "sanrio", "hello kitty", "stitch", "stranger things", "squid game",
    "batman", "superman", "peppa pig", "paw patrol", "harry styles"
]
IP_REGEX = re.compile(r"\b(" + "|".join(re.escape(b) for b in IP_BLOCKLIST) + r")\b", re.IGNORECASE)

BANNED_CLAIMS = [
    "non-toxic", "nontoxic", "hand-made", "hand-painted original",
    "ai-free", "100% organic", "fireproof", "medical grade"
]
CLAIMS_REGEX = re.compile(r"\b(" + "|".join(re.escape(c) for c in BANNED_CLAIMS) + r")\b", re.IGNORECASE)

def check_ip_violations(text):
    if not text:
        return []
    return sorted(list(set(m.lower() for m in IP_REGEX.findall(text))))

def check_compliance_claims(text):
    if not text:
        return []
    return sorted(list(set(m.lower() for m in CLAIMS_REGEX.findall(text))))

# ==============================================================================
# ENVIRONMENT & MULTI-SHOP CONFIGURATION
# ==============================================================================
def read_env_file():
    env_vars = {}
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env_vars[k.strip()] = v.strip()
    return env_vars

def write_env_file(env_vars):
    lines = [
        "# ==============================================================================",
        "# LOGESSA & QOOP UNIFIED PLATFORM CONFIGURATION (.env)",
        f"# Otomatik Güncellenme: {utc_now_iso()}",
        "# ==============================================================================",
        ""
    ]
    for k, v in env_vars.items():
        lines.append(f"{k}={v}")
    with open(ENV_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')

def get_config():
    env = read_env_file()
    client_id = env.get('ETSY_CLIENT_ID', 'znhmaxofm17pggem67prm1888')
    redirect_uri = env.get('ETSY_REDIRECT_URI', 'http://100.87.178.11:8765/callback')
    shared_secret = env.get('ETSY_SHARED_SECRET', '')
    return {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "shared_secret": shared_secret,
        "ai_provider": env.get('AI_PROVIDER', 'local'),
        "ollama_endpoint": env.get('OLLAMA_ENDPOINT', 'http://127.0.0.1:11434'),
        "local_vision_model": env.get('LOCAL_VISION_MODEL', 'qwen3-vl:4b-instruct'),
        "s3_endpoint": env.get('S3_ENDPOINT', 'http://localhost:9000'),
        "s3_bucket": env.get('S3_BUCKET', 'qoop-assets'),
        "lazy_docker_mode": env.get('LAZY_DOCKER_MODE', 'enabled')
    }

def default_shops_state():
    return {
        "active_shop_id": "logessa-murals",
        "shops": [
            {
                "id": "logessa-murals",
                "shop_id": "48921849",
                "shop_name": "Logessa Wall Murals",
                "niche": "Luxury Chinoiserie & Panoramic Murals",
                "currency": "USD",
                "default_price": 345.00,
                "client_id": "",
                "redirect_uri": ""
            },
            {
                "id": "qoop-patterns",
                "shop_id": "51048392",
                "shop_name": "Qoop Studio Patterns",
                "niche": "Minimalist Japandi & Seamless Tiles",
                "currency": "USD",
                "default_price": 195.00,
                "client_id": "",
                "redirect_uri": ""
            }
        ]
    }

def load_shops_state():
    if os.path.exists(SHOPS_FILE):
        try:
            with open(SHOPS_FILE, 'r', encoding='utf-8') as f:
                state = json.load(f)
            if isinstance(state, dict) and state.get('shops'):
                return state
        except Exception as e:
            logging.error(f"Error loading shops.json: {e}")
    state = default_shops_state()
    save_shops_state(state)
    return state

def save_shops_state(state):
    with open(SHOPS_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2, ensure_ascii=False)

def shop_tokens_path(profile_id):
    safe_id = re.sub(r'[^a-zA-Z0-9_-]', '', str(profile_id or 'default'))
    per_shop = os.path.join(BASE_DIR, f'etsy_tokens_{safe_id}.json')
    if os.path.exists(per_shop):
        return per_shop
    if safe_id == 'logessa-murals' and os.path.exists(TOKENS_FILE):
        return TOKENS_FILE
    return per_shop

def get_enriched_shops():
    cfg = get_config()
    state = load_shops_state()
    listings = get_listings()
    active_id = state.get('active_shop_id')
    enriched = []
    active_shop = None

    for s in state.get('shops', []):
        pid = s.get('id')
        tpath = shop_tokens_path(pid)
        connected = False
        connected_at = None
        refreshed_at = None
        remote_shop_name = None
        if os.path.exists(tpath):
            try:
                with open(tpath, 'r', encoding='utf-8') as tf:
                    tdata = json.load(tf)
                connected = bool(tdata.get('tokens', {}).get('access_token'))
                connected_at = tdata.get('connected_at')
                refreshed_at = tdata.get('refreshed_at')
                if isinstance(tdata.get('shop'), dict):
                    remote_shop_name = tdata['shop'].get('shop_name')
            except Exception:
                pass

        shop_listings = [it for it in listings if (it.get('shop_id') or 'logessa-murals') == pid]
        item = {
            **s,
            "effective_client_id": s.get("client_id") or cfg["client_id"],
            "effective_redirect_uri": s.get("redirect_uri") or cfg["redirect_uri"],
            "connected": connected,
            "connected_at": connected_at,
            "refreshed_at": refreshed_at,
            "remote_shop_name": remote_shop_name,
            "listing_count": len(shop_listings),
            "active_count": sum(1 for it in shop_listings if it.get('state') == 'ACTIVE'),
            "is_active": pid == active_id
        }
        enriched.append(item)
        if pid == active_id:
            active_shop = item

    if not active_shop and enriched:
        active_shop = enriched[0]
        active_shop['is_active'] = True
        state['active_shop_id'] = active_shop['id']
        save_shops_state(state)

    return {
        "active_shop_id": active_shop['id'] if active_shop else None,
        "active_shop": active_shop,
        "shops": enriched
    }

# ==============================================================================
# RESILIENT ETSY API V3 CLIENT (429 Backoff + Auto Token Refresh)
# ==============================================================================
def build_etsy_api_key_header(client_id, shared_secret=''):
    if shared_secret:
        return f"{client_id}:{shared_secret}"
    return client_id

def refresh_etsy_token(profile_id=None):
    shops_info = get_enriched_shops()
    target_id = profile_id or shops_info['active_shop_id'] or 'logessa-murals'
    tpath = shop_tokens_path(target_id)
    if not os.path.exists(tpath):
        return None
    try:
        with open(tpath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        tokens = data.get('tokens', {})
        refresh_token = tokens.get('refresh_token')
        if not refresh_token:
            return None
        cfg = get_config()
        shop_obj = next((s for s in shops_info['shops'] if s['id'] == target_id), None)
        client_id = (shop_obj or {}).get('effective_client_id') or cfg['client_id']

        token_url = 'https://api.etsy.com/v3/public/oauth/token'
        post_data = urllib.parse.urlencode({
            'grant_type': 'refresh_token',
            'client_id': client_id,
            'refresh_token': refresh_token
        }).encode('utf-8')
        req = urllib.request.Request(
            token_url,
            data=post_data,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            new_tokens = json.loads(resp.read().decode('utf-8'))
        new_tokens['obtained_at_epoch'] = int(time.time())
        data['tokens'] = new_tokens
        data['refreshed_at'] = utc_now_iso()
        with open(tpath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        return new_tokens
    except Exception as e:
        logging.error(f"Error refreshing Etsy token ({target_id}): {e}")
        return None

def get_valid_access_token(profile_id):
    tpath = shop_tokens_path(profile_id)
    if not os.path.exists(tpath):
        return None
    try:
        with open(tpath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        tokens = data.get('tokens', {})
        obtained = int(tokens.get('obtained_at_epoch', 0))
        expires_in = int(tokens.get('expires_in', 3600))
        if obtained > 0 and (time.time() - obtained) >= (expires_in - 180):
            refreshed = refresh_etsy_token(profile_id)
            if refreshed:
                return refreshed.get('access_token')
        return tokens.get('access_token')
    except Exception:
        return None

def etsy_request_with_retry(url, method='GET', headers=None, data_bytes=None, max_retries=3):
    hdrs = dict(headers or {})
    delay = 1.0
    for attempt in range(max_retries):
        req = urllib.request.Request(url, data=data_bytes, headers=hdrs, method=method)
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503, 504) and attempt < max_retries - 1:
                retry_after = e.headers.get('Retry-After') if e.headers else None
                wait_sec = float(retry_after) if (retry_after and retry_after.isdigit()) else delay
                wait_sec = min(wait_sec, 10.0)
                logging.warning(f"Etsy API HTTP {e.code}, retrying in {wait_sec}s (attempt {attempt + 1})")
                time.sleep(wait_sec)
                delay *= 2
                continue
            raise

def get_listings():
    if os.path.exists(LISTINGS_FILE):
        try:
            with open(LISTINGS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return []

def save_listings(data):
    with open(LISTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# ==============================================================================
# SYSTEM RESOURCE TELEMETRY (Raspberry Pi 2GB RAM Guard)
# ==============================================================================
def get_system_resources():
    mem_total_mb = 0
    mem_avail_mb = 0
    try:
        with open('/proc/meminfo', 'r') as f:
            for line in f:
                if line.startswith('MemTotal:'):
                    mem_total_mb = round(int(line.split()[1]) / 1024, 1)
                elif line.startswith('MemAvailable:'):
                    mem_avail_mb = round(int(line.split()[1]) / 1024, 1)
    except Exception:
        pass
    mem_used_mb = round(max(0.0, mem_total_mb - mem_avail_mb), 1)
    mem_pct = round((mem_used_mb / mem_total_mb) * 100, 1) if mem_total_mb > 0 else 0.0

    proc_rss_mb = 0.0
    try:
        with open('/proc/self/status', 'r') as f:
            for line in f:
                if line.startswith('VmRSS:'):
                    proc_rss_mb = round(int(line.split()[1]) / 1024, 1)
                    break
    except Exception:
        pass

    cpu_temp_c = None
    try:
        tfile = '/sys/class/thermal/thermal_zone0/temp'
        if os.path.exists(tfile):
            with open(tfile, 'r') as f:
                cpu_temp_c = round(int(f.read().strip()) / 1000.0, 1)
    except Exception:
        pass

    disk_free_gb = 0.0
    disk_total_gb = 0.0
    try:
        st = os.statvfs(BASE_DIR)
        disk_free_gb = round((st.f_bavail * st.f_frsize) / (1024 ** 3), 2)
        disk_total_gb = round((st.f_blocks * st.f_frsize) / (1024 ** 3), 2)
    except Exception:
        pass

    try:
        load_1m = round(os.getloadavg()[0], 2)
    except Exception:
        load_1m = 0.0

    heavy_containers = []
    try:
        res = subprocess.run(
            ['docker', 'ps', '--format', '{{.Names}}'],
            capture_output=True, text=True, timeout=2
        )
        if res.returncode == 0 and res.stdout.strip():
            heavy_containers = [c.strip() for c in res.stdout.strip().splitlines() if c.strip()]
    except Exception:
        pass

    return {
        "mem_total_mb": mem_total_mb,
        "mem_used_mb": mem_used_mb,
        "mem_avail_mb": mem_avail_mb,
        "mem_percent": mem_pct,
        "server_rss_mb": proc_rss_mb,
        "cpu_temp_c": cpu_temp_c,
        "disk_free_gb": disk_free_gb,
        "disk_total_gb": disk_total_gb,
        "load_1m": load_1m,
        "running_containers": heavy_containers,
        "lazy_docker_sleeping": len(heavy_containers) == 0,
        "timestamp": utc_now_iso()
    }

# ==============================================================================
# HTTP REQUEST HANDLER
# ==============================================================================
class CustomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, format, *args):
        logging.info("%s - - [%s] %s" % (self.address_string(), self.log_date_time_string(), format % args))

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)

        # 1. Etsy Live Autosuggest
        if path == '/api/etsy/suggest':
            query = qs.get('query', ['wallpaper'])[0]
            suggest_url = 'https://www.etsy.com/api/v3/ajax/public/search/autosuggest?' + urllib.parse.urlencode({'query': query})
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
            req = urllib.request.Request(suggest_url, headers=headers)
            try:
                with urllib.request.urlopen(req, timeout=6) as resp:
                    raw = json.loads(resp.read().decode('utf-8'))
                    suggestions = []
                    if isinstance(raw, list):
                        for it in raw:
                            if isinstance(it, dict) and 'query' in it:
                                suggestions.append(it['query'])
                            elif isinstance(it, str):
                                suggestions.append(it)
                    elif isinstance(raw, dict) and 'results' in raw:
                        for it in raw['results']:
                            if isinstance(it, dict) and 'query' in it:
                                suggestions.append(it['query'])
                    return self.send_json({'ok': True, 'query': query, 'suggestions': suggestions[:14]})
            except Exception:
                fallbacks = [
                    f"{query} peel and stick",
                    f"{query} mural for bedroom",
                    f"{query} removable accent wall",
                    f"{query} vintage botanical",
                    f"{query} nursery floral",
                    f"{query} modern wabi sabi",
                    f"{query} living room statement"
                ]
                return self.send_json({'ok': True, 'query': query, 'suggestions': fallbacks, 'fallback': True})

        # 2. IP / Telif & İddia Kontrol Endpoint
        elif path == '/api/etsy/ip-check':
            text = qs.get('text', [''])[0]
            violations = check_ip_violations(text)
            claims = check_compliance_claims(text)
            return self.send_json({
                'clean': len(violations) == 0 and len(claims) == 0,
                'violations': violations,
                'claim_warnings': claims
            })

        # 3. Multi-Shop Profiles Endpoint
        elif path == '/api/shops':
            return self.send_json(get_enriched_shops())

        # 4. System Hardware & Memory Telemetry
        elif path == '/api/system/resources':
            return self.send_json(get_system_resources())

        # 5. Etsy OAuth Start URL (Multi-Shop aware)
        elif path == '/api/etsy/auth-url':
            cfg = get_config()
            shops_info = get_enriched_shops()
            target_shop_id = qs.get('shop_id', [shops_info['active_shop_id']])[0]
            shop_obj = next((s for s in shops_info['shops'] if s['id'] == target_shop_id), shops_info['active_shop'])

            client_id = (shop_obj or {}).get('effective_client_id') or cfg['client_id']
            redirect_uri = qs.get('redirect_uri', [(shop_obj or {}).get('effective_redirect_uri') or cfg['redirect_uri']])[0]

            code_verifier = base64.urlsafe_b64encode(os.urandom(32)).decode('utf-8').rstrip('=')
            digest = hashlib.sha256(code_verifier.encode('utf-8')).digest()
            code_challenge = base64.urlsafe_b64encode(digest).decode('utf-8').rstrip('=')
            state = base64.urlsafe_b64encode(os.urandom(16)).decode('utf-8').rstrip('=')

            auth_state = {
                'code_verifier': code_verifier,
                'code_challenge': code_challenge,
                'state': state,
                'redirect_uri': redirect_uri,
                'shop_profile_id': target_shop_id,
                'client_id': client_id
            }
            with open(AUTH_STATE_FILE, 'w', encoding='utf-8') as f:
                json.dump(auth_state, f)

            params = {
                'response_type': 'code',
                'client_id': client_id,
                'redirect_uri': redirect_uri,
                'scope': 'listings_r listings_w shops_r transactions_r profile_r',
                'state': state,
                'code_challenge': code_challenge,
                'code_challenge_method': 'S256'
            }
            auth_url = 'https://www.etsy.com/oauth/connect?' + urllib.parse.urlencode(params)
            return self.send_json({'auth_url': auth_url, 'config': cfg, 'shop': shop_obj})

        # 6. Etsy OAuth Callback
        elif path == '/callback':
            code = qs.get('code', [None])[0]
            if not code or not os.path.exists(AUTH_STATE_FILE):
                self.send_response(400)
                self.end_headers()
                self.wfile.write("<h3>Hata: OAuth oturum kodu bulunamadi.</h3>".encode('utf-8'))
                return

            with open(AUTH_STATE_FILE, 'r', encoding='utf-8') as f:
                auth_state = json.load(f)

            cfg = get_config()
            profile_id = auth_state.get('shop_profile_id', 'logessa-murals')
            client_id = auth_state.get('client_id') or cfg['client_id']
            redirect_uri = auth_state.get('redirect_uri', cfg['redirect_uri'])
            code_verifier = auth_state.get('code_verifier')

            token_url = 'https://api.etsy.com/v3/public/oauth/token'
            post_data = urllib.parse.urlencode({
                'grant_type': 'authorization_code',
                'client_id': client_id,
                'redirect_uri': redirect_uri,
                'code': code,
                'code_verifier': code_verifier
            }).encode('utf-8')

            req = urllib.request.Request(
                token_url,
                data=post_data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )

            try:
                with urllib.request.urlopen(req, timeout=12) as resp:
                    tokens = json.loads(resp.read().decode('utf-8'))
                tokens['obtained_at_epoch'] = int(time.time())

                access_token = tokens.get('access_token')
                api_key_hdr = build_etsy_api_key_header(client_id, cfg.get('shared_secret', ''))
                auth_hdrs = {'x-api-key': api_key_hdr, 'Authorization': f'Bearer {access_token}'}

                user_data = {}
                try:
                    user_data = etsy_request_with_retry(
                        'https://openapi.etsy.com/v3/application/users/me',
                        headers=auth_hdrs
                    )
                except Exception as ex:
                    logging.error(f"Error fetching user details: {ex}")

                shop_data = {}
                user_id = user_data.get('user_id')
                if user_id:
                    try:
                        raw_shop = etsy_request_with_retry(
                            f'https://openapi.etsy.com/v3/application/users/{user_id}/shops',
                            headers=auth_hdrs
                        )
                        if isinstance(raw_shop, dict) and 'results' in raw_shop and raw_shop['results']:
                            shop_data = raw_shop['results'][0]
                        elif isinstance(raw_shop, dict):
                            shop_data = raw_shop
                    except Exception as ex:
                        logging.error(f"Error fetching shop details: {ex}")

                full_data = {
                    'shop_profile_id': profile_id,
                    'tokens': tokens,
                    'user': user_data,
                    'shop': shop_data,
                    'connected_at': utc_now_iso()
                }
                tpath = os.path.join(BASE_DIR, f'etsy_tokens_{re.sub(r"[^a-zA-Z0-9_-]", "", profile_id)}.json')
                with open(tpath, 'w', encoding='utf-8') as f:
                    json.dump(full_data, f, indent=2)

                if shop_data.get('shop_id'):
                    st = load_shops_state()
                    for s in st.get('shops', []):
                        if s.get('id') == profile_id:
                            s['shop_id'] = str(shop_data['shop_id'])
                            if shop_data.get('shop_name'):
                                s['shop_name'] = shop_data['shop_name']
                    save_shops_state(st)

                self.send_response(302)
                self.send_header('Location', '/?etsy_connected=1#tab-api')
                self.end_headers()
                return
            except urllib.error.HTTPError as e:
                err_body = e.read().decode('utf-8', errors='ignore')
                self.send_response(500)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write(f"<h3>Etsy Token Degisimi Basarisiz (HTTP {e.code})</h3><pre>{err_body}</pre>".encode('utf-8'))
                return

        # 7. Etsy Status Check (Multi-Shop aware)
        elif path == '/api/etsy/status':
            cfg = get_config()
            shops_info = get_enriched_shops()
            active = shops_info['active_shop'] or {}
            pid = qs.get('shop_id', [active.get('id', 'logessa-murals')])[0]
            tpath = shop_tokens_path(pid)
            data = {
                'connected': False,
                'config': cfg,
                'active_shop': active,
                'shops': shops_info['shops']
            }
            if os.path.exists(tpath):
                try:
                    get_valid_access_token(pid)
                    with open(tpath, 'r', encoding='utf-8') as f:
                        saved = json.load(f)
                    data['connected'] = True
                    data['shop'] = saved.get('shop')
                    data['user'] = saved.get('user')
                    data['connected_at'] = saved.get('connected_at')
                    data['refreshed_at'] = saved.get('refreshed_at')
                except Exception:
                    pass
            return self.send_json(data)

        # 7b. Etsy Token Refresh
        elif path == '/api/etsy/refresh':
            pid = qs.get('shop_id', [None])[0]
            refreshed = refresh_etsy_token(pid)
            if refreshed:
                return self.send_json({'ok': True, 'tokens': refreshed})
            return self.send_json({'ok': False, 'error': 'Token refresh failed or token file not found'}, status=400)

        # 8. Listings Inventory
        elif path == '/api/listings':
            shop_filter = qs.get('shop_id', [None])[0]
            items = get_listings()
            if shop_filter and shop_filter != 'ALL':
                items = [it for it in items if (it.get('shop_id') or 'logessa-murals') == shop_filter]
            return self.send_json(items)

        # 9. Environment / Settings
        elif path == '/api/env':
            env_vars = read_env_file()
            raw_text = ""
            if os.path.exists(ENV_FILE):
                with open(ENV_FILE, 'r', encoding='utf-8') as f:
                    raw_text = f.read()
            return self.send_json({'vars': env_vars, 'raw': raw_text})

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else "{}"
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        # 1. Update .env and configs
        if path == '/api/env':
            env_vars = read_env_file()
            for key in ('ETSY_CLIENT_ID', 'ETSY_REDIRECT_URI', 'ETSY_SHARED_SECRET', 'AI_PROVIDER', 'OLLAMA_ENDPOINT', 'S3_BUCKET', 'LAZY_DOCKER_MODE'):
                if key in payload:
                    env_vars[key] = str(payload[key]).strip()
            if 'ETSY_CLIENT_ID' in payload:
                env_vars['ETSY_API_KEY'] = str(payload['ETSY_CLIENT_ID']).strip()

            write_env_file(env_vars)
            return self.send_json({'ok': True, 'vars': env_vars})

        # 2. Multi-Shop Switch
        elif path == '/api/shops/switch':
            target_id = str(payload.get('id', '')).strip()
            st = load_shops_state()
            if any(s.get('id') == target_id for s in st.get('shops', [])):
                st['active_shop_id'] = target_id
                save_shops_state(st)
                return self.send_json({'ok': True, **get_enriched_shops()})
            return self.send_json({'ok': False, 'error': 'Mağaza bulunamadı'}, status=404)

        # 3. Multi-Shop Create
        elif path == '/api/shops/create':
            shop_name = str(payload.get('shop_name', '')).strip()
            etsy_shop_id = str(payload.get('shop_id', '')).strip() or str(int(time.time()) % 90000000 + 10000000)
            if not shop_name:
                return self.send_json({'ok': False, 'error': 'Mağaza adı zorunludur'}, status=400)
            slug = re.sub(r'[^a-z0-9]+', '-', shop_name.lower()).strip('-') or f"shop-{int(time.time())}"
            st = load_shops_state()
            existing_ids = {s.get('id') for s in st.get('shops', [])}
            if slug in existing_ids:
                slug = f"{slug}-{int(time.time()) % 1000}"

            new_shop = {
                "id": slug,
                "shop_id": etsy_shop_id,
                "shop_name": shop_name,
                "niche": str(payload.get('niche', 'Custom Wallpaper & Mural Collection')).strip(),
                "currency": str(payload.get('currency', 'USD')).strip() or 'USD',
                "default_price": float(payload.get('default_price', 325.00)),
                "client_id": str(payload.get('client_id', '')).strip(),
                "redirect_uri": str(payload.get('redirect_uri', '')).strip()
            }
            st.setdefault('shops', []).append(new_shop)
            st['active_shop_id'] = slug
            save_shops_state(st)
            return self.send_json({'ok': True, 'created': new_shop, **get_enriched_shops()})

        # 4. Multi-Shop Delete
        elif path == '/api/shops/delete':
            target_id = str(payload.get('id', '')).strip()
            st = load_shops_state()
            shops_list = st.get('shops', [])
            if len(shops_list) <= 1:
                return self.send_json({'ok': False, 'error': 'En az 1 aktif mağaza profili kalmalıdır.'}, status=400)
            filtered = [s for s in shops_list if s.get('id') != target_id]
            st['shops'] = filtered
            if st.get('active_shop_id') == target_id:
                st['active_shop_id'] = filtered[0]['id']
            save_shops_state(st)
            return self.send_json({'ok': True, **get_enriched_shops()})

        # 5. One-Click Publish (IP Shield + Compliance + Resilient Etsy API v3 / Catalog Sync)
        elif path == '/api/etsy/publish':
            shops_info = get_enriched_shops()
            active_shop = shops_info['active_shop'] or {}
            shop_profile_id = payload.get('shop_profile_id') or active_shop.get('id', 'logessa-murals')
            shop_obj = next((s for s in shops_info['shops'] if s['id'] == shop_profile_id), active_shop)

            title = str(payload.get('title', '')).strip()
            description = str(payload.get('description', '')).strip()
            tags = payload.get('tags', [])
            if not isinstance(tags, list):
                tags = []
            price = float(payload.get('price', shop_obj.get('default_price', 345.00)))
            state = str(payload.get('state', 'DRAFT')).upper()
            sku = str(payload.get('sku', 'CH-2026-M04')).strip()
            image = str(payload.get('image', 'img/std/3.webp')).strip()

            if not title or len(title) > 140:
                return self.send_json({'ok': False, 'error': f'Başlık boş olamaz ve 140 karakteri aşamaz (Mevcut: {len(title)}).'}, status=400)
            if len(tags) > 13 or any(len(str(t)) > 20 for t in tags):
                return self.send_json({'ok': False, 'error': 'Etiketler en fazla 13 adet ve her biri maksimum 20 karakter olmalıdır.'}, status=400)

            combined_text = f"{title} {description} {' '.join(str(t) for t in tags)}"
            ip_hits = check_ip_violations(combined_text)
            if ip_hits:
                return self.send_json({
                    'ok': False,
                    'error': f"Telif Kalkanı Engeli: Yasaklı tescilli marka tespit edildi ({', '.join(ip_hits)}). İlan yayını durduruldu!"
                }, status=400)

            claim_hits = check_compliance_claims(combined_text)
            if claim_hits:
                return self.send_json({
                    'ok': False,
                    'error': f"Uyumluluk Kalkanı Engeli: Riskli iddia tespit edildi ({', '.join(claim_hits)}). Lütfen metinden kaldırın."
                }, status=400)

            cfg = get_config()
            access_token = get_valid_access_token(shop_profile_id)
            remote_listing_id = None
            publish_mode = "CATALOG_SYNC"

            if access_token and shop_obj.get('shop_id'):
                try:
                    api_key_hdr = build_etsy_api_key_header(
                        shop_obj.get('effective_client_id') or cfg['client_id'],
                        cfg.get('shared_secret', '')
                    )
                    etsy_payload = urllib.parse.urlencode({
                        'quantity': 999,
                        'title': title,
                        'description': description or title,
                        'price': price,
                        'who_made': 'i_did',
                        'when_made': '2020_2026',
                        'taxonomy_id': 1429,
                        'tags': ','.join(str(t) for t in tags[:13]),
                        'type': 'physical'
                    }).encode('utf-8')
                    etsy_resp = etsy_request_with_retry(
                        f"https://openapi.etsy.com/v3/application/shops/{shop_obj['shop_id']}/listings",
                        method='POST',
                        headers={
                            'x-api-key': api_key_hdr,
                            'Authorization': f'Bearer {access_token}',
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        data_bytes=etsy_payload
                    )
                    if isinstance(etsy_resp, dict) and etsy_resp.get('listing_id'):
                        remote_listing_id = str(etsy_resp['listing_id'])
                        publish_mode = "ETSY_LIVE_API"
                except Exception as ex:
                    logging.warning(f"Live Etsy publish fell back to local catalog sync: {ex}")

            new_id = remote_listing_id or str(int(time.time()))
            listings = get_listings()
            new_item = {
                "id": new_id,
                "shop_id": shop_obj.get('id', 'logessa-murals'),
                "shop_name": shop_obj.get('shop_name', 'Logessa Wall Murals'),
                "sku": sku,
                "title": title,
                "price": price,
                "state": state if state in ('ACTIVE', 'DRAFT') else 'DRAFT',
                "category": str(payload.get('category', 'Mural')),
                "views": 0,
                "favorites": 0,
                "sales": 0,
                "revenue": 0.0,
                "image": image,
                "tags": tags[:13],
                "publish_mode": publish_mode,
                "created_at": utc_now_iso()
            }
            listings.insert(0, new_item)
            save_listings(listings)
            return self.send_json({
                'ok': True,
                'mode': publish_mode,
                'item': new_item,
                'shop': shop_obj,
                'listings': listings
            })

        # 6. Add New Listing with IP Pre-Check & Active Shop Tagging
        elif path == '/api/listings/create':
            listings = get_listings()
            title = str(payload.get("title", "New Wallpaper")).strip()
            violations = check_ip_violations(title)
            if violations:
                return self.send_json({
                    'ok': False,
                    'error': f"Telif Kalkanı: İlan başlığında tescilli marka/IP tespit edildi: {', '.join(violations)}"
                }, status=400)

            shops_info = get_enriched_shops()
            req_shop_id = payload.get("shop_id") or shops_info['active_shop_id'] or 'logessa-murals'
            shop_obj = next((s for s in shops_info['shops'] if s['id'] == req_shop_id), shops_info['active_shop'] or {})

            new_id = str(int(time.time()))
            new_item = {
                "id": new_id,
                "shop_id": shop_obj.get("id", "logessa-murals"),
                "shop_name": shop_obj.get("shop_name", "Logessa Wall Murals"),
                "sku": payload.get("sku", "QP-NEW"),
                "title": title,
                "price": float(payload.get("price", 299.00)),
                "state": payload.get("state", "DRAFT"),
                "category": payload.get("category", "Mural"),
                "views": 0,
                "favorites": 0,
                "sales": 0,
                "revenue": 0.0,
                "image": payload.get("image", "img/std/1.webp"),
                "created_at": utc_now_iso()
            }
            listings.insert(0, new_item)
            save_listings(listings)
            return self.send_json({'ok': True, 'item': new_item, 'listings': listings})

        # 7. Toggle Listing Status (ACTIVE <-> REMOVED / DRAFT)
        elif path == '/api/listings/status':
            listing_id = str(payload.get('id'))
            new_state = payload.get('state')
            listings = get_listings()
            updated = False
            for it in listings:
                if str(it.get('id')) == listing_id:
                    it['state'] = new_state
                    updated = True
                    break
            if updated:
                save_listings(listings)
                return self.send_json({'ok': True, 'listings': listings})
            return self.send_json({'ok': False, 'error': 'Listing not found'}, status=404)

        # 8. Delete Listing
        elif path == '/api/listings/delete':
            listing_id = str(payload.get('id'))
            listings = get_listings()
            filtered = [it for it in listings if str(it.get('id')) != listing_id]
            save_listings(filtered)
            return self.send_json({'ok': True, 'listings': filtered})

        super().do_POST()

def run():
    logging.info("Starting complete Logessa & Qoop Multi-Shop platform server on 0.0.0.0:8765...")
    server = ThreadingHTTPServer(('0.0.0.0', 8765), CustomHandler)
    server.serve_forever()

if __name__ == '__main__':
    run()
