import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LockService {
  private showLockScreen = new BehaviorSubject<boolean>(false);
  private resolveUnlock?: (value: boolean) => void;

  showLockScreen$ = this.showLockScreen.asObservable();

  async requestUnlock(): Promise<boolean> {
    this.showLockScreen.next(true);
    
    return new Promise((resolve) => {
      this.resolveUnlock = resolve;
    });
  }

  handleUnlockSuccess() {
    this.showLockScreen.next(false);
    if (this.resolveUnlock) {
      this.resolveUnlock(true);
      this.resolveUnlock = undefined;
    }
  }

  handleUnlockCancel() {
    this.showLockScreen.next(false);
    if (this.resolveUnlock) {
      this.resolveUnlock(false);
      this.resolveUnlock = undefined;
    }
  }
}
