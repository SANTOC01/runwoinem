import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Training } from '../../models/training';

const BG_IMAGE_MAP: Record<string, string> = {
  Dauerlauf:   '/assets/images/dauerlauf.png',
  Dauerlauf2:  '/assets/images/dauerlauf2.png',
  Dauerlauf3:  '/assets/images/dauerlauf3.png',
  Intervalle:  '/assets/images/intervalle.png',
  Intervalle2: '/assets/images/intervalle.png',
  Pyramiden:   '/assets/images/pyramiden.png',
  Trail:       '/assets/images/trail.png',
  ABC:         '/assets/images/ABC.png',
  Sprints:     '/assets/images/sprints.png',
};

const STORAGE_KEY = 'trainingPopupShown';

@Component({
  selector: 'app-training-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './training-popup.html',
  styleUrls: ['./training-popup.scss']
})
export class TrainingPopup implements OnInit, OnDestroy {
  show = false;
  fadeOut = false;
  trainingDate = '';
  trainingDescription = '';
  bgImage = '';

  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    const today = new Date().toDateString();
    if (localStorage.getItem(STORAGE_KEY) === today) return;

    this.timers.push(setTimeout(() => this.loadAndShow(), 5000));
  }

  ngOnDestroy() {
    this.timers.forEach(t => clearTimeout(t));
  }

  private async loadAndShow() {
    try {
      const url = `${environment.gipfelstuermerSheetUrl}?action=training`;
      const trainings = await firstValueFrom(this.http.get<Training[]>(url));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const next = trainings
        .map(t => ({ ...t, dateObj: (() => { const d = new Date(t.date); d.setHours(0,0,0,0); return d; })() }))
        .filter(t => t.dateObj >= today)
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())[0];

      if (!next) return;

      this.trainingDate = next.dateObj.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
      this.trainingDescription = next.description;
      this.bgImage = `url('${BG_IMAGE_MAP[next.type] ?? '/assets/images/dauerlauf.png'}')`;
      this.show = true;
      localStorage.setItem(STORAGE_KEY, new Date().toDateString());

      this.timers.push(setTimeout(() => { this.fadeOut = true; }, 9000));
      this.timers.push(setTimeout(() => { this.show = false; }, 13000));
    } catch {
      // Silently fail if training data is unavailable
    }
  }

  close() {
    this.show = false;
  }
}
