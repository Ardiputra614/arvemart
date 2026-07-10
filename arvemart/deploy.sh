#!/bin/bash

# ini supaya cache global aapanel nggak bisa
sed -i 's/proxy_cache cache_one;/proxy_cache off;/' /www/server/nginx/conf/proxy.conf
rm -rf /www/server/nginx/proxy_cache_dir
nginx -t && nginx -s reload

set -e
cd /www/wwwroot/arvemart

echo "🛑 Stop app..."
pm2 stop arvemart || true

echo "📦 Install dependencies..."
npm install

echo "🏗️ Build Next.js..."
rm -rf .next
npm run build

echo "📁 Sync static assets ke standalone..."
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo "🚀 Start app..."
pm2 start ecosystem.config.js --env production
pm2 save

echo "✅ Deploy selesai!"