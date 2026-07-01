import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomInt } from 'node:crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const {
  SMTP_HOST,
  SMTP_PORT = 587,
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL = 'noreply@misterytrips.com',
  FROM_NAME = 'MisteryTrips',
  ADMIN_EMAIL = 'hr@draconx.com',
  SITE_URL = 'https://misterytrips.com',
  PORT = 3000,
} = process.env;

// ---- Helpers ---------------------------------------------------------------

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Brevo SMTP transport, created once if credentials are present.
const transporter = (SMTP_HOST && SMTP_USER && SMTP_PASS)
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465, // 587 uses STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

// Send one email via Brevo SMTP. Keeps the same call shape used across the app.
async function sendBrevoEmail({ to, subject, htmlContent, replyTo }) {
  if (!transporter) {
    throw new Error('SMTP is not configured, set SMTP_HOST/SMTP_USER/SMTP_PASS in .env.');
  }
  const info = await transporter.sendMail({
    from: { name: FROM_NAME, address: FROM_EMAIL },
    to: (to || []).map((t) => ({ name: t.name || '', address: t.email })),
    subject,
    html: htmlContent,
    ...(replyTo ? { replyTo: { name: replyTo.name || '', address: replyTo.email } } : {}),
  });
  console.log(`[mail] "${subject}" -> accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)} resp=${info.response}`);
  return info;
}

// ---- Email templates -------------------------------------------------------

const BRAND_INK = '#0C1026';
const BRAND_GOLD = '#DDA84A';
const BRAND_CREAM = '#F4EDDF';
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = 'Arial, Helvetica, sans-serif';

const PACKAGE_LABELS = {
  'long-weekend': 'The Long Weekend, from $1,390 / person',
  'full-escape': 'The Full Escape, from $2,890 / person',
};

// 6-char unambiguous uppercase + digit Trip ID, e.g. "K7Q2M9"
function makeTripId() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += A.charAt(randomInt(0, A.length));
  return s;
}

