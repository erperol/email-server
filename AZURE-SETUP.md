# SETUP EMAIL-SERVER on AZURE VM (20.103.248.173)

## Create Dockerfile

```bash
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production
ENV PORT=9999

EXPOSE 9999

CMD ["node", "index.js"]
```

## Build image locally

```bash
docker build -t email-svc:local .
```

## Run container locally

```bash
docker run --rm \
  --env-file .env \
  -p 9999:9999 \
  email-svc:local
```

The output should be

```text
✅ Server started on http://localhost:9999
```

Verify

```bash
curl http://localhost:9999/health
```

## Push image to Docker Hub (same as ERP)

### Tag image

```bash
docker tag email-svc:local yourdockerhub/email-svc:latest
```

### Push

```bash
# After pushing make it public on DockerHub
docker push yourdockerhub/email-svc:latest
```

## Login to Azure via SSH

```bash
ssh erpadmin@<PUBLIC_IP>
```

## Create env file on VM

```bash
mkdir -p ~/email-svc
cd ~/email-svc

# Copy from local .env
nano .env
```

## Secure it (.env)

```bash
chmod 600 .env
```

## Run container (production-safe)

```bash
docker run -d \
  --name email-svc \
  --restart unless-stopped \
  --env-file .env \
  -p 9999:9999 \
  klusinyan/email-svc:latest
```

## Verify

```bash
docker ps
docker logs email-svc
```

## ❌ DO NOT OPEN PORT=9999 IN PRODUCTION (Nginx handles access)

```bash
az network nsg rule create \
  --resource-group rg-erp-project \
  --nsg-name erp-nsg \
  --name allow-email-svc \
  --priority 140 \
  --access Allow \
  --protocol Tcp \
  --direction Inbound \
  --destination-port-ranges 9999
```

## Close/open ports if needed

```bash
# Show ports mapping
az network nsg rule list \
  --resource-group rg-erp-project \
  --nsg-name erp-nsg \
  --output table

# Close port
# Rule name is the first column (ex: allow-email-svc)
az network nsg rule delete \
  --resource-group rg-erp-project \
  --nsg-name erp-nsg \
  --name <RULE_NAME_FOR_9999>

# Open port
az network nsg rule create \
  --resource-group rg-erp-project \
  --nsg-name erp-nsg \
  --name allow-email-svc \
  --priority 150 \
  --access Allow \
  --protocol Tcp \
  --direction Inbound \
  --destination-port-ranges <PORT>

# Check also the Linux firewall (UFW) on VM
sudo ufw status

# If it's active then 
sudo ufw delete allow 5000/tcp
sudo ufw allow 9999/tcp
sudo ufw reload
```

## ✅ External test

```bash
curl https://api.erperol.com/health
```

## Update & Build

```bash
docker build --no-cache -t email-svc:local .
```

### Test locally

```bash
docker run --rm \
  --env-file .env \
  -p 9999:9999 \
  email-svc:local
```

### Update locally and push to Docker Hub => LOOK BELOW

```bash

# Login to Docker
docker login

# Tag image (just once)
docker tag email-svc:local klusinyan/email-svc:latest

# Verify tag 
docker images | grep email-svc

> Result:
email-svc            local
klusinyan/email-svc  latest

# Push to Docker Hub
docker push klusinyan/email-svc:latest
```

## Update procedure on AZURE VM => LOOK BELOW

### Stop old container

```bash
docker stop email-svc
```

### Remove old container

```bash
docker rmi klusinyan/email-svc:latest
```

### Pull the new one

```bash
docker pull klusinyan/email-svc:latest
```

### Verify it's gone

```bash
docker ps -a | grep email-svc
```

### Run Container again

```bash
docker run -d \
  --name email-svc \
  --restart unless-stopped \
  --env-file .env \
  -p 9999:9999 \
  klusinyan/email-svc:latest
```

---

### Verification

```bash
docker ps
docker logs email-svc
```

## HTTPS + NGINX + DNS

```text
Browser (HTTPS)
   ↓
https://api.erperol.com/send
   ↓
Nginx (TLS termination)
   ↓
http://127.0.0.1:9999/send
   ↓
email-svc (Docker)
```

## Add A Record in DNS

```text
| Type | Name  | Value         |
| ---- | ----- | ------------- |
| A    | `api` | `<PUBLIC_IP>` |
```

## Install Nginx on the VM (if not already)

```bash
ssh erpadmin@<PUBLIC_IP>

# Install Nginx
sudo apt update
sudo apt install -y nginx

# Check
systemctl status nginx

# Open browser you should see Nginx welcome page.
http://20.103.248.173/
```

## Get HTTPS certificate (Let’s Encrypt)

```bash

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Issue certificate
sudo certbot --nginx -d api.erperol.com

# Verify
sudo certbot certificates
```

## Create Nginx reverse proxy config

```bash
sudo nano /etc/nginx/sites-available/api.erperol.com
```

## Enable site

```bash
sudo ln -s /etc/nginx/sites-available/api.erperol.com /etc/nginx/sites-enabled/

# Disable default (optional but recommended):
sudo rm /etc/nginx/sites-enabled/default
```

## Test config

```bash
sudo nginx -t
```

## Reload

```bash
sudo systemctl reload nginx
```

## Test HTTPS endpoints (api.erperol.com)

```bash
curl https://api.erperol.com/health
```

## NGINX CONFIG

```bash
# ------------------------------------------------------------
# API: api.erperol.com
# ------------------------------------------------------------

server {
    listen 80;
    server_name api.erperol.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.erperol.com;

    ssl_certificate     /etc/letsencrypt/live/api.erperol.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.erperol.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:9999;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }
}

# Apply config
sudo nginx -t
sudo systemctl reload nginx

# Verify
curl https://api.erperol.com/health
```

## 1️⃣ Rebuild & push (local)

```bash
docker build -t klusinyan/email-svc:latest .
docker push klusinyan/email-svc:latest
```

## 2️⃣ Pull & restart (Azure VM)

```bash
docker pull klusinyan/email-svc:latest
docker restart email-svc
```

## 3️⃣ Reload Nginx (safe, quick)

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## ✅ Final verification checklist

```bash
# ✔ Health (server)
curl https://api.erperol.com/health

# ✔ Preflight (Browser → Node)
curl -i -X OPTIONS https://api.erperol.com/send \
  -H "Origin: https://www.erperol.com" \
  -H "Access-Control-Request-Method: POST"
```
