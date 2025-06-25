import { Component, ElementRef, EventEmitter, Output, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lock-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="unlock-popup">
      <div class="unlock-content">
        <h2>Entsperren</h2>
        <p>Zeichne das Muster zum Entsperren</p>
        
        <div class="grid-container" #gridContainer>
          <canvas #patternCanvas></canvas>
          <div class="grid-row" *ngFor="let row of [0,1,2]">
            <button 
              *ngFor="let col of [1,2,3]" 
              class="grid-button"
              [attr.data-value]="row * 3 + col"
              (mousedown)="handleMouseDown($event)"
              (touchstart)="handleTouchStart($event)">
            </button>
          </div>
        </div>

        <button class="unlock-cancel" (click)="onCancel()">Abbrechen</button>
      </div>
    </div>
  `,
  styleUrls: ['./app-lock-screen.scss']
})
export class LockScreen implements AfterViewInit {
  @Output() success = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @ViewChild('gridContainer') gridContainer!: ElementRef;
  @ViewChild('patternCanvas') canvasRef!: ElementRef;

  private readonly CORRECT_PATTERN = '1-4-7-8-9';
  private inputPattern: string[] = [];
  private isMouseDown = false;
  private isTouchActive = false;
  private lastPoint: { x: number; y: number } | null = null;
  private buttonPositions: { [key: string]: { x: number; y: number } } = {};

  ngAfterViewInit() {
    this.setupCanvas();
    this.setupEventListeners();
  }

  private setupCanvas() {
    const canvas = this.canvasRef.nativeElement as HTMLCanvasElement;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1';
    this.updateCanvasSize();
    this.storeButtonPositions();
  }

  private updateCanvasSize() {
    const canvas = this.canvasRef.nativeElement as HTMLCanvasElement;
    const container = this.gridContainer.nativeElement as HTMLElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
  }

  private setupEventListeners() {
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private storeButtonPositions() {
    const buttons = this.gridContainer.nativeElement.querySelectorAll('.grid-button');
    buttons.forEach((button: HTMLElement) => {
      const rect = button.getBoundingClientRect();
      const containerRect = this.gridContainer.nativeElement.getBoundingClientRect();
      const value = button.getAttribute('data-value');
      if (value) {
        this.buttonPositions[value] = {
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top
        };
      }
    });
  }

  handleMouseDown(event: MouseEvent) {
    this.isMouseDown = true;
    const button = event.target as HTMLElement;
    const value = button.getAttribute('data-value');
    if (value && !this.inputPattern.includes(value)) {
      this.inputPattern.push(value);
      button.classList.add('active');
      this.lastPoint = this.buttonPositions[value];
      this.drawLines();
    }
  }

  private handleMouseMove(event: MouseEvent) {
    if (!this.isMouseDown) return;
    
    const container = this.gridContainer.nativeElement;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this.checkIntersection(x, y);
    this.drawLines(x, y);
  }

  private handleMouseUp() {
    if (this.isMouseDown) {
      this.checkPattern();
    }
    this.resetState();
  }

  handleTouchStart(event: TouchEvent) {
    event.preventDefault();
    this.isTouchActive = true;
    const touch = event.touches[0];
    const button = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
    const value = button?.getAttribute('data-value');
    if (value && !this.inputPattern.includes(value)) {
      this.inputPattern.push(value);
      button.classList.add('active');
      this.lastPoint = this.buttonPositions[value];
      this.drawLines();
    }
  }

  private handleTouchMove(event: TouchEvent) {
    event.preventDefault();
    if (!this.isTouchActive) return;

    const touch = event.touches[0];
    const container = this.gridContainer.nativeElement;
    const rect = container.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.checkIntersection(x, y);
    this.drawLines(x, y);
  }

  private handleTouchEnd() {
    if (this.isTouchActive) {
      this.checkPattern();
    }
    this.resetState();
  }

  private checkIntersection(x: number, y: number) {
    Object.entries(this.buttonPositions).forEach(([value, pos]) => {
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
      if (distance < 20 && !this.inputPattern.includes(value)) {
        const button = this.gridContainer.nativeElement.querySelector(`[data-value="${value}"]`);
        if (button) {
          this.inputPattern.push(value);
          button.classList.add('active');
          this.lastPoint = pos;
          this.drawLines();
        }
      }
    });
  }

  private drawLines(currentX?: number, currentY?: number) {
    const canvas = this.canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#43c6ac';
    ctx.lineWidth = 2;
    ctx.beginPath();

    let lastPoint = null;
    for (const value of this.inputPattern) {
      const point = this.buttonPositions[value];
      if (!lastPoint) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
      lastPoint = point;
    }

    if (lastPoint && (currentX !== undefined && currentY !== undefined)) {
      ctx.lineTo(currentX, currentY);
    }

    ctx.stroke();
  }

  private checkPattern() {
    const enteredPattern = this.inputPattern.join('-');
    if (enteredPattern === this.CORRECT_PATTERN) {
      this.success.emit();
    } else {
      this.showToast('Muster falsch, versuche es erneut.');
      this.resetGridState();
    }
  }

  private resetState() {
    this.isMouseDown = false;
    this.isTouchActive = false;
    this.lastPoint = null;
    if (!this.inputPattern.join('-').includes(this.CORRECT_PATTERN)) {
      this.resetGridState();
    }
  }

  private resetGridState() {
    this.inputPattern = [];
    const buttons = this.gridContainer.nativeElement.querySelectorAll('.grid-button');
    buttons.forEach((button: HTMLElement) => button.classList.remove('active'));
    const canvas = this.canvasRef.nativeElement as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  private showToast(message: string) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  onCancel() {
    this.cancel.emit();
  }

  ngOnDestroy() {
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
  }
}
