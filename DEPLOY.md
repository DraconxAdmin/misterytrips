# Deploying MisteryTrips to Hostinger

This is a **Node.js + Express** app (it sends email server-side), so deploy it as a
**Node.js Web App** — NOT "Custom PHP/HTML website" (that's static only and can't run
the server or send emails).

## On the Hostinger screen, choose:
→ **Node.js Web App** ("Deploy your app from GitHub or upload files")

## Settings
| Field | Value |
|-------|-------|
| Application root | the folder you upload (contains `server.js`) |
| Application startup file | `server.js` |
| Start command | `npm start` (runs `node server.js`) |
| Node version | 18 or higher |

After uploading, Hostinger runs `npm install` automatically. If it doesn't, open the
panel terminal in the app folder and run `npm install` once.

## Environment variables
Set these in Hostinger's **Node.js app → Environment variables** (preferred), OR keep the
included `.env` file (it's already filled in):

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=...        (your Brevo SMTP login)
SMTP_PASS=...        (your Brevo SMTP key)
FROM_EMAIL=info@misterytrips.com
FROM_NAME=MisteryTrips
ADMIN_EMAIL=hr@draconx.com
SITE_URL=https://misterytrips.com
PORT=3000            (Hostinger may override this automatically)
```

> Hostinger assigns the port via the `PORT` env var — the app reads it, so leave the app
> to use whatever Hostinger provides.

## ⚠️ Email deliverability (important)
For the user/admin emails to actually arrive (not land in spam):
1. In **Brevo → Senders, Domains & Dedicated IPs**, **verify the sender** `info@misterytrips.com`.
2. **Authenticate the `misterytrips.com` domain** by adding the SPF + DKIM DNS records Brevo gives you (do this in Hostinger DNS).
Until the domain is authenticated, Gmail/Outlook will likely spam-folder the emails.

## What's in this folder
- `server.js` — the Express server (routes + email)
- `public/` — all pages, CSS, JS, and `assets/` (every image/GIF)
- `package.json` — dependencies (express, dotenv, nodemailer)
- `.env` — your live config (keep private)
- `.htaccess` — HTTPS redirect + caching (used by Hostinger's Apache front)

`node_modules/` is intentionally omitted — Hostinger installs it. `assets-src/` (image
backups) and `scripts/` (one-off image tool) are not needed in production.

## Routes
- `GET /` landing · `GET /quiz` questionnaire · `GET /privacy` policy
- `POST /api/quiz/start` welcome + admin alert · `POST /api/quiz` final + Trip ID
- `GET /health` health check
