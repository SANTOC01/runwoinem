# Runwoinem – project overview

Website of the running group "Runwoinem" (Weinheim, Germany; runs every Tuesday 18:00 at the Waidsee). UI text is German.
Angular 20 single-page app, no server of its own: data lives in a Google Sheet behind a Google Apps Script API.
Live at https://runwoinem.de (GitHub Pages).

## What the app does
- **Dashboard** (`/`): hero, "next run" bib, meeting-point map lightbox, upcoming events widget, Eurotrip widget, link to the finished Gipfelstürmer challenge.
- **Eurotrip / km challenge** (`/km-challenge`, active): everyone logs km, the group "runs" a loop through Europe (Weinheim → … → Weinheim, 12,310 km) shown on an SVG map with a weather badge per city. Tuesdays count double for the shared total ("Tuesday boost", from 2026-11-10; personal km stay real). Ranking, entries table, personal stats popup, rank-up celebration, personal records and "next target" hints after a submit.
- **Gipfelstürmer challenge** (`/challenge`, ended, read-only): elevation goal of 100,000 HM with a Chart.js progress chart.
- **Events** (`/events`): timeline of upcoming and past races, filter by distance, participant sign-up in a modal.
- Adding or deleting an entry requires drawing an unlock pattern on a lock screen (casual protection only, not real security).

