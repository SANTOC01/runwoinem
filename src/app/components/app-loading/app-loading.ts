import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading',
  templateUrl: './app-loading.html',
  styleUrls: ['./app-loading.scss']
})
export class Loading {
  readonly isLoading = input(false);
  /** Dim the whole screen behind the spinner (default) or render inline. */
  readonly useOverlay = input(true);
}
