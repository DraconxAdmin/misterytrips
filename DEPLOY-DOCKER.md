# Deploy MisteryTrips with Docker

A self-contained Node/Express app (serves the site + sends email). Runs anywhere
Docker runs.

## 1. Push to GitHub (from your machine, in this folder)
```bash
git init
git add .
git commit -m "MisteryTrips site"
git branch -M main
git remote add origin https://github.com/<you>/misterytrips.git
git push -u origin main
```
`.env` is gitignored, so your SMTP secret is NOT pushed. Good.

## 2. On your server
Install Docker + Docker Compose (Ubuntu example):
```bash
curl -fsSL https://get.docker.com | sh
```

Clone and configure:
```bash
git clone https://github.com/<you>/misterytrips.git
cd misterytrips
cp .env.example .env
nano .env          # fill in the values (see below)
```

`.env` for production:
```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=9a8145001@smtp-brevo.com
SMTP_PASS=<your Brevo SMTP key>
FROM_EMAIL=info@misterytrips.com
FROM_NAME=MisteryTrips
ADMIN_EMAIL=hr@draconx.com
SITE_URL=https://misterytrips.com
```
(Do not set PORT — the container uses 3000 internally.)

## 3. Run it
```bash
docker compose up -d --build
```
The app is now on `http://<server-ip>:3000`. Test:
```bash
curl http://localhost:3000/health     # -> {"ok":true}
```
Useful commands:
```bash
docker compose logs -f        # live logs (look for "running on port 3000")
docker compose down           # stop
docker compose up -d --build  # redeploy after a git pull
```

## 4. Domain + HTTPS (reverse proxy)
Point your domain's A record to the server IP, then put a proxy in front of port 3000.
**Caddy** is the easiest (automatic Let's Encrypt SSL). On the server:

`/etc/caddy/Caddyfile`:
```
misterytrips.com, www.misterytrips.com {
    reverse_proxy localhost:3000
}
```
```bash
sudo apt install caddy && sudo systemctl reload caddy
```
That's it — Caddy fetches and renews the SSL cert automatically. (Nginx + certbot works too if you prefer.)

## 5. Email deliverability (don't skip)
In **Brevo → Senders, Domains & Dedicated IPs**:
1. **Verify the sender** `info@misterytrips.com`.
2. **Authenticate the `misterytrips.com` domain** (add the SPF + DKIM DNS records).
Until then, the welcome / Trip-ID emails will land in spam.

## Routes
`/` landing · `/quiz` questionnaire · `/privacy` policy · `/health` health check ·
`POST /api/quiz/start` (welcome + admin alert) · `POST /api/quiz` (final + Trip ID)
