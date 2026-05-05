# beepboopstudios.com

Static one-pager for BeepBoop Studios LLC. Plain HTML/CSS, no build step.

## Files
- `index.html` — landing
- `privacy.html` — privacy policy (used by app stores)
- `terms.html` — terms of service (used by app stores)
- `favicon.svg` — gradient `BB` mark
- `vercel.json` — security headers + clean URLs

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
Vercel rebuilds in seconds.
