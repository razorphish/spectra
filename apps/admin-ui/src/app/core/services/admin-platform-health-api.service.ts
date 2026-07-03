import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PlatformHealthDto {
  checkedAt: string;
  adminApi: { ok: boolean; database: { configured: boolean; ok: boolean } };
  aviateApi: {
    url: string;
    reachable: boolean;
    status: number | null;
    sandboxAi: boolean | null;
    database: boolean | null;
    error: string | null;
  };
}

@Injectable({ providedIn: 'root' })
export class AdminPlatformHealthApiService {
  private readonly http = inject(HttpClient);

  private base(): string {
    return `${environment.apiBaseUrl.replace(/\/$/, '')}/v1/admin/platform/health`;
  }

  get(): Observable<PlatformHealthDto> {
    return this.http.get<PlatformHealthDto>(this.base());
  }
}
