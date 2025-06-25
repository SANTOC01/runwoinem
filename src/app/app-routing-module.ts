import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Challenge } from './pages/challenge/challenge';
import { Dashboard } from './pages/dashboard/dashboard';

export const routes: Routes = [
  { path: 'dashboard', component: Dashboard },
  { path: 'challenge', component: Challenge },
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}