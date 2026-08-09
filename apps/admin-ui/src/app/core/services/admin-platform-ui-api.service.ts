import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DeveloperPortalUiSettingsDto {
  developerApplicationsUiEnabled: boolean;
}

export interface SandboxAiPlatformSettingsDto {
  endpointsEnabled: boolean;
  defaultLlmModelId: string | null;
  defaultPricingProfileId: string | null;
  precheckEnabled: boolean;
  approvalAutomationEnabled: boolean;
  machineAutoApproveEnabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminPlatformUiApiService {
  private readonly http = inject(HttpClient);

  private base(): string {
    return `${environment.apiBaseUrl.replace(/\/$/, '')}/v1/admin/platform/developer-portal-ui`;
  }

  private platformBase(): string {
    return `${environment.apiBaseUrl.replace(/\/$/, '')}/v1/admin/platform`;
  }

  get(): Observable<DeveloperPortalUiSettingsDto> {
    return this.http.get<DeveloperPortalUiSettingsDto>(this.base());
  }

  patch(body: DeveloperPortalUiSettingsDto): Observable<DeveloperPortalUiSettingsDto> {
    return this.http.patch<DeveloperPortalUiSettingsDto>(this.base(), body);
  }

  getSandboxAi(): Observable<SandboxAiPlatformSettingsDto> {
    return this.http.get<SandboxAiPlatformSettingsDto>(`${this.platformBase()}/sandbox-ai-settings`);
  }

  patchSandboxAi(
    body: Partial<SandboxAiPlatformSettingsDto>,
  ): Observable<SandboxAiPlatformSettingsDto> {
    return this.http.patch<SandboxAiPlatformSettingsDto>(
      `${this.platformBase()}/sandbox-ai-settings`,
      body,
    );
  }
}
