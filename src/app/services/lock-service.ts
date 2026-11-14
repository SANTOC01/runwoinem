import { Injectable, signal } from '@angular/core';

/** Coordinates the pattern lock screen: callers await `requestUnlock()`. */
@Injectable({ providedIn: 'root' })
export class LockService {
  private readonly _visible = signal(false);
  readonly visible = this._visible.asReadonly();
  private resolveUnlock?: (unlocked: boolean) => void;

  requestUnlock(): Promise<boolean> {
    // A request that is still open (e.g. a double tap) is cancelled, so its caller doesn't hang.
    this.resolveUnlock?.(false);
    this._visible.set(true);
    return new Promise((resolve) => (this.resolveUnlock = resolve));
  }

  handleUnlockSuccess() {
    this.finish(true);
  }

  handleUnlockCancel() {
    this.finish(false);
  }

  private finish(unlocked: boolean) {
    this._visible.set(false);
    this.resolveUnlock?.(unlocked);
    this.resolveUnlock = undefined;
  }
}
