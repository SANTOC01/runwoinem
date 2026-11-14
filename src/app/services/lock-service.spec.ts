import { LockService } from './lock-service';

describe('LockService', () => {
  it('resolves true on success and hides the screen', async () => {
    const lock = new LockService();
    const unlocked = lock.requestUnlock();
    expect(lock.visible()).toBeTrue();
    lock.handleUnlockSuccess();
    expect(await unlocked).toBeTrue();
    expect(lock.visible()).toBeFalse();
  });

  it('resolves false on cancel', async () => {
    const lock = new LockService();
    const unlocked = lock.requestUnlock();
    lock.handleUnlockCancel();
    expect(await unlocked).toBeFalse();
  });

  it('cancels an open request when a second one starts, instead of leaving it pending', async () => {
    const lock = new LockService();
    const first = lock.requestUnlock();
    const second = lock.requestUnlock();
    expect(await first).toBeFalse();
    expect(lock.visible()).toBeTrue();
    lock.handleUnlockSuccess();
    expect(await second).toBeTrue();
  });
});
