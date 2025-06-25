import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ChallengeService } from '../../services/challenge-service';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { isPlatformBrowser } from '@angular/common';
import { Loading } from '../../components/app-loading/app-loading';

@Component({
  selector: 'app-progress-chart',
  standalone: true,
  imports: [CommonModule, Loading],
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
export class ProgressChart implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('myChart') chartCanvas!: ElementRef;
  private chart: Chart | null = null;
  private subscription: Subscription | null = null;
  private pendingTotal: number | null = null;
  isLoading = true;
  
  private readonly mountainData = [
    {x: 0, y: 0},
    {x: 10000, y: 10000},
    {x: 12500, y: 8000},
    {x: 25000, y: 25000},
    {x: 29000, y: 20000},
    {x: 50000, y: 50000},
    {x: 55000, y: 45000},
    {x: 75000, y: 75000},
    {x: 82000, y: 69000},
    {x: 100000, y: 100000},
    {x: 103000, y: 93000},
    {x: 110000, y: 70000},
  ];

  constructor(
    private challengeService: ChallengeService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.subscription = this.challengeService.totalHM$
        .subscribe(total => {
          this.pendingTotal = total;
          this.isLoading = false;
          if (this.chart) {
            this.updateChart(total);
          }
        });
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeChart(this.pendingTotal || 0);
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private initializeChart(total: number) {
    if (!isPlatformBrowser(this.platformId)) return;
    
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
            data: this.mountainData,
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
            max: 110000
          },
          y: { 
            min: 0,
            max: 120000,
            display: false
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private calculateProgressData(total: number) {
    const progressData = [{x: 0, y: 0}];

    for (let i = 0; i < this.mountainData.length - 1; i++) {
      const start = this.mountainData[i];
      const end = this.mountainData[i + 1];

      if (total >= end.y) {
        progressData.push({x: end.x, y: end.y});
      } else if (total > start.y) {
        const ratio = (total - start.y) / (end.y - start.y);
        progressData.push({x: start.x + ratio * (end.x - start.x), y: total});
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
