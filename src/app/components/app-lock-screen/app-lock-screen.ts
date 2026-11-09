import { Component, NgZone, ElementRef, AfterViewInit, OnDestroy, inject, output, viewChild } from '@angular/core';
import { ToastService } from '../../services/toast-service';

@Component({
  selector: 'app-lock-screen',
  template: `
    <div class="unlock-popup">
      <div class="unlock-content">
        <h2>Entsperren</h2>
        <p>Zeichne das Muster zum Entsperren</p>

        <div class="grid-container" #gridContainer>
          <canvas #patternCanvas></canvas>
          @for (row of [0, 1, 2]; track row) {
            <div class="grid-row">
              @for (col of [1, 2, 3]; track col) {
                <button
                  class="grid-button"
                  [attr.data-value]="row * 3 + col"
                  (mousedown)="handleMouseDown($event)"
                  (touchstart)="handleTouchStart($event)">
                </button>
              }
            </div>
          }
        </div>

        <button class="unlock-cancel" (click)="onCancel()">Abbrechen</button>
      </div>
    </div>
  `,
  styleUrls: ['./app-lock-screen.scss']
})
export class LockScreen implements AfterViewInit, OnDestroy {
  private readonly toastService = inject(ToastService);
  private readonly ngZone = inject(NgZone);

  readonly success = output<void>();
  readonly cancel = output<void>();
  private readonly gridContainer = viewChild.required<ElementRef<HTMLElement>>('gridContainer');
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('patternCanvas');

  private readonly CORRECT_PATTERN = '1-4-7-8-9';
  private inputPattern: string[] = [];
  private isMouseDown = false;
  private isTouchActive = false;
  private lastPoint: { x: number; y: number } | null = null;
  private buttonPositions: { [key: string]: { x: number; y: number } } = {};
  private readonly boundMouseMove = (event: MouseEvent) => this.handleMouseMove(event);
  private readonly boundMouseUp = () => this.handleMouseUp();
  private readonly boundTouchMove = (event: TouchEvent) => this.handleTouchMove(event);
  private readonly boundTouchEnd = () => this.handleTouchEnd();

  ngAfterViewInit() {
    this.setupCanvas();
    this.setupEventListeners();
    this.disableScrolling();
  }

  private setupCanvas() {
    const canvas = this.canvasRef().nativeElement as HTMLCanvasElement;
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

  private setupEventListeners() {

    // Outside Angular's zone: move events fire constantly and must not trigger change detection.
    // Success/cancel are EventEmitters, which are only emitted on pattern completion.
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('mousemove', this.boundMouseMove);
      document.addEventListener('mouseup', this.boundMouseUp);
      document.addEventListener('touchmove', this.boundTouchMove, { passive: false });
      document.addEventListener('touchend', this.boundTouchEnd);
    });
  }

  private disableScrolling() {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  }

  handleMouseDown(event: MouseEvent) {
    this.resetPattern();
    this.isMouseDown = true;
    const button = event.target as HTMLElement;
    this.addPointToPattern(button);
  }

  private handleMouseMove(event: MouseEvent) {
    if (!this.isMouseDown) return;

    const container = this.gridContainer().nativeElement;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.checkIntersection(x, y);
    this.drawLines(x, y);
  }

  private handleMouseUp() {
    if (this.isMouseDown) {
      this.isMouseDown = false;
      this.checkPattern();
      this.resetActiveButtons();
      this.clearCanvas();
    }
  }

  handleTouchStart(event: TouchEvent) {
    event.preventDefault();
    this.resetPattern();
    this.isTouchActive = true;
    const touch = event.touches[0];
    const button = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
    this.addPointToPattern(button);
  }

  private handleTouchMove(event: TouchEvent) {
    event.preventDefault();
    if (!this.isTouchActive) return;

    const touch = event.touches[0];
    const container = this.gridContainer().nativeElement;
    const rect = container.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.checkIntersection(x, y);
    this.drawLines(x, y);
  }

  private handleTouchEnd() {
    if (this.isTouchActive) {
      this.isTouchActive = false;
      this.checkPattern();
      this.resetActiveButtons();
      this.clearCanvas();
    }
  }

  private resetPattern() {
    this.inputPattern = [];
    this.lastPoint = null;
    this.resetActiveButtons();
    this.clearCanvas();
  }

  private resetActiveButtons() {
    const buttons = this.gridContainer().nativeElement.querySelectorAll<HTMLElement>('.grid-button');
    buttons.forEach(button => button.classList.remove('active'));
  }

  private clearCanvas() {
    const canvas = this.canvasRef().nativeElement as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  private addPointToPattern(button: HTMLElement) {
    const value = button?.getAttribute('data-value');
    if (value && !this.inputPattern.includes(value)) {
      this.inputPattern.push(value);
      button.classList.add('active');
      this.lastPoint = this.buttonPositions[value];
      this.drawLines();
    }
  }

  private checkPattern() {
    const enteredPattern = this.inputPattern.join('-');
    // Handlers run outside the zone; re-enter it so the result updates the UI.
    this.ngZone.run(() => {
      if (enteredPattern === this.CORRECT_PATTERN) {
        this.success.emit();
      } else if (this.inputPattern.length > 0) {
        this.toastService.show('Muster falsch, versuche es erneut.');
      }
    });
  }

  onCancel() {
    this.cancel.emit();
  }

  ngOnDestroy() {
    // Remove event listeners using the bound functions
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    document.removeEventListener('touchmove', this.boundTouchMove);
    document.removeEventListener('touchend', this.boundTouchEnd);

    // Reset body styles
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }


  private updateCanvasSize() {
    const canvas = this.canvasRef().nativeElement as HTMLCanvasElement;
    const container = this.gridContainer().nativeElement as HTMLElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
  }



  private storeButtonPositions() {
    const buttons = this.gridContainer().nativeElement.querySelectorAll<HTMLElement>('.grid-button');
    buttons.forEach(button => {
      const rect = button.getBoundingClientRect();
      const containerRect = this.gridContainer().nativeElement.getBoundingClientRect();
      const value = button.getAttribute('data-value');
      if (value) {
        this.buttonPositions[value] = {
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top
        };
      }
    });
  }


  private checkIntersection(x: number, y: number) {
    Object.entries(this.buttonPositions).forEach(([value, pos]) => {
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
      if (distance < 20 && !this.inputPattern.includes(value)) {
        const button = this.gridContainer().nativeElement.querySelector(`[data-value="${value}"]`);
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
    const canvas = this.canvasRef().nativeElement as HTMLCanvasElement;
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

}