// Shared, email-client-safe shell (table layout + inline styles).
function emailShell({ preheader = '', body }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>MisteryTrips</title></head>
<body style="margin:0;padding:0;background:${BRAND_INK};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_INK};">
  <tr><td align="center" style="padding:30px 14px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:600px;background:#100C2A;border:1px solid #2A2650;border-radius:20px;overflow:hidden;">
      <tr><td style="padding:26px 36px 20px;border-bottom:1px solid #221E45;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-family:${SERIF};font-size:23px;font-weight:bold;color:${BRAND_CREAM};">mistery<span style="color:${BRAND_GOLD};">trips</span></td>
          <td align="right" style="font-family:${SANS};font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#8C88A8;">pack &middot; fly &middot; reveal</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:34px 36px 12px;">${body}</td></tr>
      <tr><td style="padding:22px 36px 30px;border-top:1px solid #221E45;">
        <p style="font-family:${SANS};font-size:12px;line-height:1.6;color:#6B6788;margin:0;">MisteryTrips &middot; a <a href="https://draconx.com" style="color:#8C88A8;text-decoration:underline;">Draconx&nbsp;Inc.</a> company<br>The destination stays sealed until the gate. <a href="${SITE_URL}/privacy" style="color:#8C88A8;text-decoration:underline;">Privacy&nbsp;Policy</a></p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

const h1 = (t) => `<h1 style="font-family:${SERIF};font-size:29px;font-weight:normal;line-height:1.22;color:${BRAND_CREAM};margin:0 0 16px;">${t}</h1>`;
const para = (t) => `<p style="font-family:${SANS};font-size:15px;line-height:1.7;color:#C7C3D6;margin:0 0 18px;">${t}</p>`;

function ctaButton(label, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${BRAND_GOLD}" style="border-radius:999px;"><a href="${href}" style="display:inline-block;padding:14px 32px;font-family:${SANS};font-size:15px;font-weight:bold;color:#14122B;text-decoration:none;">${label}</a></td></tr></table>`;
}

function tripIdBadge(id) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:2px 0 24px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="border:1px dashed ${BRAND_GOLD};border-radius:14px;padding:16px 34px;background:rgba(221,168,74,0.06);">
      <div style="font-family:${SANS};font-size:11px;letter-spacing:0.26em;text-transform:uppercase;color:${BRAND_GOLD};margin-bottom:8px;">Your Trip ID</div>
      <div style="font-family:'Courier New',Courier,monospace;font-size:32px;letter-spacing:0.3em;color:${BRAND_CREAM};font-weight:bold;">${esc(id)}</div>
    </td></tr></table>
  </td></tr></table>`;
}

const dRow = (k, v) => `<tr><td style="padding:9px 14px;border-bottom:1px solid #221E45;font-family:${SANS};font-size:13px;color:#8C88A8;width:42%;vertical-align:top;">${esc(k)}</td><td style="padding:9px 14px;border-bottom:1px solid #221E45;font-family:${SANS};font-size:14px;color:${BRAND_CREAM};vertical-align:top;">${esc(v) || '-'}</td></tr>`;

// 1) USER welcome, sent the moment they enter their email
function welcomeEmailHtml(d) {
  const steps = [
    ['Tell us your taste', 'A few quick questions about how you love to travel.'],
    ['We craft it, quietly', 'We match you to somewhere you’d never have booked yourself.'],
    ['Break the seal at the gate', 'Your destination stays sealed until you’re at the airport.'],
  ].map(([t, s], i) => `<tr><td style="padding:0 0 14px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
      <td width="36" valign="top"><div style="width:26px;height:26px;border-radius:50%;background:rgba(221,168,74,0.16);color:${BRAND_GOLD};font-family:${SANS};font-size:13px;font-weight:bold;text-align:center;line-height:26px;">${i + 1}</div></td>
      <td style="font-family:${SANS};"><div style="font-size:15px;font-weight:bold;color:${BRAND_CREAM};">${t}</div><div style="font-size:13px;line-height:1.55;color:#9A95B5;">${s}</div></td>
    </tr></table></td></tr>`).join('');
  const body = `${h1(`Welcome aboard${d.firstName ? ', ' + esc(d.firstName) : ''}.`)}
    ${para('You’ve just started something exciting, a trip where everything is decided for you, and nothing is revealed until the gate. Answer a few questions and we’ll craft an adventure to somewhere you’d never choose yourself.')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 24px;">${steps}</table>
    ${ctaButton('Finish your trip request', SITE_URL + '/quiz')}
    <div style="height:22px;"></div>
    ${para('<span style="color:#8C88A8;font-size:13px;">No payment is taken to get your proposal. Reply to this email any time, a real human reads it.</span>')}`;
  return emailShell({ preheader: 'Your MisteryTrips adventure has begun, the destination stays a secret.', body });
}

// 2) ADMIN alert, a new user just started
function adminStartEmailHtml(d) {
  const body = `${h1('New trip request started')}
    ${para('Someone just entered their email in the questionnaire. Their full answers and Trip ID will follow when they finish.')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #221E45;">
      ${dRow('Name', d.name)}${dRow('Email', d.email)}${dRow('Phone', d.phone)}${dRow('Started', d.startedAt)}
    </table>`;
  return emailShell({ preheader: `New lead: ${d.name || d.email}`, body });
}

// 3) USER final, sent on submit, carries the Trip ID
function customerFinalEmailHtml(d) {
  const body = `${h1(`Your trip is being planned${d.firstName ? ', ' + esc(d.firstName) : ''}.`)}
    ${para('Thank you, your travel profile is complete. Our team is now matching you to a destination you’d never have booked yourself. Keep the Trip ID below handy and quote it in any message to us.')}
    ${tripIdBadge(d.tripId)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr><td style="background:#14122B;border:1px solid #2A2650;border-radius:14px;padding:18px 22px;">
      <div style="font-family:${SANS};font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${BRAND_GOLD};margin-bottom:6px;">Your trip</div>
      <div style="font-family:${SANS};font-size:16px;color:${BRAND_CREAM};">${esc(d.packageLabel)}</div>
    </td></tr></table>
    ${para('We’ll be in touch shortly to confirm your dates and payment. From there, the destination stays sealed until you tear open the dossier at the gate.')}
    ${para('<span style="color:#8C88A8;font-size:13px;">No payment has been taken yet. If anything looks wrong, just reply to this email.</span>')}`;
  return emailShell({ preheader: `Trip ID ${d.tripId}, your MisteryTrips adventure is being planned.`, body });
}

// 4) ADMIN final, full submission with Trip ID
function adminFinalEmailHtml(d) {
  const answers = (d.responses || []).map((r) => dRow(r.label, r.value)).join('');
  const body = `${h1('Quiz completed')}
    ${tripIdBadge(d.tripId)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #221E45;margin-bottom:22px;">
      ${dRow('Name', d.name)}${dRow('Email', d.email)}${dRow('Phone', d.phone)}${dRow('Package', d.packageLabel)}${dRow('Privacy consent', d.privacyConsent ? 'Agreed' : 'NOT AGREED')}${dRow('Submitted', d.submittedAt)}
    </table>
    <div style="font-family:${SANS};font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:${BRAND_GOLD};margin:0 0 6px;">Questionnaire answers</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #221E45;">${answers || dRow('(no answers)', '')}</table>`;
  return emailShell({ preheader: `Completed: ${d.name}, Trip ID ${d.tripId}`, body });
}

// ---- Routes ----------------------------------------------------------------

// Fired the moment the user enters their email: welcome (user) + alert (admin).
app.post('/api/quiz/start', async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    const email = String(b.email || '').trim();
    if (!isEmail(email)) return res.status(400).json({ ok: false, errors: ['Please enter a valid email address.'] });

    const d = {
      name,
      firstName: name.split(/\s+/)[0] || name,
      email,
      phone: String(b.phone || '').trim(),
      startedAt: new Date().toUTCString(),
    };

    const results = await Promise.allSettled([
      sendBrevoEmail({
        to: [{ email: d.email, name: d.name || d.email }],
        subject: 'Welcome to MisteryTrips, your trip request has begun',
        htmlContent: welcomeEmailHtml(d),
        replyTo: { email: ADMIN_EMAIL, name: 'MisteryTrips' },
      }),
      sendBrevoEmail({
        to: [{ email: ADMIN_EMAIL, name: 'MisteryTrips Bookings' }],
        subject: `New trip request started, ${d.name || d.email}`,
        htmlContent: adminStartEmailHtml(d),
        replyTo: { email: d.email, name: d.name },
      }),
    ]);
    results.filter((r) => r.status === 'rejected')
      .forEach((r) => console.error('[quiz/start] email failed:', r.reason && r.reason.message));

    return res.json({ ok: true });
  } catch (err) {
    console.error('[quiz/start] failed:', err.message);
    return res.status(502).json({ ok: false });
  }
});

// Fired on final submit: full summary + Trip ID to both user and admin.
app.post('/api/quiz', async (req, res) => {
  try {
    const b = req.body || {};

    const name = String(b.name || '').trim();
    const email = String(b.email || '').trim();
    const responses = Array.isArray(b.responses) ? b.responses : [];

    const errors = [];
    if (name.length < 1) errors.push('Please tell us your first name.');
    if (!isEmail(email)) errors.push('Please enter a valid email address.');
    if (!b.privacyConsent) errors.push('Please agree to the Privacy Policy.');
    if (errors.length) return res.status(400).json({ ok: false, errors });

    const data = {
      name,
      firstName: name.split(/\s+/)[0] || name,
      email,
      phone: String(b.phone || '').trim(),
      packageLabel: PACKAGE_LABELS[b.package] || 'Not selected',
      privacyConsent: !!b.privacyConsent,
      tripId: makeTripId(),
      // keep only clean {label, value} string pairs
      responses: responses
        .filter((r) => r && typeof r === 'object')
        .map((r) => ({ label: String(r.label || '').slice(0, 200), value: String(r.value || '').slice(0, 2000) })),
      submittedAt: new Date().toUTCString(),
    };

    // Admin first (capture the lead), then the user confirmation.
    await sendBrevoEmail({
      to: [{ email: ADMIN_EMAIL, name: 'MisteryTrips Bookings' }],
      subject: `Quiz completed, ${data.name} (${data.tripId})`,
      htmlContent: adminFinalEmailHtml(data),
      replyTo: { email: data.email, name: data.name },
    });

    await sendBrevoEmail({
      to: [{ email: data.email, name: data.name }],
      subject: `Your MisteryTrips adventure is being planned, Trip ID ${data.tripId}`,
      htmlContent: customerFinalEmailHtml(data),
      replyTo: { email: ADMIN_EMAIL, name: 'MisteryTrips' },
    });

    return res.json({ ok: true, tripId: data.tripId });
  } catch (err) {
    console.error('[quiz] send failed:', err.message);
    return res.status(502).json({
      ok: false,
      errors: ['We couldn\'t send your details just now. Please try again in a moment.'],
    });
  }
});

app.get('/quiz', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'quiz.html'));
});

app.get('/privacy', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MisteryTrips site running on port ${PORT}`);
  if (!transporter) {
    console.warn('⚠  SMTP not configured, set SMTP_HOST/SMTP_USER/SMTP_PASS in .env to send email.');
  } else {
    console.log(`✉  SMTP ready via ${SMTP_HOST}, sending as ${FROM_NAME} <${FROM_EMAIL}>`);
  }
});
