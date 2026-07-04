server {
    listen 80;
    server_name arvemart.com;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name arvemart.com;

    ssl_certificate     /www/server/panel/vhost/cert/arvemart.com/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/arvemart.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Next.js static assets
    location /_next/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_bypass $http_upgrade;
    }

    # WA Engine proxy
    location /wa-api/ {
        rewrite ^/wa-api/(.*)$ /api/$1 break;
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Socket.IO for WA Engine
    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000/socket.io/;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /favicon.ico {
        proxy_pass http://127.0.0.1:3000;
    }
}

# ============================================
# API subdomain: https://api.arvemart.com
# ============================================
server {
    listen 80;
    server_name api.arvemart.com;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.arvemart.com;

    ssl_certificate     /www/server/panel/vhost/cert/api.arvemart.com/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/api.arvemart.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket for real-time payment status
    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8080;
    }
}
