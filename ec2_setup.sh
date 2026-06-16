#!/bin/bash
# ============================================================
# TexStyle Portal — EC2 auto-setup (Ubuntu 24.04)
# EC2 «User data» maydoniga qo'ying — instance ishga tushganda
# Node.js, pm2 va Nginx avtomatik o'rnatiladi.
# ============================================================
set -e

# 1) Tizimni yangilash
apt-get update -y

# 2) Node.js 20 (NodeSource) o'rnatish
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git nginx

# 3) pm2 (global)
npm install -g pm2

# 4) Loyiha papkasi (kodni keyin GitHub'dan clone qilasiz)
mkdir -p /var/www
# git clone https://github.com/SIZNING-LOGIN/texstyle-portal.git /var/www/texstyle-portal

# 5) Nginx reverse proxy konfiguratsiyasi
cat > /etc/nginx/sites-available/texstyle <<'EOF'
upstream texstyle_app { server 127.0.0.1:3000; keepalive 32; }
server {
    listen 80 default_server;
    server_name texstyle.duckdns.org _;
    gzip on;
    gzip_types text/html text/css application/javascript application/json image/svg+xml;
    location /health { proxy_pass http://texstyle_app/health; access_log off; }
    location / {
        proxy_pass http://texstyle_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }
}
EOF

ln -sf /etc/nginx/sites-available/texstyle /etc/nginx/sites-enabled/texstyle
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
systemctl enable nginx

echo "Setup complete. Endi: cd /var/www/texstyle-portal && npm install && npm run seed && pm2 start ecosystem.config.js" > /var/log/texstyle-setup.log
