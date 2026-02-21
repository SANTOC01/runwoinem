import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-next-challenge-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './next-challenge-banner.html',
  styleUrls: ['./next-challenge-banner.scss']
})
export class NextChallengeBanner {
  @Input() title = 'Nächste Challenge';
  @Input() description = 'Bleibt dran – die nächste Challenge kommt bald!';
}
