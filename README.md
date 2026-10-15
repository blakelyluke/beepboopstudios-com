# beepboopstudios.com

Static one-pager for BeepBoop Studios LLC. Plain HTML/CSS, no build step.

## Files
- `index.html` — landing (inline CSS; the living robot hero, the Level: Adult scene, the time machine)
- `site.js` — the optional fun: robot eyes, blinks, beeps (Web Audio, only after a click),
  screenshot switcher, pointer depth, time machine dial, easter eggs. No libraries, no trackers.
  Everything respects `prefers-reduced-motion`, and the page reads fine without it.
- `privacy.html` — privacy policy (used by app stores; legal text lives inside `<article>`)
- `terms.html` — terms of service (used by app stores; legal text lives inside `<article>`)
- `favicon.svg` — the robot mark; `apple-touch-icon.png` — 180px home screen icon
- `og.png` — 1200x630 link preview image
- `assets/` — optimized WebP art: app icons, Level: Adult screenshots, cutout professors (`cast/`)
- `fonts/` — self hosted latin subsets of Bricolage Grotesque, Silkscreen and Cinzel (SIL OFL, licenses alongside)
- `badge-app-store.svg`, `badge-google-play.svg` — Apple's and Google's official badges, unmodified
- `app-ads.txt`, `google5f78db1f1ce9960f.html` — AdMob and Search Console verification (do not change)
- `vercel.json` — security headers + clean URLs

## Easter eggs
- Click (or tap) the robot five times fast: party mode.
- Konami code (↑ ↑ ↓ ↓ ← → ← → B A): cheat code accepted, shades on.
- Type "beep" anywhere: the robot answers.

## Deploy

1. Create a new GitHub repo (e.g. `beepboopstudios-com`) and push this folder.
2. Connect the repo to Vercel — auto-detects as a static site, no config needed.
3. Add `beepboopstudios.com` (and `www.beepboopstudios.com`) as custom domains in
   Vercel project settings.
4. Update DNS at your registrar:
   - `@` → A record `76.76.21.21`
   - `www` → CNAME `cname.vercel-dns.com`
5. Wait for DNS to propagate; Vercel issues SSL automatically.

## Editing

Open any file in a browser to preview locally — no server needed. Edit, push,
Vercel rebuilds in seconds. (Browsers block self hosted fonts on `file://`, so for a
true preview run a tiny static server in this folder, e.g. `npx serve`.)
