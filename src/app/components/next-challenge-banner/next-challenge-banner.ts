import { Component, input } from '@angular/core';

@Component({
  selector: 'app-next-challenge-banner',
  templateUrl: './next-challenge-banner.html',
  styleUrls: ['./next-challenge-banner.scss'],
})
export class NextChallengeBanner {
  readonly title = input('Nächste Challenge');
  readonly description = input('Bleibt dran – die nächste Challenge kommt bald!');
}
