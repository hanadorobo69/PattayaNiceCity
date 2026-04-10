#!/bin/bash
# ============================================================
# Deploy / Update — Run from your local machine
# Usage: bash deploy/deploy.sh
# ============================================================

set -e

# ---- CONFIGURE THESE ----
VPS_USER="deploy"
VPS_HOST="YOUR_VPS_IP"
APP_NAME="pattayavicecity"
# --------------------------

echo "=== Deploying $APP_NAME ==="

echo "1. Pushing latest code to GitHub..."
git push origin main

echo "2. Pulling on server + building..."
ssh $VPS_USER@$VPS_HOST << 'REMOTE'
cd /var/www/pattayavicecity

# Pull latest
git pull origin main

# Install deps
npm install --production=false

# Push schema to DB
npx prisma db push --accept-data-loss=false

# Generate Prisma client
npx prisma generate

# Build
npm run build

# Restart
pm2 restart pattayavicecity

echo "Deploy complete!"
REMOTE

echo "=== Done! ==="
