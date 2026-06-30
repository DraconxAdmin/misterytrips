# MisteryTrips — site + quiz

Marketing landing page and a quiz form. On submit, the server sends two emails
through the **Brevo** transactional API:

1. **Customer** — a branded "your trip is being planned" confirmation.
2. **Admin** — a full notification of every answer (reply-to is set to the customer).

## Stack
- Node + Express (static `public/`, one JSON API route)
- Vanilla HTML/CSS/JS front end (no build step)
- Brevo v3 transactional email API (called with `fetch`, no SDK)

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values
npm start              # http://localhost:3000
```

### Environment variables (`.env`)
| Var | What |
|-----|------|
| `BREVO_API_KEY` | Brevo v3 API key (Dashboard → SMTP & API → API Keys) |
| `FROM_EMAIL` | Sending address — **must be a verified sender/domain in Brevo** |
| `FROM_NAME` | Display name on outgoing email |
| `ADMIN_EMAIL` | Where the internal submission notification goes |
| `PORT` | Server port (default 3000) |

> Brevo rejects sends from an unverified `FROM_EMAIL`. Verify the sender or
> authenticate the domain in Brevo first, otherwise the API returns a 400.

## Routes
- `GET /` — landing page
- `GET /quiz` — questionnaire (accepts `?package=long-weekend|full-escape`)
- `POST /api/quiz` — validates, sends both emails, returns `{ ok: true }`
- `GET /health` — health check

## Notes
- The four "How it works" step images (`public/assets/step1-quiz.png` … `step4-gate.png`)
  aren't included; the cards fall back to their gradient backgrounds. Drop real
  images in with those names to show them.
- No data is stored — submissions exist only as the two emails. Add a DB/CRM
  write in `POST /api/quiz` if you want persistence.
