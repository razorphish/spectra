import { Injectable } from '@angular/core';

/**
 * Browser session for staff admin UI when Auth0 is disabled (local dev).
 * Not a substitute for real authentication — enable Auth0 for any shared environment.
 */
const SESSION_KEY = 'spectra_admin_ui_session';

@Injectable({ providedIn: 'root' })
export class AdminSessionService {
  isLoggedIn(): boolean {
    if (typeof sessionStorage === 'undefined') {
      return false;
    }
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  setLoggedIn(): void {
    sessionStorage.setItem(SESSION_KEY, '1');
  }

  clear(): void {
    sessionStorage.removeItem(SESSION_KEY);
  }
}
