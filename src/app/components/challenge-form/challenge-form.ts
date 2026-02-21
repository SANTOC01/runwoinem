import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChallengeConfig } from '../../interfaces/challenge.interface';

@Component({
  selector: 'app-challenge-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './challenge-form.html',
  styleUrls: ['./challenge-form.scss']
})
export class ChallengeForm {
  @Input() config!: ChallengeConfig;
  @Output() submitted = new EventEmitter<{ name: string; value: number }>();
  @Output() valueChanged = new EventEmitter<{ name: string; value: number }>();

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
