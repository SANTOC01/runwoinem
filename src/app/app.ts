import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavHeader } from './components/nav-header/nav-header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavHeader],
  template: `
    <app-nav-header />
    <main class="main-content">
      <router-outlet />
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        position: relative;
      }

      .main-content {
        min-height: 100vh;
        width: 100%;
      }
    `,
  ],
})
export class App {}
