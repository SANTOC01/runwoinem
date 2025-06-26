import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';

export const routes: Routes = [
  { path: '', component: Dashboard },
  {
    path: 'challenge',
    loadComponent: () => import('./pages/challenge/challenge').then(m => m.Challenge)
  },
];
