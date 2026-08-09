import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IntegrationListItemDto {
  id: string;
  name: string;
  description: string | null;
  orgId: string;
  orgName: string;
  clientId: string | null;
  statusId: string;
  statusName: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: unknown;
  updatedBy: unknown;
}

export interface IntegrationsListResponseDto {
  page: number;
  pageSize: number;
  total: number;
  items: IntegrationListItemDto[];
}

export interface IntegrationDetailResponseDto {
  integration: {
    id: string;
    name: string;
    description: string | null;
    orgId: string;
    statusId: string;
    statusName: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    createdBy: unknown;
    updatedBy: unknown;
  };
  organization: { id: string; name: string };
  m2mClient: {
    id: string;
    clientId: string;
    grantedScopes: string;
    statusId: string;
    statusName: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    createdBy: unknown;
    updatedBy: unknown;
  } | null;
  isDeleted: boolean;
}

export interface TokenIssuanceItemDto {
  id: string;
  jti: string;
  m2mOauthClientId: string;
  orgId: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  createdBy: unknown;
}

export interface TokenIssuanceListResponseDto {
  page: number;
  pageSize: number;
  total: number;
  items: TokenIssuanceItemDto[];
}

export interface M2mTokenActivityResponseDto {
  windowDays: number;
  since: string;
  totalIssuances: number;
  byOrg: { orgId: string; orgName: string; count: number }[];
}

@Injectable({ providedIn: 'root' })
export class AdminIntegrationsApiService {
  private readonly http = inject(HttpClient);

  private adminBaseUrl(): string {
    return `${environment.apiBaseUrl.replace(/\/$/, '')}/v1/admin`;
  }

  listIntegrations(params: {
    page?: number;
    pageSize?: number;
    q?: string;
    orgId?: string;
  }): Observable<IntegrationsListResponseDto> {
    let hp = new HttpParams();
    if (params.page != null) hp = hp.set('page', String(params.page));
    if (params.pageSize != null) hp = hp.set('pageSize', String(params.pageSize));
    if (params.q?.trim()) hp = hp.set('q', params.q.trim());
    if (params.orgId?.trim()) hp = hp.set('orgId', params.orgId.trim());
    return this.http.get<IntegrationsListResponseDto>(`${this.adminBaseUrl()}/integrations`, {
      params: hp,
    });
  }

  getIntegration(integrationId: string): Observable<IntegrationDetailResponseDto> {
    return this.http.get<IntegrationDetailResponseDto>(
      `${this.adminBaseUrl()}/integrations/${encodeURIComponent(integrationId)}`,
    );
  }

  listTokenIssuance(
    integrationId: string,
    params: { page?: number; pageSize?: number; from?: string; to?: string },
  ): Observable<TokenIssuanceListResponseDto> {
    let hp = new HttpParams();
    if (params.page != null) hp = hp.set('page', String(params.page));
    if (params.pageSize != null) hp = hp.set('pageSize', String(params.pageSize));
    if (params.from?.trim()) hp = hp.set('from', params.from.trim());
    if (params.to?.trim()) hp = hp.set('to', params.to.trim());
    return this.http.get<TokenIssuanceListResponseDto>(
      `${this.adminBaseUrl()}/integrations/${encodeURIComponent(integrationId)}/token-issuance`,
      { params: hp },
    );
  }

  getM2mTokenActivity(days?: number): Observable<M2mTokenActivityResponseDto> {
    const d = days != null ? Math.min(90, Math.max(1, days)) : 7;
    return this.http.get<M2mTokenActivityResponseDto>(`${this.adminBaseUrl()}/m2m/token-activity`, {
      params: new HttpParams().set('days', String(d)),
    });
  }

  downloadExport(integrationId: string, format: 'json' | 'csv'): Observable<Blob> {
    return this.http.get(
      `${this.adminBaseUrl()}/integrations/${encodeURIComponent(integrationId)}/export`,
      {
        params: new HttpParams().set('format', format),
        responseType: 'blob',
      },
    );
  }
}
