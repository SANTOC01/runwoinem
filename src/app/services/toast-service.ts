import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private hideTimer?: ReturnType<typeof setTimeout>;

  show(message: string, duration = 3000) {
    if (message.includes('🟢')) {
      duration = 1000;
    }

    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      // Announced politely by screen readers.
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');

    // A newer toast must not be hidden by the timer of an older one.
    clearTimeout(this.hideTimer);
    const el = toast;
    this.hideTimer = setTimeout(() => el.classList.remove('show'), duration);
  }
}
