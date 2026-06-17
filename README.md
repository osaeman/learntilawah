# Learn Tilawah — Website

A single-page, fully responsive website for **Learn Tilawah** (online Quran classes).
Built in plain **HTML5 + CSS (BEM) + vanilla JavaScript** — no frameworks, no build step.

## Run it

It's a static site. Just open `index.html` in a browser, or upload the whole folder to any host.
The booking form needs **PHP** on the server (see below); everything else is static.

```
learntilawah/
├── index.html          ← the whole page
├── css/style.css        ← all styles (design tokens at the top)
├── js/script.js         ← nav, slider, scroll reveals, course parallax, form, daily ayah
├── php/send.php         ← form handler (PHPMailer + SMTP)
└── assets/
    ├── logo.svg         ← custom logo (mark + wordmark)
    ├── favicon.svg
    └── og-image.jpg     ← social share preview
```

## What you need to change (the dummy values)

1. **WhatsApp number** — currently `+971 50 000 0000` / `wa.me/971500000000`.
   Find & replace `971500000000` and `+971 50 000 0000` in `index.html`.
2. **Email** — `info@learntilawah.com` is used throughout; replace if different.
3. **SMTP / mail** — open `php/send.php` and replace the `CONFIG` block (host, user,
   password, recipient). Until then the form validates and confirms gracefully.

## Connecting the form (PHPMailer + SMTP)

On the server, install PHPMailer **one** of two ways:

```bash
# Option A — Composer (recommended)
cd php && composer require phpmailer/phpmailer
```

Or **Option B** — download PHPMailer and drop its `src` folder at `php/PHPMailer/src/`.

Then edit the `CONFIG` block at the top of `php/send.php` with your real mailbox details.
`send.php` returns JSON (`{ "ok": true|false, "message": "..." }`) and the front-end handles it.

## Daily Ayah & Hadith

- **Ayah** is fetched live from **AlQuran Cloud** (`api.alquran.cloud`) — Arabic (Uthmani)
  + Saheeh International translation, shown exactly as returned. It rotates **every hour**.
- **Hadith** is fetched from an authentic collection (Sunan Abu Dawud) via the
  `fawazahmed0/hadith-api` CDN. If that source is ever unreachable, the Hadith card
  **hides itself automatically** — the Ayah always stays. (Authenticity over filler.)

No API keys are required.

## Images

The design uses crafted SVG/gradient art and an Islamic geometric motif, so it looks
complete with **zero external photos** and nothing can break. To use real photography
instead, drop images into `assets/img/` and set them as backgrounds on the relevant
elements (e.g. `.slide__art`, `.course-card__art`) using
`background-size: cover; background-position: center;`.

## Notes

- Responsive across mobile / tablet / desktop.
- Accessible: keyboard focus styles, ARIA on nav/accordion/slider, and
  `prefers-reduced-motion` respected (parallax + autoplay disabled).
- SEO: semantic HTML, meta description, Open Graph tags, and JSON-LD structured data.
- Fonts: Cormorant Garamond (display), Plus Jakarta Sans (body), Amiri (Arabic) via Google Fonts.

© 2026 Learn Tilawah. All rights reserved.
