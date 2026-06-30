/* MisteryTrips — one-question-per-page questionnaire engine */
(function () {
  'use strict';

  // ---------- helpers ----------
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');

  // upcoming months (peak pricing in summer) for the flexible-dates question
  const monthOpts = (() => {
    const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const tier = [1,1,2,2,2,3,3,3,2,2,1,1]; // 1=$ 2=$$ 3=$$$
    const now = new Date();
    const out = [];
    for (let i = 1; i <= 8; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const m = d.getMonth();
      out.push({ value: `${names[m]} ${d.getFullYear()}`, label: `${names[m]} ${d.getFullYear()} (${'$'.repeat(tier[m])})` });
    }
    return out;
  })();

  const AIRPORTS = ['Atlanta — ATL','Austin — AUS','Boston — BOS','Charlotte — CLT','Chicago — ORD','Dallas — DFW','Denver — DEN','Detroit — DTW','Houston — IAH','Kansas City — MCI','Los Angeles — LAX','Miami — MIA','Minneapolis — MSP','Nashville — BNA','New York — JFK/EWR','Phoenix — PHX','Portland — PDX','San Francisco — SFO','Seattle — SEA','Washington DC — IAD/BWI']
    .map((a) => ({ value: a, label: a }));

  const COUNTRIES = ['Portugal','Spain','Italy','France','Greece','Croatia','Iceland','Ireland','Norway','Netherlands','Czechia','Hungary','Turkey','Morocco','Japan','Thailand','Vietnam','Mexico','Costa Rica','Colombia','Peru','Argentina']
    .map((c) => ({ value: c, label: c }));

  const opt = (arr) => arr.map((v) => (typeof v === 'string' ? { value: v, label: v } : v));

  // personalised "who" — e.g. "Jordan" or "Jordan & Sam"
  const who = (a) => {
    const n = (a.firstName || '').trim();
    const c = (a.companions || '').trim();
    if (!n) return 'Your group';
    return c ? `${n} & ${c}` : n;
  };

  // Brand paper-plane shown only when an image slot has no file yet.
  const FALLBACK_SVG = '<svg viewBox="0 0 100 100" width="58" height="58" fill="none"><path d="M14 86 Q34 70 50 60" stroke="#9A7B33" stroke-width="2.5" stroke-dasharray="1 5.5" stroke-linecap="round"/><path d="M90 14 L10 52 L52 60 Z" fill="#DDA84A"/><path d="M90 14 L52 60 L44 86 Z" fill="#B07F2E"/></svg>';
  window.wzFallback = function (img) { try { img.parentElement.innerHTML = FALLBACK_SVG; } catch (e) {} };

  // ---------- the questionnaire ----------
  const STEPS = [
    { id: 'intro', type: 'intro', image: 'quiz-welcome.png',
      q: 'Find your trip.',
      hint: 'Answer a few questions, one at a time — about three minutes. We craft the trip; the destination stays sealed until the gate. Nothing is charged today.',
      cta: "Let's go" },

    // ---- Your group ----
    { id: 'groupSize', part: 'Your group', type: 'single', required: true,
      q: 'How many people are travelling?',
      hint: 'You can add Explorers later. Max group size is 4 — everyone 10+, at least one 18+.',
      options: opt(['1 (just you)','2','3','4']) },
    { id: 'firstName', part: 'Your group', type: 'text', required: true,
      q: "What's your first name?", placeholder: 'First name', autocomplete: 'given-name' },
    { id: 'companions', part: 'Your group', type: 'text', required: true,
      showIf: (a) => a.groupSize && a.groupSize !== '1 (just you)',
      q: "And who's travelling with you?", hint: "First name(s) of your travel companion(s). We'll build a joint Travel Profile.",
      placeholder: 'e.g. Sam, Alex' },
    { id: 'contact', part: 'Your group', type: 'contact', required: true,
      q: 'Where should we send your trip details?',
      hint: 'We’ll send a welcome to this address now, and your Trip Proposal once we’ve matched you. No spam, ever.' },

    // ---- Section: Travel Profile ----
    { id: 'sec1', type: 'section', part: 'Part 1 of 3', image: 'quiz-part1.png',
      q: (a) => `${who(a)}'s Travel Profile.`,
      hint: "This covers your group's broad tastes and needs when you travel together. Consider everyone when answering.",
      cta: 'Continue' },

    { id: 'bucket', part: 'Travel profile', type: 'single', required: true,
      q: 'Any countries on your bucket list?',
      options: opt(['Yes!', "No, I'm open to anywhere"]) },
    { id: 'countries', part: 'Travel profile', type: 'multi', grid: true, min: 3, required: true,
      showIf: (a) => a.bucket === 'Yes!',
      q: 'Which countries are on your bucket list?',
      hint: "Pick at least 3 you've always wanted to visit. We'll lean toward these.",
      options: COUNTRIES },
    { id: 'fears', part: 'Travel profile', type: 'multi', required: true, exclusive: 'Nothing you need to be aware of',
      q: 'Any fears, phobias, or medical conditions we should know for your experiences?',
      options: opt(['Nothing you need to be aware of','Unable to do prolonged physical activity','Severe fear of heights',"Can't swim",'Sea sickness','Fear of deep water','Claustrophobia','Fear of dogs']) },
    { id: 'neverDo', part: 'Travel profile', type: 'multi', grid: true, required: true, exclusive: 'Comfortable with them all',
      q: 'Are there activities you would simply never do?',
      hint: 'We like to nudge you outside your comfort zone — everything is beginner-friendly with expert guides.',
      options: opt(['Comfortable with them all','No to paragliding','No to canyoning/caving','No to scuba diving','No to surfing','No to rafting','No to kayaking/SUP','No to swimming/snorkeling','No to boat trips','No to nature walks','No to hiking','No to biking/segway','No to horse/camel riding','No to wine tasting','No to brewery/distillery tours','No to spa treatments with contact']) },
    { id: 'diet', part: 'Travel profile', type: 'multi', required: true, exclusive: 'None',
      q: 'Any dietary restrictions for foodie experiences?',
      options: opt(['None','Vegetarian','Vegan',"Don't drink alcohol",'Other restriction or severe allergy']) },
    { id: 'unsafe', part: 'Travel profile', type: 'multi', required: true, exclusive: 'None of these apply',
      q: 'Are any of these destination types unsafe for you?',
      hint: "Whatever you select, we'll never send you to an active conflict zone.",
      options: opt(['None of these apply','Considered unsafe for solo female travellers','Hostility towards the LGBTQ+ community','Hostility towards the Black community','Unfavourable attitude towards followers of Islam','Unfavourable attitude towards people of Jewish faith']) },
    { id: 'noGo', part: 'Travel profile', type: 'textarea', required: false,
      q: 'Your No-Go list.', hint: "Anywhere you'd never want to visit, or have already been? List countries and/or cities. Free of charge.",
      placeholder: 'e.g. Already done Paris and Rome; no long-haul flights please.' },
    { id: 'stay', part: 'Travel profile', type: 'single', required: true,
      q: 'Do you prefer private apartments or hotels?', hint: '93% of Explorers love the stays we book.',
      options: opt(['Either is fine','Private apartment','Hotel']) },
    { id: 'bed', part: 'Travel profile', type: 'single', required: true,
      q: 'What bed setup do you like?', hint: 'Rooms are shared between two people. Single beds can’t be guaranteed.',
      options: opt(['One double bed','Preferably two single beds']) },
    { id: 'accom', part: 'Travel profile', type: 'multi', grid: true, max: 3, required: true, exclusive: "I'm flexible",
      q: 'Any specific accommodation requests?', hint: "We'll do our best, but these can't be guaranteed. Choose up to 3.",
      options: opt(["I'm flexible",'Breakfast included','Bar/restaurant available','Has a bath','Has a swimming pool','Has a balcony or outdoor area']) },
    { id: 'passport', part: 'Travel profile', type: 'single', required: true,
      q: 'Do you travel on a US passport?',
      hint: 'MisteryTrips currently serves travellers flying from the USA on a US passport.',
      options: opt(['Yes, I have a US passport','No — not yet supported']) },
    { id: 'airports', part: 'Travel profile', type: 'multi', grid: true, min: 1, max: 2, required: true,
      q: 'Which US airports can you fly from?', hint: 'Choose 1 or 2.',
      options: AIRPORTS },

    // ---- Section: Your trip ----
    { id: 'sec2', type: 'section', part: 'Part 2 of 3', image: 'quiz-part2.png',
      q: (a) => `${who(a)}'s trip.`,
      hint: "Now the questions about this specific trip. Request another proposal later and we'll ask these again.",
      cta: "Let's go" },

    { id: 'package', part: 'Your trip', type: 'package', required: true,
      q: 'Which trip are you after?',
      options: [
        { value: 'long-weekend', name: 'The Long Weekend', price: 'From $1,390 / person', desc: '3–4 days · a regional escape.' },
        { value: 'full-escape', name: 'The Full Escape', price: 'From $2,890 / person', desc: '7 days · international, further afield.' },
      ] },

    { id: 'secAct', type: 'section', part: 'Your trip', image: 'quiz-activities.gif',
      q: 'How keen are you on each of these?',
      hint: "Rate each from 1 (not interested) to 5 (very interested). There are no wrong answers — it just helps us read you.",
      cta: "Start rating" },

    ...[
      ['actOutdoor', 'Outdoor activities', 'act-outdoor.gif'],
      ['actNature', 'Being in nature', 'act-nature.gif'],
      ['actVillages', 'Exploring charming villages', 'act-villages.gif'],
      ['actLandmarks', 'Popular sites & landmarks', 'act-landmarks.gif'],
      ['actHistory', 'Places of historical significance', 'act-history.gif'],
      ['actMuseums', 'Museums & art galleries', 'act-museums.gif'],
      ['actPerformances', 'Enjoying local performances', 'act-performances.gif'],
      ['actFood', 'Tasty local food', 'act-food.gif'],
    ].map(([id, label, image]) => ({
      id, part: 'Your trip', type: 'rating', required: true, q: label, image,
      scale: ['Not interested', 'Very interested'],
    })),

    { id: 'goal', part: 'Your trip', type: 'single', required: true,
      q: "What's the main thing you want out of this adventure?",
      options: opt(['Visit a new destination','Emotional wellness','Quality time together / by myself','Celebrate a special occasion']) },
    { id: 'occasion', part: 'Your trip', type: 'single', grid: true, required: true,
      showIf: (a) => a.goal === 'Celebrate a special occasion',
      q: "Congrats! What's the special occasion?",
      options: opt(['Reunion','Pre-wedding','First trip together','Post-engagement','Anniversary','First solo trip','Graduation','Proposal','Birthday','Honeymoon (or mini-moon)']) },
    { id: 'traits', part: 'Your trip', type: 'multi', grid: true, min: 2, max: 5, required: true,
      q: 'What are you looking for in your surprise destination?', hint: 'Make between 2 and 5 choices.',
      options: opt(['English widely spoken','Photogenic','Easy to get around','Sandy beaches','Lots of greenery','Peaceful','Striking architecture','Mountainous','Colourful','Inexpensive','Unconventional','Bustling cities','Small towns','Artsy']) },
    { id: 'reveal', part: 'Your trip', type: 'single', required: true,
      q: 'What do you need to know about your destination before booking?',
      options: opt(['A destination teaser is enough for me',"I'd need to know the region or country"]) },
    { id: 'pace', part: 'Your trip', type: 'rating', required: true, image: 'act-pace.gif',
      q: 'How busy would you like to be?', scale: ['Slow-paced', 'Fast-paced'] },
    { id: 'temperature', part: 'Your trip', type: 'single', required: true,
      q: 'Do you have an ideal temperature in mind?', hint: 'Warm = more than 15°C / 60°F.',
      options: opt(["I'm flexible",'I prefer cooler weather','I prefer warmer weather',"I'm set on warm weather"]) },
    { id: 'medical', part: 'Your trip', type: 'multi', required: true, exclusive: 'None apply',
      q: 'Do any of these medical conditions apply?',
      hint: 'We can exclude adventurous experiences, but all trips involve some activity.',
      options: opt(['None apply','Pregnancy','Injury that restricts adventurous activity']) },
    { id: 'whenType', part: 'Your trip', type: 'single', required: true,
      q: 'When are you able to travel?',
      options: opt(['I have specific dates in mind','I’m flexible — any month works']) },
    { id: 'dates', part: 'Your trip', type: 'daterange', required: true,
      showIf: (a) => a.whenType === 'I have specific dates in mind',
      q: 'Which dates work?', hint: "We'll treat these as your ideal window (flexible by ±7 days)." },
    { id: 'months', part: 'Your trip', type: 'multi', grid: true, min: 1, required: true,
      showIf: (a) => a.whenType === 'I’m flexible — any month works',
      q: 'Which months could you go?', hint: '$–$$$ reflects typical flight & accommodation prices.',
      options: monthOpts },
    { id: 'budget', part: 'Your trip', type: 'budget', required: true,
      q: "What's your budget per person?",
      hint: (a) => (a.package === 'long-weekend'
        ? 'Covers return flights, hand-picked stays, 2–3 experiences, and your sealed dossier. Typical Long Weekend budget is around $1,390 per person.'
        : 'Covers return flights, hand-picked stays, 4–6 experiences, day-by-day itinerary, and 24/7 support. Typical Full Escape budget is around $2,890 per person.') },

    // ---- Contact + consent ----
    { id: 'secContact', type: 'section', part: 'Part 3 of 3', image: 'quiz-part3.png',
      q: 'Almost there.',
      hint: 'One last thing — agree to our Privacy Policy and we’ll start matching you to your surprise destination.',
      cta: 'Continue' },
    { id: 'consent', part: 'Finish', type: 'consent', required: true,
      q: 'One last thing.',
      hint: 'You’ll need to agree to our Privacy Policy so we can send your Trip Proposal. We don’t misuse your data.' },
  ];

  // ---------- engine ----------
  const A = {};                       // answers keyed by step id
  const stepEl = document.getElementById('wz-step');
  const errEl = document.getElementById('wz-error');
  const barEl = document.getElementById('wz-bar');
  const backBtn = document.getElementById('wz-back');
  const nextBtn = document.getElementById('wz-next');
  const actionsEl = document.getElementById('wz-actions');

  // pre-select package from ?package=
  const pkgParam = new URLSearchParams(location.search).get('package');
  if (pkgParam === 'long-weekend' || pkgParam === 'full-escape') A.package = pkgParam;

  const visible = () => STEPS.filter((s) => !s.showIf || s.showIf(A));
  let curId = STEPS[0].id;

  const fnOr = (v) => (typeof v === 'function' ? v(A) : v);

  function render() {
    const list = visible();
    let idx = list.findIndex((s) => s.id === curId);
    if (idx < 0) { idx = 0; curId = list[0].id; }
    const step = list[idx];
    errEl.textContent = '';

    // progress + nav chrome
    barEl.style.width = Math.round((idx / (list.length - 1)) * 100) + '%';
    backBtn.hidden = idx === 0;
    const isLast = step.type === 'consent';
    nextBtn.textContent = step.type === 'intro' || step.type === 'section' ? (step.cta || 'Continue')
      : isLast ? "I'm finished. Match me!" : 'Next →';
    actionsEl.className = 'wz-actions' + (step.type === 'intro' || step.type === 'section' ? ' center' : '');

    stepEl.innerHTML = renderStep(step);
    stepEl.classList.remove('wz-step'); void stepEl.offsetWidth; stepEl.classList.add('wz-step');
    wire(step);
  }

  function countData(list, idx) {
    const total = list.filter((s) => !['intro', 'section'].includes(s.type)).length;
    const n = list.slice(0, idx + 1).filter((s) => !['intro', 'section'].includes(s.type)).length;
    return `${n} of ${total}`;
  }

  function head(step) {
    const req = step.required && !['intro', 'section'].includes(step.type) ? ' <span class="wz-required">*</span>' : '';
    let part = step.part;
    if (part === 'Travel profile') part = `${who(A)}'s travel profile`;
    else if (part === 'Your trip') part = `${A.firstName ? A.firstName + '’s' : 'Your'} trip`;
    const eye = part ? `<div class="wz-eyebrow">${esc(part)}</div>` : '';
    const hint = fnOr(step.hint);
    return `${eye}<h1 class="wz-q">${esc(fnOr(step.q))}${req}</h1>${hint ? `<p class="wz-hint">${esc(hint)}</p>` : ''}`;
  }

  function renderStep(step) {
    switch (step.type) {
      case 'intro':
      case 'section': {
        const src = step.image ? `/assets/${step.image}` : '';
        const inner = src ? `<img src="${src}" alt="" onerror="wzFallback(this)">` : FALLBACK_SVG;
        return `<div class="wz-section"><div class="wz-illus">${inner}</div>${head(step)}</div>`;
      }
      case 'single':
        return head(step) + radioList(step, false);
      case 'multi':
        return head(step) + radioList(step, true);
      case 'package':
        return head(step) + pkgList(step);
      case 'rating':
        return head(step) + ratingImage(step) + ratingBlock(step);
      case 'text':
        return head(step) + `<input class="q-input" id="f" type="text" value="${esc(A[step.id] || '')}" placeholder="${esc(step.placeholder || '')}" autocomplete="${esc(step.autocomplete || 'off')}">`;
      case 'textarea':
        return head(step) + `<textarea class="q-textarea" id="f" placeholder="${esc(step.placeholder || '')}">${esc(A[step.id] || '')}</textarea>`;
      case 'budget':
        return head(step) + `<div style="display:flex;align-items:center;gap:10px;"><span style="font-family:'Newsreader',serif;font-size:30px;color:#DDA84A;">$</span><input class="q-input" id="f" inputmode="numeric" type="text" value="${esc(A[step.id] || '')}" placeholder="2,000" style="font-size:18px;"></div>`;
      case 'daterange':
        return head(step) + `<div class="q-row"><input class="q-input" id="from" type="date" value="${esc((A.dates && A.dates.from) || '')}" aria-label="Earliest date"><input class="q-input" id="to" type="date" value="${esc((A.dates && A.dates.to) || '')}" aria-label="Latest date"></div>`;
      case 'contact':
        return head(step)
          + `<div class="q-field"><label class="q-label" for="email">Email <span class="wz-required">*</span></label><input class="q-input" id="email" type="email" value="${esc(A.email || '')}" placeholder="you@email.com" autocomplete="email"></div>`
          + `<div class="q-field" style="margin-bottom:0;"><label class="q-label" for="phone">Phone <span style="color:#6B6788;font-weight:400;">(optional)</span></label><input class="q-input" id="phone" type="tel" value="${esc(A.phone || '')}" placeholder="+1 555 000 0000" autocomplete="tel"></div>`;
      case 'consent':
        return head(step)
          + `<label class="wz-consent"><input type="checkbox" id="agree" ${A.consent ? 'checked' : ''}><span style="font-size:15px;line-height:1.55;color:#D7D3E4;">I agree to the <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a> and consent to MisteryTrips (operated by Draconx Inc.) processing my answers to prepare and send my Trip Proposal.</span></label>`;
      default:
        return head(step);
    }
  }

  function radioList(step, multi) {
    const sel = A[step.id] || (multi ? [] : '');
    const wrap = step.grid ? 'wz-grid' : 'wz-options';
    const items = step.options.map((o) => {
      const checked = multi ? sel.includes(o.value) : sel === o.value;
      return `<label class="wz-opt${multi ? ' multi' : ''}"><input type="${multi ? 'checkbox' : 'radio'}" name="opt" value="${esc(o.value)}" ${checked ? 'checked' : ''}><span>${esc(o.label)}</span></label>`;
    }).join('');
    const note = fnOr(step.note);
    return `<div class="${wrap}">${items}</div>${note ? `<div class="wz-note">${esc(note)}</div>` : ''}`;
  }

  function pkgList(step) {
    const sel = A[step.id] || '';
    return '<div class="q-pkg">' + step.options.map((o) =>
      `<label><input type="radio" name="opt" value="${esc(o.value)}" ${sel === o.value ? 'checked' : ''}><div class="card"><div class="name">${esc(o.name)}</div><div class="price">${esc(o.price)}</div><div class="desc">${esc(o.desc)}</div></div></label>`
    ).join('') + '</div>';
  }

  function ratingImage(step) {
    if (!step.image) return '';
    return `<div class="wz-illus wz-illus--rating"><img src="/assets/${esc(step.image)}" alt="" onerror="wzFallback(this)"></div>`;
  }

  function ratingBlock(step) {
    const sel = A[step.id] || '';
    const cells = [1, 2, 3, 4, 5].map((n) =>
      `<label class="wz-opt"><input type="radio" name="opt" value="${n}" ${String(sel) === String(n) ? 'checked' : ''}><span>${n}</span></label>`
    ).join('');
    return `<div class="wz-rating">${cells}</div><div class="wz-scale"><span>${esc(step.scale[0])}</span><span>${esc(step.scale[1])}</span></div>`;
  }

  // ---------- per-render wiring ----------
  function wire(step) {
    // exclusive handling for multi
    if (step.type === 'multi' && step.exclusive) {
      stepEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.addEventListener('change', () => {
          const boxes = [...stepEl.querySelectorAll('input[type="checkbox"]')];
          if (cb.value === step.exclusive && cb.checked) {
            boxes.forEach((b) => { if (b !== cb) b.checked = false; });
          } else if (cb.checked) {
            const ex = boxes.find((b) => b.value === step.exclusive);
            if (ex) ex.checked = false;
          }
        });
      });
    }
    // Auto-advance on a single choice / rating / package pick (Typeform-style).
    // Multi-select, text, dates, contact and consent keep the manual button.
    if (step.type === 'single' || step.type === 'rating' || step.type === 'package') {
      let advTimer;
      stepEl.querySelectorAll('input[name="opt"]').forEach((inp) => {
        inp.addEventListener('change', () => { clearTimeout(advTimer); advTimer = setTimeout(onNext, 280); });
      });
    }
    // Enter advances on text-like inputs
    stepEl.querySelectorAll('input[type="text"],input[type="email"],input[type="tel"]').forEach((el) => {
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); onNext(); } });
    });
    // autofocus first field
    const first = stepEl.querySelector('#f, #email, input[type="text"]');
    if (first) setTimeout(() => first.focus(), 50);
  }

  // ---------- validation + collect ----------
  function collect(step) {
    const id = step.id;
    switch (step.type) {
      case 'intro': case 'section': return { ok: true };
      case 'single': case 'package': {
        const v = stepEl.querySelector('input[name="opt"]:checked');
        if (!v) return { ok: false, err: 'Please choose an option.' };
        A[id] = v.value; return { ok: true };
      }
      case 'rating': {
        const v = stepEl.querySelector('input[name="opt"]:checked');
        if (!v) return { ok: false, err: 'Please pick a number from 1 to 5.' };
        A[id] = v.value; return { ok: true };
      }
      case 'multi': {
        const vals = [...stepEl.querySelectorAll('input[name="opt"]:checked')].map((i) => i.value);
        if (step.required && vals.length < (step.min || 1)) return { ok: false, err: `Please choose at least ${step.min || 1}.` };
        if (step.max && vals.length > step.max) return { ok: false, err: `Please choose no more than ${step.max}.` };
        A[id] = vals; return { ok: true };
      }
      case 'text': case 'textarea': case 'budget': {
        const v = (stepEl.querySelector('#f').value || '').trim();
        if (step.required && v.length < 1) return { ok: false, err: 'This one’s required.' };
        if (step.type === 'budget' && v && !/[0-9]/.test(v)) return { ok: false, err: 'Please enter a number.' };
        A[id] = v; return { ok: true };
      }
      case 'daterange': {
        const from = stepEl.querySelector('#from').value, to = stepEl.querySelector('#to').value;
        if (!from || !to) return { ok: false, err: 'Please choose both dates.' };
        if (to < from) return { ok: false, err: 'Your end date is before your start date.' };
        A.dates = { from, to }; return { ok: true };
      }
      case 'contact': {
        const email = (stepEl.querySelector('#email').value || '').trim();
        const phone = (stepEl.querySelector('#phone').value || '').trim();
        if (!isEmail(email)) return { ok: false, err: 'Please enter a valid email address.' };
        A.email = email; A.phone = phone; return { ok: true };
      }
      case 'consent': {
        if (!stepEl.querySelector('#agree').checked) return { ok: false, err: 'Please agree to the Privacy Policy to continue.' };
        A.consent = true; return { ok: true };
      }
      default: return { ok: true };
    }
  }

  // ---------- navigation ----------
  function onNext() {
    const list = visible();
    const step = list.find((s) => s.id === curId);
    const res = collect(step);
    if (!res.ok) { errEl.textContent = res.err; return; }

    // passport gate
    if (step.id === 'passport' && A.passport === 'No — not yet supported') {
      errEl.textContent = 'Sorry — MisteryTrips currently only serves travellers with a US passport.';
      return;
    }

    // Fire the welcome + admin-alert the moment the email is captured (once).
    if (step.type === 'contact' && A.email && !A._started) {
      A._started = true;
      fetch('/api/quiz/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: A.firstName || '', email: A.email, phone: A.phone || '' }),
      }).catch(() => {});
    }

    if (step.type === 'consent') { submit(); return; }

    const after = visible(); // recompute (answers may have changed branching)
    const i = after.findIndex((s) => s.id === curId);
    const nxt = after[i + 1];
    if (nxt) { curId = nxt.id; window.scrollTo(0, 0); render(); }
  }

  function onBack() {
    const list = visible();
    const i = list.findIndex((s) => s.id === curId);
    if (i > 0) { curId = list[i - 1].id; window.scrollTo(0, 0); render(); }
  }

  nextBtn.addEventListener('click', onNext);
  backBtn.addEventListener('click', onBack);

  // ---------- submit ----------
  function formatValue(step) {
    const v = A[step.id];
    if (step.type === 'rating') return `${v} / 5`;
    if (step.type === 'multi') return (v || []).join(', ');
    if (step.type === 'package') { const o = step.options.find((x) => x.value === v); return o ? `${o.name} (${o.price})` : v; }
    if (step.id === 'dates') return A.dates ? `${A.dates.from} → ${A.dates.to}` : '';
    return v;
  }

  function buildResponses() {
    const out = [];
    visible().forEach((s) => {
      if (['intro', 'section', 'consent', 'contact'].includes(s.type)) return;
      const label = String(fnOr(s.q)).replace(/\s*\*$/, '');
      let val = formatValue(s);
      if (val == null || val === '') val = '—';
      out.push({ label, value: val });
    });
    return out;
  }

  async function submit() {
    nextBtn.disabled = true; backBtn.disabled = true;
    const original = nextBtn.textContent; nextBtn.textContent = 'Sending…';
    errEl.textContent = '';

    const payload = {
      name: A.firstName || '',
      email: A.email || '',
      phone: A.phone || '',
      package: A.package || '',
      privacyConsent: !!A.consent,
      responses: buildResponses(),
    };

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        errEl.textContent = (data.errors && data.errors.join(' ')) || 'Something went wrong. Please try again.';
        nextBtn.disabled = false; backBtn.disabled = false; nextBtn.textContent = original; return;
      }
      document.getElementById('wz-success-email').textContent = A.email;
      if (data.tripId) {
        const t = document.getElementById('wz-success-tripid');
        if (t) t.textContent = data.tripId;
      }
      document.getElementById('wz-success').style.display = 'block';
      window.scrollTo(0, 0);
    } catch (e) {
      errEl.textContent = 'Network error — please check your connection and try again.';
      nextBtn.disabled = false; backBtn.disabled = false; nextBtn.textContent = original;
    }
  }

  render();
})();
