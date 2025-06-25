import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';


export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  {
    path: 'challenge',
    loadComponent: () => import('./pages/challenge/challenge').then(m => m.Challenge),
    canActivate: [
      (route, state) => {
        const isBrowser = typeof window !== 'undefined';
        if (isBrowser && performance.navigation.type === 1) {
          window.location.href = '/dashboard';
          return false;
        }
        return true;
      }
    ]
  },
];
