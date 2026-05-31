import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DeveloperPortalUiSettingsDto {
  developerApplicationsUiEnabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminPlatformUiApiService {
  private readonly http = inject(HttpClient);

  private base(): string {
    return `${environment.apiBaseUrl.replace(/\/$/, '')}/v1/admin/platform/developer-portal-ui`;
  }

  get(): Observable<DeveloperPortalUiSettingsDto> {
    return this.http.get<DeveloperPortalUiSettingsDto>(this.base());
  }

  patch(body: DeveloperPortalUiSettingsDto): Observable<DeveloperPortalUiSettingsDto> {
    return this.http.patch<DeveloperPortalUiSettingsDto>(this.base(), body);
  }
}
