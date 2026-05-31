import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export type SandboxSession = {
  userId: string;
  orgId: string;
  email: string;
};

export type SandboxApplicationSummary = {
  id: string;
  name: string;
  updatedAt: string;
  clientId: string;
  hasClientSecret: boolean;
  oauthClientType: string;
  oauthGrantType: string;
};

export type SandboxApplicationDetail = SandboxApplicationSummary & {
  redirectUris: string[];
  description: string | null;
  companyWebsiteUrl: string | null;
  privacyPolicyUrl: string | null;
  applicationTosUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  developmentContacts: string | null;
  logoUploadId: string | null;
  spectraTosAcceptedAt: string | null;
};

export type SandboxApplicationCreateBody = {
  name: string;
  redirectUris: string[];
  acceptSpectraTos: boolean;
  description?: string;
  companyWebsiteUrl?: string;
  privacyPolicyUrl?: string;
  applicationTosUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  developmentContacts?: string;
  logoUploadId?: string;
};

@Injectable({ providedIn: 'root' })
export class SandboxPortalService {
  private readonly http = inject(HttpClient);

  private apiRoot(): string {
    return environment.apiBaseUrl.replace(/\/$/, '');
  }

  session() {
    return this.http.get<SandboxSession>(`${this.apiRoot()}/v1/platform/sandbox/session`);
  }

  listApplications() {
    return this.http.get<{ applications: SandboxApplicationSummary[] }>(
      `${this.apiRoot()}/v1/platform/sandbox/applications`,
    );
  }

  getApplication(id: string) {
    return this.http.get<SandboxApplicationDetail>(
      `${this.apiRoot()}/v1/platform/sandbox/applications/${id}`,
    );
  }

  createApplication(body: SandboxApplicationCreateBody) {
    return this.http.post<{
      id: string;
      name: string;
      clientId: string;
      clientSecret: string;
      updatedAt: string;
    }>(`${this.apiRoot()}/v1/platform/sandbox/applications`, body);
  }

  updateApplication(id: string, body: Partial<SandboxApplicationCreateBody>) {
    return this.http.patch<{ ok: boolean; id: string; updatedAt: string }>(
      `${this.apiRoot()}/v1/platform/sandbox/applications/${id}`,
      body,
    );
  }

  deleteApplication(id: string) {
    return this.http.delete(`${this.apiRoot()}/v1/platform/sandbox/applications/${id}`, {
      observe: 'response',
    });
  }

  rotateClientSecret(id: string) {
    return this.http.post<{ clientSecret: string }>(
      `${this.apiRoot()}/v1/platform/sandbox/applications/${id}/rotate-client-secret`,
      {},
    );
  }

  listIntegrations() {
    return this.http.get<{
      integrations: {
        id: string;
        name: string;
        updatedAt: string;
        clientId: string;
        grantedScopes: string;
      }[];
    }>(`${this.apiRoot()}/v1/platform/sandbox/integrations`);
  }

  createIntegration(body: { name: string; description?: string; grantedScopes?: string }) {
    return this.http.post<{
      id: string;
      name: string;
      clientId: string;
      clientSecret: string;
      grantedScopes: string;
      updatedAt: string;
    }>(`${this.apiRoot()}/v1/platform/sandbox/integrations`, body);
  }

  getIntegration(id: string) {
    return this.http.get<{
      id: string;
      name: string;
      description: string | null;
      updatedAt: string;
      clientId: string;
      grantedScopes: string;
      hasClientSecret: boolean;
    }>(`${this.apiRoot()}/v1/platform/sandbox/integrations/${id}`);
  }

  rotateIntegrationSecret(id: string) {
    return this.http.post<{ clientSecret: string }>(
      `${this.apiRoot()}/v1/platform/sandbox/integrations/${id}/rotate-secret`,
      {},
    );
  }

  deleteIntegration(id: string) {
    return this.http.delete(`${this.apiRoot()}/v1/platform/sandbox/integrations/${id}`, {
      observe: 'response',
    });
  }

  initUpload(body: {
    orgId: string;
    applicationId?: string;
    bytesExpected: number;
    contentType?: string;
    filename?: string;
  }) {
    return this.http.post<{
      uploadId: string;
      s3Bucket: string;
      s3Key: string;
      presignedPutUrl: string;
      expiresAt: string;
    }>(`${this.apiRoot()}/v1/platform/uploads/init`, body);
  }
}
