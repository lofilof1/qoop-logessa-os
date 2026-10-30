import os
import sys
import json
import base64
import hashlib
import re
import time
import logging
import urllib.request
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler

BASE_DIR = '/home/emorty/qoop-logessa-unified'
ENV_FILE = os.path.join(BASE_DIR, '.env')
CONFIG_FILE = os.path.join(BASE_DIR, 'etsy_config.json')
TOKENS_FILE = os.path.join(BASE_DIR, 'etsy_tokens.json')
AUTH_STATE_FILE = os.path.join(BASE_DIR, 'etsy_auth_state.json')
LISTINGS_FILE = os.path.join(BASE_DIR, 'listings.json')

logging.basicConfig(
    filename=os.path.join(BASE_DIR, 'server.log'),
    level=logging.INFO,
    format='%(asctime)s - %(message)s'
)

# ==============================================================================
# FİKRİ MÜLKİYET & TELİF KALKANI (IP Filter Blocklist)
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

def check_ip_violations(text):
    if not text:
        return []
    return list(set(IP_REGEX.findall(text)))

# Read or init .env
def read_env_file():
    env_vars = {}
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r') as f:
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
        "# Otomatik Güncellenme: 30 Ekim 2026",
        "# ==============================================================================",
        ""
    ]
    for k, v in env_vars.items():
        lines.append(f"{k}={v}")
    with open(ENV_FILE, 'w') as f:
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
        "s3_bucket": env.get('S3_BUCKET', 'qoop-assets')
    }

