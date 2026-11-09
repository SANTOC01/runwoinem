# Runwoinem - Running Group Webpage

## Project Overview
Runwoinem is a web application designed to help running groups track activities, challenges, and progress. Built with Angular 20, this project demonstrates my ability to develop modern, responsive web applications while expanding my technical stack beyond Java.

## Key Features
- **Activity Dashboard**: Visualizes running statistics and group progress
- **Challenge Management**: Allows users to create and participate in running challenges
- **Leaderboard**: Tracks individual runner's progress
- **Events**: Helps to keep track of incoming events and participants
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## Technologies Used
- **Frontend**: Angular 20, TypeScript 5.8, HTML5, SCSS
- **Backend**: JavaScript, Google Apps Script
- **Visualization**: Chart.js for performance metrics and statistics

## Development Process
This project was created as a self-learning initiative to enhance my frontend skills. As a Java developer, I wanted to expand my knowledge into modern JavaScript frameworks. Key learning objectives included:

- Implementing component-based architecture
- Working with reactive programming patterns
- Developing responsive UIs with modern CSS
- Creating data visualizations for activity metrics

## Future Enhancements
- New Challenges
- Display incoming training-sessions
- Integration with running APIs (Strava)

## Running the Application
```bash
npm install
npm start          # dev server on http://localhost:4200
npm test           # unit tests (Karma + Chrome)
npm run lint       # ESLint
npm run format     # Prettier
npm run build      # production build into dist/site (git-ignored; CI publishes it)
```
The site is live at https://runwoinem.de

## Architecture
- `services/sheet-api.service.ts` – the only place that talks to the Google Apps Script backend.
- `services/base-challenge.service.ts` – shared load / cache / submit / delete / ranking logic.
  A challenge (`challenge-service.ts`, `km-challenge-service.ts`) is just a config plus optional overrides (e.g. the Tuesday boost).
- `services/events-service.ts` – events and participants.
- `services/local-cache.ts` – timestamped localStorage cache used by the services.
- Components use signals (`input()`, `output()`, `computed()`) and `inject()`.
- Pushing to `main` runs lint + tests and then publishes to GitHub Pages (`.github/workflows/deploy.yml`); pull requests run `ci.yml`.
