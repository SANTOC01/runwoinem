import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChallengeConfig } from '../../interfaces/challenge.interface';
import { runDayOptions } from '../../utils/challenge-utils';

@Component({
  selector: 'app-challenge-form',
  imports: [FormsModule],
  templateUrl: './challenge-form.html',
  styleUrls: ['./challenge-form.scss'],
})
export class ChallengeForm {
  readonly config = input.required<ChallengeConfig>();
  /** True while an entry is being saved: the button is disabled to avoid double entries. */
  readonly busy = input(false);
  /** `date` (YYYY-MM-DD) is only set for a run on an earlier day. */
  readonly submitted = output<{ name: string; value: number; date?: string }>();
  readonly valueChanged = output<{ name: string; value: number }>();

  name = '';
  value: number | null = null;
  /** '' = today. */
  day = '';
  readonly dayOptions = runDayOptions();

  onSubmit() {
    if (!this.busy() && this.name && this.value != null) {
      this.submitted.emit(
        this.day ? { name: this.name, value: this.value, date: this.day } : { name: this.name, value: this.value },
      );
      this.day = ''; // the next entry is today's again
    }
  }

  onValueChange() {
    if (this.name && this.value != null) {
      this.valueChanged.emit({ name: this.name, value: this.value });
    }
  }
}