def refresh_etsy_token():
    if not os.path.exists(TOKENS_FILE):
        return None
    try:
        with open(TOKENS_FILE, 'r') as f:
            data = json.load(f)
        tokens = data.get('tokens', {})
        refresh_token = tokens.get('refresh_token')
        if not refresh_token:
            return None
        cfg = get_config()
        client_id = cfg['client_id']
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
        data['tokens'] = new_tokens
        data['refreshed_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        with open(TOKENS_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        return new_tokens
    except Exception as e:
        logging.error(f"Error refreshing Etsy token: {e}")
        return None

def get_listings():
    if os.path.exists(LISTINGS_FILE):
        try:
            with open(LISTINGS_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    return []

def save_listings(data):
    with open(LISTINGS_FILE, 'w') as f:
        json.dump(data, f, indent=2)

class CustomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, format, *args):
        logging.info("%s - - [%s] %s" % (self.address_string(), self.log_date_time_string(), format % args))

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # 1. Etsy Live Autosuggest (API Key gerektirmez, doğrudan Etsy'nin canlı arama çubuğu)
        if path == '/api/etsy/suggest':
            qs = urllib.parse.parse_qs(parsed.query)
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
                    # Parse Etsy autosuggest response structure
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
            except Exception as e:
                # Fallback to intelligent local keyword expansion
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

        # 2. IP / Telif Kontrol Endpoint
        elif path == '/api/etsy/ip-check':
            qs = urllib.parse.parse_qs(parsed.query)
            text = qs.get('text', [''])[0]
            violations = check_ip_violations(text)
            return self.send_json({'clean': len(violations) == 0, 'violations': violations})

        # 3. Etsy OAuth Start URL
        elif path == '/api/etsy/auth-url':
            cfg = get_config()
            client_id = cfg['client_id']
            redirect_uri = cfg['redirect_uri']

            qs = urllib.parse.parse_qs(parsed.query)
            if 'redirect_uri' in qs:
                redirect_uri = qs['redirect_uri'][0]

            code_verifier = base64.urlsafe_b64encode(os.urandom(32)).decode('utf-8').rstrip('=')
            digest = hashlib.sha256(code_verifier.encode('utf-8')).digest()
            code_challenge = base64.urlsafe_b64encode(digest).decode('utf-8').rstrip('=')
            state = base64.urlsafe_b64encode(os.urandom(16)).decode('utf-8').rstrip('=')

            auth_state = {
                'code_verifier': code_verifier,
                'code_challenge': code_challenge,
                'state': state,
                'redirect_uri': redirect_uri
            }
            with open(AUTH_STATE_FILE, 'w') as f:
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
            return self.send_json({'auth_url': auth_url, 'config': cfg})

        # 4. Etsy OAuth Callback
        elif path == '/callback':
            qs = urllib.parse.parse_qs(parsed.query)
            code = qs.get('code', [None])[0]
            if not code:
                self.send_response(400)
                self.end_headers()
                self.wfile.write("<h3>Hata: Yetkilendirme kodu bulunamadi.</h3>".encode('utf-8'))
                return

            if not os.path.exists(AUTH_STATE_FILE):
                self.send_response(400)
                self.end_headers()
                self.wfile.write("<h3>Hata: Oturum durumu bulunamadi.</h3>".encode('utf-8'))
                return

            with open(AUTH_STATE_FILE, 'r') as f:
                auth_state = json.load(f)

            cfg = get_config()
            client_id = cfg['client_id']
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
                with urllib.request.urlopen(req) as resp:
                    tokens = json.loads(resp.read().decode('utf-8'))

                access_token = tokens.get('access_token')
                # 2026 Etsy API header rule: x-api-key can be keystring or keystring:secret
                api_key_hdr = client_id
                if cfg.get('shared_secret'):
                    api_key_hdr = f"{client_id}:{cfg['shared_secret']}"

                user_req = urllib.request.Request(
                    'https://openapi.etsy.com/v3/application/users/me',
                    headers={'x-api-key': api_key_hdr, 'Authorization': f'Bearer {access_token}'}
                )
                user_data = {}
                try:
                    with urllib.request.urlopen(user_req) as u_resp:
                        user_data = json.loads(u_resp.read().decode('utf-8'))
                except Exception as ex:
                    logging.error(f"Error fetching user details: {ex}")

                shop_data = {}
                user_id = user_data.get('user_id')
                if user_id:
                    shop_req = urllib.request.Request(
                        f'https://openapi.etsy.com/v3/application/users/{user_id}/shops',
                        headers={'x-api-key': api_key_hdr, 'Authorization': f'Bearer {access_token}'}
                    )
                    try:
                        with urllib.request.urlopen(shop_req) as s_resp:
                            shop_data = json.loads(s_resp.read().decode('utf-8'))
                    except Exception as ex:
                        logging.error(f"Error fetching shop details: {ex}")

                full_data = {
                    'tokens': tokens,
                    'user': user_data,
                    'shop': shop_data,
                    'connected_at': os.popen('date -u +"%Y-%m-%dT%H:%M:%SZ"').read().strip()
                }
                with open(TOKENS_FILE, 'w') as f:
                    json.dump(full_data, f, indent=2)

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

        # 5. Etsy Status Check
        elif path == '/api/etsy/status':
            cfg = get_config()
            connected = os.path.exists(TOKENS_FILE)
            data = {'connected': False, 'config': cfg}
            if connected:
                try:
                    with open(TOKENS_FILE, 'r') as f:
                        saved = json.load(f)
                    data['connected'] = True
                    data['shop'] = saved.get('shop')
                    data['user'] = saved.get('user')
                    data['connected_at'] = saved.get('connected_at')
                    data['refreshed_at'] = saved.get('refreshed_at')
                except Exception:
                    pass
            return self.send_json(data)

        # 5b. Etsy Token Refresh
        elif path == '/api/etsy/refresh':
            refreshed = refresh_etsy_token()
            if refreshed:
                return self.send_json({'ok': True, 'tokens': refreshed})
            return self.send_json({'ok': False, 'error': 'Token refresh failed or token file not found'}, status=400)

        # 6. Listings Inventory
        elif path == '/api/listings':
            return self.send_json(get_listings())

        # 7. Environment / Settings
        elif path == '/api/env':
            env_vars = read_env_file()
            raw_text = ""
            if os.path.exists(ENV_FILE):
                with open(ENV_FILE, 'r') as f:
                    raw_text = f.read()
            return self.send_json({'vars': env_vars, 'raw': raw_text})

        # Static files
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
            if 'ETSY_CLIENT_ID' in payload:
                env_vars['ETSY_CLIENT_ID'] = payload['ETSY_CLIENT_ID'].strip()
                env_vars['ETSY_API_KEY'] = payload['ETSY_CLIENT_ID'].strip()
            if 'ETSY_REDIRECT_URI' in payload:
                env_vars['ETSY_REDIRECT_URI'] = payload['ETSY_REDIRECT_URI'].strip()
            if 'ETSY_SHARED_SECRET' in payload:
                env_vars['ETSY_SHARED_SECRET'] = payload['ETSY_SHARED_SECRET'].strip()
            if 'AI_PROVIDER' in payload:
                env_vars['AI_PROVIDER'] = payload['AI_PROVIDER'].strip()
            if 'OLLAMA_ENDPOINT' in payload:
                env_vars['OLLAMA_ENDPOINT'] = payload['OLLAMA_ENDPOINT'].strip()
            if 'S3_BUCKET' in payload:
                env_vars['S3_BUCKET'] = payload['S3_BUCKET'].strip()

            write_env_file(env_vars)
            return self.send_json({'ok': True, 'vars': env_vars})

        # 2. Add New Listing with IP Pre-Check
        elif path == '/api/listings/create':
            listings = get_listings()
            title = payload.get("title", "New Wallpaper")
            # IP trademark pre-check
            violations = check_ip_violations(title)
            if violations:
                return self.send_json({
                    'ok': False,
                    'error': f"Telif Kalkanı: İlan başlığında tescilli marka/IP tespit edildi: {', '.join(violations)}"
                }, status=400)

            import time
            new_id = str(int(time.time()))
            new_item = {
                "id": new_id,
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
                "created_at": os.popen('date -u +"%Y-%m-%dT%H:%M:%SZ"').read().strip()
            }
            listings.insert(0, new_item)
            save_listings(listings)
            return self.send_json({'ok': True, 'item': new_item, 'listings': listings})

        # 3. Toggle Listing Status (ACTIVE <-> REMOVED / DRAFT)
        elif path == '/api/listings/status':
            listing_id = str(payload.get('id'))
            new_state = payload.get('state') # ACTIVE, REMOVED, DRAFT
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

        # 4. Delete Listing
        elif path == '/api/listings/delete':
            listing_id = str(payload.get('id'))
            listings = get_listings()
            filtered = [it for it in listings if str(it.get('id')) != listing_id]
            save_listings(filtered)
            return self.send_json({'ok': True, 'listings': filtered})

        super().do_POST()

def run():
    logging.info("Starting complete Logessa platform server on 0.0.0.0:8765...")
    server = HTTPServer(('0.0.0.0', 8765), CustomHandler)
    server.serve_forever()

if __name__ == '__main__':
    run()
