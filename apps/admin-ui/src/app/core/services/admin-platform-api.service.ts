import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';

export interface PlatformApiEndpoint {
  key: string;
  method: string;
  path: string;
  group: string;
  displayName: string;
  description: string;
  defaultScope: string | null;
  effectiveScope: string | null;
  isImplemented: boolean;
  isOverridden: boolean;
  status: 'active' | 'planned';
}

export interface PlatformApiCatalogResponse {
  items: PlatformApiEndpoint[];
  knownScopes: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminPlatformApiService {
  private readonly http = inject(HttpClient);

  private base(): string {
    return `${environment.apiBaseUrl.replace(/\/$/, '')}/v1/admin`;
  }

  getApiCatalog(): Observable<PlatformApiCatalogResponse> {
    return this.http.get<PlatformApiCatalogResponse>(`${this.base()}/platform/api-catalog`);
  }

  updateEndpointScope(key: string, scope: string | null): Observable<{ key: string; effectiveScope: string | null; isOverridden: boolean }> {
    return this.http.patch<{ key: string; effectiveScope: string | null; isOverridden: boolean }>(
      `${this.base()}/platform/api-catalog/${encodeURIComponent(key)}`,
      { scope },
    );
  }
}
