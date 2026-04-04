#!/usr/bin/env bash
set -euo pipefail

# One-command VPS deploy script for Next.js app (PM2 + Nginx + optional SSL)
# Usage example:
#   sudo bash deploy.sh \
#     --domain your-domain.com \
#     --www-domain www.your-domain.com \
#     --repo https://github.com/you/your-repo.git \
#     --app-dir /var/www/apptienganh \
#     --app-name apptienganh \
#     --email you@example.com \
#     --enable-ssl

DOMAIN=""
WWW_DOMAIN=""
REPO_URL=""
APP_DIR="/var/www/apptienganh"
APP_NAME="apptienganh"
EMAIL=""
ENABLE_SSL="false"
SKIP_PACKAGES="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN="$2"; shift 2 ;;
    --www-domain)
      WWW_DOMAIN="$2"; shift 2 ;;
    --repo)
      REPO_URL="$2"; shift 2 ;;
    --app-dir)
      APP_DIR="$2"; shift 2 ;;
    --app-name)
      APP_NAME="$2"; shift 2 ;;
    --email)
      EMAIL="$2"; shift 2 ;;
    --enable-ssl)
      ENABLE_SSL="true"; shift ;;
    --skip-packages)
      SKIP_PACKAGES="true"; shift ;;
    *)
      echo "Unknown arg: $1"
      exit 1 ;;
  esac
done

if [[ -z "$DOMAIN" || -z "$REPO_URL" ]]; then
  echo "Missing required args."
  echo "Required: --domain <domain> --repo <git_repo_url>"
  exit 1
fi

if [[ "$ENABLE_SSL" == "true" && -z "$EMAIL" ]]; then
  echo "When --enable-ssl is set, --email is required."
  exit 1
fi

if [[ -z "$WWW_DOMAIN" ]]; then
  WWW_DOMAIN="www.${DOMAIN}"
fi

echo "==> Deploying app: $APP_NAME"
echo "==> Domain: $DOMAIN ($WWW_DOMAIN)"
echo "==> Repo: $REPO_URL"
echo "==> App dir: $APP_DIR"

if [[ "$SKIP_PACKAGES" != "true" ]]; then
  echo "==> Installing base packages (Node 20, Nginx, Git)"
  apt update -y
  apt upgrade -y
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs git nginx
fi

echo "==> Ensuring PM2 installed"
npm i -g pm2

PARENT_DIR="$(dirname "$APP_DIR")"
mkdir -p "$PARENT_DIR"

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "==> Cloning repository"
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "==> Pulling latest code"
  git -C "$APP_DIR" fetch --all
  git -C "$APP_DIR" pull --ff-only
fi

echo "==> Installing dependencies"
cd "$APP_DIR"
npm install

if [[ ! -f ".env.production" ]]; then
  if [[ -f ".env.example" ]]; then
    cp .env.example .env.production
    echo "==> Created .env.production from .env.example"
  else
    touch .env.production
    echo "==> Created empty .env.production"
  fi
fi

echo "==> IMPORTANT: verify .env.production before live traffic"
echo "    File: $APP_DIR/.env.production"

echo "==> Building Next.js app"
npm run build

echo "==> Starting/restarting PM2 process"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start npm --name "$APP_NAME" -- start
fi
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo "==> Writing Nginx config"
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"
cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name ${DOMAIN} ${WWW_DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/${APP_NAME}"
nginx -t
systemctl reload nginx

if command -v ufw >/dev/null 2>&1; then
  echo "==> Configuring UFW (if enabled)"
  ufw allow OpenSSH || true
  ufw allow "Nginx Full" || true
fi

if [[ "$ENABLE_SSL" == "true" ]]; then
  echo "==> Enabling SSL with certbot"
  apt install -y certbot python3-certbot-nginx
  certbot --nginx \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" -d "$WWW_DOMAIN" \
    --redirect
fi

echo "==> Health checks"
curl -I http://127.0.0.1:3000/ || true
curl -I "http://127.0.0.1:3000/api/vocabulary?page=1&limit=5" || true

echo
echo "✅ Deploy complete."
echo "App: $APP_NAME"
echo "Path: $APP_DIR"
echo "PM2 logs: pm2 logs $APP_NAME --lines 200"
echo "Nginx logs: tail -f /var/log/nginx/error.log"
echo
echo "⚠️ Remember to set production env in $APP_DIR/.env.production and restart:"
echo "pm2 restart $APP_NAME --update-env"
