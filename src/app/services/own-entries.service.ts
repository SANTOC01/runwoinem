import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'own_entries';
/** Entries stay deletable from this device for a week (as long as runs may be backdated). */
const OWN_FOR_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Remembers which entries were submitted from this device (id -> submitted at), so they can be
 * deleted again even when a backdated run is no longer the newest row of the table.
 */
@Injectable({ providedIn: 'root' })
export class OwnEntriesService {
  private readonly entries = signal<Record<string, number>>(load());

  /** Whether this device submitted the entry within the last week. */
  isOwn(id: string | undefined): boolean {
    const at = id ? this.entries()[id] : undefined;
    return at !== undefined && Date.now() - at < OWN_FOR_MS;
  }

  add(id: string): void {
    this.update({ ...this.entries(), [id]: Date.now() });
  }

  remove(id: string): void {
    if (!(id in this.entries())) return;
    const rest = { ...this.entries() };
    delete rest[id];
    this.update(rest);
  }

  private update(entries: Record<string, number>): void {
    const fresh = withoutExpired(entries);
    this.entries.set(fresh);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      /* storage blocked: remembered for this visit only */
    }
  }
}

function withoutExpired(entries: Record<string, number>): Record<string, number> {
  const now = Date.now();
  return Object.fromEntries(Object.entries(entries).filter(([, at]) => now - at < OWN_FOR_MS));
}

/** Browser storage can be blocked or hold garbage: then nothing counts as own. */
function load(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const valid = Object.entries(parsed).filter(([, at]) => typeof at === 'number');
    return withoutExpired(Object.fromEntries(valid) as Record<string, number>);
  } catch {
    return {};
  }
}
