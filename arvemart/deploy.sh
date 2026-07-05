#!/bin/bash
set -e

cd /www/wwwroot/arvemart

echo "🛑 Stop app..."
pm2 stop arvemart || true

echo "📦 Install dependencies..."
npm install

echo "🏗️ Build Next.js..."
rm -rf .next
npm run build

echo "🚀 Start app..."
pm2 start ecosystem.config.js --env production
pm2 save

echo "✅ Deploy selesai!"