## Architecture (src/app)
- `services/sheet-api.service.ts` – the only HTTP client for the Apps Script backend (`get(action, params)`, `post(body)`, unwraps `{ error }`).
- `services/base-challenge.service.ts` – shared logic for a challenge: load + 5-min localStorage cache, optimistic add/delete (replaced by the server's fresh list when it sends one, rollback by reload on error), rankings, total, chart data, week summary, `saveState` for the saving overlay, submit result (rank-up, records, next target, route arrival/progress). Subclasses only provide `config`, `challengeId`, `cacheKey` and optional overrides (`calculateTotal`, `detectArrival`, `nextStop`).
  - `challenge-service.ts` (id `HM1`), `km-challenge-service.ts` (id `KM1`, boost logic with Berlin time zone).
- `services/events-service.ts` – events, past events per year, participants (caches valid until midnight).
- `services/local-cache.ts` – timestamped localStorage helpers. `lock-service.ts` – `requestUnlock()` promise + visible signal. `toast-service.ts` – simple toast.
- `utils/` – pure helpers (`challenge-utils.ts`: sorting, progress, rank-up/records/next target; `event-utils.ts`: date format, distance filter). `directives/reveal-on-scroll.ts` – scroll-in animation.
- `pages/` – route components (`dashboard`, `challenge`, `km-challenge`, `events-page`; `new-challenge` is an empty placeholder). `components/` – presentational pieces (europe-map with `europe-route.data.ts` waypoints, stats/ranking tables, lock screen, progress chart, …).
- Conventions: standalone components, signals (`input()`, `output()`, `computed()`, `toSignal`), `inject()`, new control flow (`@if/@for`). Output names must not clash with DOM events (`closed`, `cancelled`). `strict` + strictTemplates are on.

## Backend
Google Apps Script bound to the Google Sheet (Extensions → Apps Script). The source is kept locally in `backend/` (git-ignored, so it never reaches GitHub): `Code.gs`, `appsscript.json` and clasp's `.clasp.json` (holds the Script ID). The web app URL is in `src/environments/environment*.ts`.

### API
- Sheet `MainTable` columns: A name · B value · C date (the run's day) · D challenge · E id · F submittedAt · G kind. Rows without an id get one on the next read.
- **Collections** (several runs logged at once, `kind = "collection"`): count for totals, ranking and milestones, but not for run/week analytics (longest run, best week, Ø pro Lauf, distance badges, week pill/trend, Läufer/Aufsteiger). The form asks above `collections.askAbove` (29 km) and stores the answer (`collection` / `single`); older rows without an answer count as a collection above `legacyAbove` (53 km). Same rule in `isCollection` (challenge-utils.ts) and `isCollection_` (Code.gs).
- GET `?action=getAll&challenge=HM1|KM1` → `{ main: [[name, value, date, id, kind], …], week: { total, leader, riser } }`. `week` = Läufer/Aufsteiger der Woche, computed on the server; names in `SPOTLIGHT_SKIP` (in `Code.gs` only, deliberately not in the public frontend) are never picked.
- GET `getEvents`, `getPastEvents[&year=YYYY]`, `training` (not used by the site, kept for compatibility).
- POST (body sent as `text/plain` to avoid a CORS preflight):
  - `add`: `name`, `hohenmeter` (= the value, any unit), `challenge`, optional `date` (`YYYY-MM-DD`, up to 7 days back), optional `kind` (`collection` | `single`). Answers `{ status, entry: [name, value, date, id, kind], main, week }`.
  - `delete`: `id` (preferred) or `name` + `hohenmeter` + `challenge` (old clients). Answers `{ status, main, week }`.
  - `addParticipant`: `eventName`, `participantName`.
- Server-side rules: per-challenge max (`MAX_VALUE_BY_CHALLENGE`), closed challenges (`CLOSED_CHALLENGES`), names reuse the existing spelling, the same entry within 60 s is a retry (not saved twice).
- Values: the sheet keeps exact values (9.6); site and backend round each entry half up (9.5 → 10, 9.4 → 9).
- Apps Script always answers HTTP 200; failures arrive as `{ error }`. Responses are cached (CacheService, generation key bumped by every write and by the `onSheetChange` trigger for manual sheet edits).

### Changing the backend
Tooling: [clasp](https://github.com/google/clasp) (`npm install -g @google/clasp`, then `clasp login` once with the Google account that owns the sheet; the "Google Apps Script API" must be on at https://script.google.com/home/usersettings). Run all clasp commands **inside `backend/`**.

1. **Start from what is online:** `clasp pull` overwrites the local files with the editor version. Do this first if someone may have edited the script in the browser, and compare before overwriting local work.
2. **Edit `backend/Code.gs`.** Keep it compatible with the frontend that is currently live (old clients must keep working), so the backend can go live before the frontend. Quick checks: `node --check` on a `.js` copy; for logic, load the file in Node with small stubs for `Utilities`/`Session`.
3. **Upload:** `clasp push`. This only changes the editor's code (the `@HEAD` test deployment). **The site is not affected yet:** its deployment is pinned to a version.
4. **New permissions?** If the change uses a new Google service (e.g. `ScriptApp`, `UrlFetchApp`, `GmailApp`), the owner must approve it once *before* step 5: in the Apps Script editor pick any function (e.g. `installTriggers`) in the toolbar dropdown and click ▶ Run, then allow the permissions. Otherwise the live web app fails after the switch.
5. **Go live (same URL):** `clasp create-deployment -i <deploymentId> -d "what changed"` creates a new version and points the existing deployment at it. `<deploymentId>` is the `AKfyc…` part of the URL in `src/environments/environment.prod.ts`. Never create a *new* deployment for the site: that gives a new URL.
6. **Verify:** `curl -sL "<url>?action=getAll&challenge=KM1"` must return `{ main, week }`, not `{ error }`; also try `getEvents`.
7. **Roll back** if anything is wrong: `clasp list-deployments` / `clasp list-versions`, then `clasp create-deployment -i <deploymentId> -V <previous version>`.

One-time setup (already done): `installTriggers()` registers the `onSheetChange` edit/change triggers that invalidate the cache after manual sheet edits; run it again only if the triggers are missing (editor → ⏰ Triggers).

Frontend and backend deploy separately: the backend via clasp (above), the site via push to `main` (below). Ship backend changes first and keep the frontend tolerant of both versions (see `MutationResponse` / `EntriesResponse` in `base-challenge.service.ts`).

## Commands
`npm start` · `npm run lint` · `npm run format` / `format:check` (Prettier, ts + scss only) · `npm test -- --watch=false --browsers=ChromeHeadlessNoSandbox` (Karma/Jasmine; set `CHROME_BIN` if Chrome isn't found) · `npm run build` (output `dist/site`, git-ignored).

## Deploy
Push to `main` → `.github/workflows/deploy.yml` runs lint, format check, tests, builds and publishes to GitHub Pages. `ci.yml` runs the checks on pull requests. `src/CNAME` carries the custom domain; `src/404.html` does the SPA redirect for Pages.

## Rules of thumb
- Never commit build output; don't build to "deploy". Don't commit or push unless asked.
- Assets are WebP; keep new images small (≤ ~300 KB).
- Tests live next to the code (`*.spec.ts`); add one for new logic in services/utils.
