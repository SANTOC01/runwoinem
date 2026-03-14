import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';

export const routes: Routes = [
  { path: '', component: Dashboard },
  {
    path: 'challenge',
    loadComponent: () => import('./pages/challenge/challenge').then(m => m.Challenge)
  },
  {
    path: 'km-challenge',
    loadComponent: () => import('./pages/km-challenge/km-challenge').then(m => m.KmChallenge)
  },
  {
    path: 'events',
    loadComponent: () => import('./pages/events-page/events-page').then(m => m.EventsPage)
  },
];
