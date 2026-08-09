import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthPlatformSettingsDto {
  jwtClockSkewSeconds: number;
}

@Injectable({ providedIn: 'root' })
export class AdminAuthPlatformApiService {
  private readonly http = inject(HttpClient);

  private base(): string {
    return `${environment.apiBaseUrl.replace(/\/$/, '')}/v1/admin/platform/auth-settings`;
  }

  get(): Observable<AuthPlatformSettingsDto> {
    return this.http.get<AuthPlatformSettingsDto>(this.base());
  }

  patch(body: AuthPlatformSettingsDto): Observable<AuthPlatformSettingsDto> {
    return this.http.patch<AuthPlatformSettingsDto>(this.base(), body);
  }
}
