#!/bin/bash
set -e

# =========================================
# DEPLOY SCRIPT - Next.js Standalone + PM2
# =========================================
# Cara pakai:
#   1. Letakkan file ini di root project (sejajar dengan package.json)
#   2. chmod +x deploy.sh
#   3. ./deploy.sh
#
# Domain:
#   Frontend: https://arvemart.com
#   Backend:  https://api.arvemart.com

APP_NAME="arvemart"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$PROJECT_DIR"

echo "==> [1/5] Pull latest code (skip jika tidak pakai git)"
# git pull

echo "==> [2/5] Install dependencies"
npm install

echo "==> [3/5] Build project"
npm run build

echo "==> [4/5] Copy static assets & env ke standalone"
rm -rf .next/standalone/public
cp -r public .next/standalone/public
mkdir -p .next/standalone/.next/static
rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/static

# Copy env (prioritas: .env.production > .env)
if [ -f .env.production ]; then
  cp .env.production .next/standalone/.env.production
elif [ -f .env ]; then
  cp .env .next/standalone/.env
fi

echo "==> [5/5] Restart PM2"
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 restart "$APP_NAME"
else
  pm2 start .next/standalone/server.js --name "$APP_NAME"
fi

pm2 save

echo "==> DONE. Cek log dengan: pm2 logs $APP_NAME --lines 30 --nostream"
