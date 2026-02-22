import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavHeader } from './components/nav-header/nav-header';
import { ChallengeService } from './services/challenge-service';
import { KmChallengeService } from './services/km-challenge-service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavHeader],
  template: `
    <app-nav-header></app-nav-header>
    <main class="main-content">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      position: relative;
    }

    .main-content {
      min-height: 100vh;
      width: 100%;
    }
  `]
})
export class App {
  // Injecting both services here ensures they are instantiated (and begin
  // fetching data) at app boot, before any route component renders.
  // This keeps the dashboard widgets populated and prepares km-challenge data
  // for when a widget is added there too.
  constructor(
    private readonly _challenge: ChallengeService,
    private readonly _kmChallenge: KmChallengeService
  ) {}
}