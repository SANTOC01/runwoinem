import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChallengeConfig } from '../../interfaces/challenge.interface';

@Component({
  selector: 'app-challenge-form',
  imports: [FormsModule],
  templateUrl: './challenge-form.html',
  styleUrls: ['./challenge-form.scss'],
})
export class ChallengeForm {
  readonly config = input.required<ChallengeConfig>();
  readonly submitted = output<{ name: string; value: number }>();
  readonly valueChanged = output<{ name: string; value: number }>();

  name = '';
  value: number | null = null;

  onSubmit() {
    if (this.name && this.value != null) {
      this.submitted.emit({ name: this.name, value: this.value });
    }
  }

  onValueChange() {
    if (this.name && this.value != null) {
      this.valueChanged.emit({ name: this.name, value: this.value });
    }
  }
}
