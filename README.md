# Ghost's Kingshot Tools — Cloudflare Pages edition

This is an independent, static website prepared for the Cloudflare Pages **Free** plan.

## Contents

- `index.html` — main website
- `styles.css` — green/black responsive website design
- `app.js` — navigation and client-side tool functionality
- `assets/` — Kingshot-themed card artwork and bear emblem

There is **no npm build, no installation, no server, no database and no API key required**. Upload this ZIP as-is to **Cloudflare Pages > Direct Upload**.

## What works in this version

- Responsive desktop and mobile home page with six illustrated tools
- A first-visitor profile creator (no predefined Ghost profile)
- Multiple profiles per browser with editable player name, power, level, kingdom, alliance and avatar
- Local profile export/import, including the Floot site's `kingshot-floot-v1` JSON backups
- UTC time-zone converter, automatically handling daylight saving
- Manual minister/appointment tracking saved per local profile (not a real Kingshot booking)
- Message Creator, templates, a 512-character and 10-line counter, copy and per-profile drafts
- Searchable library of community-reported Kingshot Unicode characters with Insert and Copy
- Viking Vengeance capacity setup: normal march capacity, Infantry/Cavalry counts, optional Mighty Bison R1–R10, 10%/20% capacity boost, Marshal +2,500; all buffs default to None
- Four game-calculator pages and save-to-profile preferences. Their detailed game formulas are intentionally not yet added.

## Limitations and important notes

The original Floot service did not make every newer source file available under its current Free-plan daily usage quota. This independent version was reconstructed from a previously saved website package and the changes specified in the conversation. The appointment page is a manual planner, **not** a verified one-to-one implementation of Floot's original appointment system.

All information is kept in your browser's local storage (on the user's own device). Different visitors will not see each other's profiles. There are **no accounts** and no cross-device synchronization. A different domain will not share Floot's saved browser data. Users who want their original Floot profile should use the old site's Settings > Export Backup (JSON), then use Settings > Import Backup on the new Cloudflare site.

The unicode character labels are community-reported; the game may handle these differently across versions. The Viking buff stacking formula and the detailed squad calculation rules still need validation and implementation. No game mechanic is guaranteed by the placeholder calculators.

## Publish on Cloudflare Pages (once)

1. Sign into https://dash.cloudflare.com/ (a free Cloudflare account is enough).
2. Select **Workers & Pages** > **Create application** > **Pages** > **Direct Upload** (wording may vary).
3. Choose project name `ghosts-kingshot-tools` if available.
4. Upload the file `ghosts-kingshot-tools-cloudflare.zip` (the ZIP itself, without extracting).
5. Click **Deploy site**. Cloudflare will provide a live `.pages.dev` address.

Reference: https://developers.cloudflare.com/pages/get-started/direct-upload/

When another change is finished, upload a newly prepared ZIP as a new deployment in the same Pages project. Cloudflare Pages Direct Upload does not need a GitHub account. If you later prefer automated publishing, a separate Git-integrated Pages project can be created.

Do not unpublish the original Floot website until you have personally confirmed that the replacement works and migrated any saved profile backups you want to keep.