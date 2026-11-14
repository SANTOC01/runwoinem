# Project notes

- Deployment is done by GitHub Actions on push to `main` (`.github/workflows/deploy.yml`). Never build "to deploy" and never commit build output.
- `npm run build` writes to `dist/site` (git-ignored). Only run it to check that the production build compiles, not after every change.
- Checks: `npm run lint`, `npm run format:check`, `npm test -- --watch=false --browsers=ChromeHeadlessNoSandbox`.
- Do not commit or push unless asked.

@AGENTS.md
