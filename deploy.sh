#!/bin/bash
set -e

# AuraHR Frontend - Deploy Script
# Run this on the server after any PR is merged into main.
# Usage: ./deploy.sh

PROJECT_DIR="/var/www/html/aurahr-frontend"
APP_NAME="aurahr-frontend"

echo "=== Moving into project folder ==="
cd "$PROJECT_DIR"

echo "=== Pulling latest code from GitHub ==="
git pull origin main

echo "=== Installing dependencies ==="
npm install

echo "=== Generating Prisma client ==="
npx prisma generate

echo "=== Building Next.js app ==="
npm run build

echo "=== Restarting app with PM2 ==="
pm2 restart "$APP_NAME"

echo "=== Deploy complete. Recent logs: ==="
pm2 logs "$APP_NAME" --lines 20 --nostream

echo ""
echo "Done. Check the live site now, and run 'pm2 logs $APP_NAME' to keep watching."
