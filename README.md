# OMB Gas Service

A phone-first web app (PWA) for gas safety, boiler service, Legionella and air-con records, warning notices, invoices, tools, boiler quotes and a calendar. No build step: plain JavaScript, CSS and jsPDF, served as static files (GitHub Pages) with a Supabase back end for logins, sync and subscriptions.

Live app: https://app.ombgas.com · Setup of the back end: see `SETUP.md`.

## Layout

| File | What it holds |
| --- | --- |
| `index.html`, `style.css`, `manifest.json`, `sw.js` | Shell, styles, install manifest, offline cache |
| `app.js` | State, screens, forms, customers, invoices, quotes, settings, backup |
| `cal.js` | Calendar: appointments, booking form, exports, "on my way" text |
| `cloud.js` | Login, subscription state and two-way sync with Supabase |
| `*-config.js` | Form definitions (gas, service, Legionella, air con, commissioning, quotes, warnings) |
| `pdf*.js` | One PDF builder per document type (jsPDF) |
| `tools.js`, `reminders.js`, `photos.js`, `addr.js`, `sample.js` | Calculators, annual-check reminders, photo store, address helpers, sample data |
| `help.js`, `changelog.js` | In-app Help guide and What's new |
| `backend/` | Database schema and edge functions |
| `tests/run.py` | End-to-end test suite |

Scripts are plain `<script>` tags that share globals, loaded in the order listed in `index.html`.

## Tests

```
python3 -m http.server 8765 &
pip install playwright && playwright install chromium
python3 tests/run.py
```

The suite opens every screen, builds every PDF type, and exercises customers, invoices, quotes, the calendar, sync handling, backup and restore, the Help guide and offline start-up. It exits non-zero if anything fails.

## Releasing

1. Bump `APP_VERSION` in `app.js` and `CACHE` in `sw.js` together (for example `v145` and `omb-gas-v145`), add a `changelog.js` entry (newest first), and add any new file to the `FILES` list in `sw.js`.
2. Run `python3 tests/run.py`.
3. Push to `main`. When the GitHub Pages build shows its green tick, use Settings → App → Update app now on each device.

Changes that are not yet pushed share one version number; the next number is used only after a push.
