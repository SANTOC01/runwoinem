import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChallengeConfig } from '../../interfaces/challenge.interface';
import { ToastService } from '../../services/toast-service';
import { roundValue, runDayOptions } from '../../utils/challenge-utils';

export interface FormSubmission {
  name: string;
  value: number;
  /** YYYY-MM-DD, only set for a run on an earlier day. */
  date?: string;
  /** Answer to "several runs at once?"; only set when the question was asked. */
  collection?: boolean;
}

const NAME_KEY = 'runner_name';

/** Browser storage can be blocked: the form then simply starts empty. */
function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name.trim());
  } catch {
    /* ignore */
  }
}

@Component({
  selector: 'app-challenge-form',
  imports: [FormsModule],
  templateUrl: './challenge-form.html',
  styleUrls: ['./challenge-form.scss'],
})
export class ChallengeForm {
  private readonly toast = inject(ToastService);

  readonly config = input.required<ChallengeConfig>();
  /** True while an entry is being saved: the button is disabled to avoid double entries. */
  readonly busy = input(false);
  readonly submitted = output<FormSubmission>();
  readonly valueChanged = output<{ name: string; value: number }>();

  /** The runner's name, remembered from the last entry on this device. */
  name = loadName();
  value: number | null = null;
  /** '' = today. */
  day = '';
  readonly dayOptions = runDayOptions();
  /** The value waiting for the answer to "several runs or one?" (null = no question open). */
  readonly asking = signal<number | null>(null);

  onSubmit() {
    if (this.busy() || !this.name || this.value == null) return;
    const rules = this.config().collections;
    if (rules && roundValue(this.value) > rules.askAbove) {
      this.asking.set(roundValue(this.value));
      return;
    }
    this.emit();
  }

  /** The runner's answer: `true` = several runs logged at once. */
  answer(collection: boolean) {
    this.asking.set(null);
    if (!collection) this.toast.show('Respekt.. 🤨', 2500);
    this.emit(collection);
  }

  cancelQuestion() {
    this.asking.set(null);
  }

  onValueChange() {
    if (this.name && this.value != null) {
      this.valueChanged.emit({ name: this.name, value: this.value });
    }
  }

  private emit(collection?: boolean) {
    if (this.value == null) return;
    saveName(this.name);
    this.submitted.emit({
      name: this.name,
      value: this.value,
      ...(this.day ? { date: this.day } : {}),
      ...(collection === undefined ? {} : { collection }),
    });
    this.day = ''; // the next entry is today's again
  }
}
