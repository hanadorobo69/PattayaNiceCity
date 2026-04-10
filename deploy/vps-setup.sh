#!/bin/bash
# ============================================================
# VPS Initial Setup — Run once on a fresh Hetzner CX32 (Ubuntu 22.04)
# Usage: ssh root@YOUR_IP < vps-setup.sh
# ============================================================

set -e

echo "=== 1. System update ==="
apt update && apt upgrade -y

echo "=== 2. Install Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "=== 3. Install PostgreSQL 16 ==="
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update
apt install -y postgresql-16

echo "=== 4. Install Nginx & Certbot ==="
apt install -y nginx certbot python3-certbot-nginx

echo "=== 5. Install PM2 ==="
npm install -g pm2

echo "=== 6. Setup PostgreSQL database ==="
# Generate a random password
DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
echo "Generated DB password: $DB_PASS"
echo "SAVE THIS PASSWORD — you'll need it for .env"

sudo -u postgres psql <<SQL
CREATE USER pattaya WITH PASSWORD '$DB_PASS';
CREATE DATABASE pattayavicecity OWNER pattaya;
GRANT ALL PRIVILEGES ON DATABASE pattayavicecity TO pattaya;
SQL

echo "=== 7. Create app user (non-root) ==="
useradd -m -s /bin/bash deploy 2>/dev/null || true
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || true
chown -R deploy:deploy /home/deploy/.ssh

echo "=== 8. Create app directories ==="
mkdir -p /var/www/pattayavicecity
chown -R deploy:deploy /var/www/pattayavicecity

echo "=== 9. Firewall ==="
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "=== 10. PM2 startup ==="
pm2 startup systemd -u deploy --hp /home/deploy
env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy

echo ""
echo "============================================"
echo "  VPS SETUP COMPLETE"
echo "============================================"
echo ""
echo "Database URL: postgresql://pattaya:${DB_PASS}@localhost:5432/pattayavicecity"
echo ""
echo "Next steps:"
echo "  1. Copy the Database URL above into your .env"
echo "  2. Deploy your app (see deploy.sh)"
echo "  3. Configure Nginx (see nginx configs)"
echo "  4. Run certbot: sudo certbot --nginx"
echo ""
