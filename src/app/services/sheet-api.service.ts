import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

/** Thin wrapper around the Google Apps Script backend. */
@Injectable({ providedIn: 'root' })
export class SheetApi {
  private readonly http = inject(HttpClient);
  private readonly url = environment.gipfelstuermerSheetUrl;

  get<T>(action: string, params: Record<string, string | number> = {}): Promise<T> {
    const query = new URLSearchParams({ action });
    for (const [key, value] of Object.entries(params)) query.set(key, String(value));
    return firstValueFrom(this.http.get<T>(`${this.url}?${query}`)).then(unwrap);
  }

  // Apps Script rejects CORS preflights, so the body is sent as text/plain.
  post<T = unknown>(body: Record<string, unknown>): Promise<T> {
    return firstValueFrom(
      this.http.post<T>(this.url, JSON.stringify(body), { headers: { 'Content-Type': 'text/plain' } }),
    ).then(unwrap);
  }
}

/** Apps Script always answers HTTP 200, so backend failures arrive as `{ error }`. */
function unwrap<T>(response: T): T {
  const error = (response as { error?: unknown } | null)?.error;
  if (error) throw new Error(String(error));
  return response;
}
