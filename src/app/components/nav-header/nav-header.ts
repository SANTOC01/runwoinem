import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-nav-header',
  imports: [RouterModule],
  templateUrl: './nav-header.html',
  styleUrls: ['./nav-header.scss'],
})
export class NavHeader {
  readonly menuOpen = signal(false);

  toggleMenu() {
    this.menuOpen.update((open) => !open);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }
}
