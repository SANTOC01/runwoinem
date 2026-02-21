import {
  Component, Input, OnChanges, SimpleChanges,
  ViewChild, ElementRef, AfterViewInit, OnDestroy,
  Inject, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { Loading } from '../../components/app-loading/app-loading';
import { ChallengeConfig } from '../../interfaces/challenge.interface';

@Component({
  selector: 'app-progress-chart',
  standalone: true,
  imports: [Loading],
  template: `
    <div class="chart-container">
      <app-loading [isLoading]="isLoading"></app-loading>
      <canvas #myChart [style.display]="isLoading ? 'none' : 'block'"></canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      width: 100%;
      height: 200px;
      position: relative;
    }
  `]
})
export class ProgressChart implements OnChanges, AfterViewInit, OnDestroy {
  @Input() total = 0;
  @Input() config!: ChallengeConfig;

  @ViewChild('myChart') chartCanvas!: ElementRef;
  private chart: Chart | null = null;
  isLoading = true;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId) && this.config) {
      this.initializeChart(this.total);
      this.isLoading = false;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Chart not initialized yet — ngAfterViewInit will init with the latest value
    if (!this.chart) return;
    if (changes['total']) {
      this.updateChart(this.total);
    }
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private initializeChart(total: number) {
    if (!isPlatformBrowser(this.platformId) || !this.chartCanvas || !this.config) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Fortschritt',
            data: this.calculateProgressData(total),
            borderColor: 'green',
            backgroundColor: 'rgba(0,128,0,0.4)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointBackgroundColor: 'green',
          },
          {
            label: 'Ziele',
            data: this.config.chartProfile,
            borderColor: 'saddlebrown',
            backgroundColor: 'rgba(139, 69, 19, 0.6)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointBackgroundColor: 'saddlebrown',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: this.config.chartMaxScale
          },
          y: {
            min: 0,
            max: this.config.chartMaxScale * 1.1,
            display: false
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private calculateProgressData(total: number) {
    const profile = this.config.chartProfile;
    const progressData: { x: number; y: number }[] = [{ x: 0, y: 0 }];

    for (let i = 0; i < profile.length - 1; i++) {
      const start = profile[i];
      const end = profile[i + 1];

      if (total >= end.y) {
        progressData.push({ x: end.x, y: end.y });
      } else if (total > start.y) {
        const ratio = (total - start.y) / (end.y - start.y);
        progressData.push({ x: start.x + ratio * (end.x - start.x), y: total });
        break;
      } else {
        break;
      }
    }

    return progressData;
  }

  private updateChart(total: number) {
    if (this.chart) {
      this.chart.data.datasets[0].data = this.calculateProgressData(total);
      this.chart.update();
    }
  }
}
