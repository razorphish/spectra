import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@/environments/environment';

export type ProductionAccessRequestListItem = {
  id: string;
  statusId: string;
  /** `spectra.catalog.name` for `status_id` (e.g. `pending`). */
  statusName: string | null;
  /** `spectra.catalog.description` when set (human phrase). */
  statusDescription: string | null;
  integrationId: string | null;
  integrationName: string | null;
  applicationId: string | null;
  applicationName: string | null;
  submittedByUserId: string;
  submittedByEmail: string | null;
  createdAt: string;
};

export type ProductionAccessRequestDetail = ProductionAccessRequestListItem & {
  orgId: string | null;
  orgName: string | null;
  customerStatusMessage: string | null;
  staffInternalNotes: string | null;
  documents: unknown;
  publicReferenceToken: string | null;
  approvedM2mOauthClientId: string | null;
  approvedProductionOrgId: string | null;
  updatedAt: string;
  createdBy: unknown;
  updatedBy: unknown;
};

export type EndpointApprovalItem = {
  id: string;
  endpointId: string;
  endpointVersionId: string;
  statusId: string;
  createdAt: string | null;
  updatedAt: string | null;
  endpointSlug: string | null;
};

export type ProductionAccessCustomApi = {
  id: string;
  slug: string;
  statusId: string;
  statusName: string | null;
  approvedProductionVersionId: string | null;
  spec: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable({ providedIn: 'root' })
export class AdminProductionAccessApiService {
  private readonly http = inject(HttpClient);

  private base(): string {
    return `${environment.apiBaseUrl.replace(/\/$/, '')}/v1/admin`;
  }

  list(): Observable<{ items: ProductionAccessRequestListItem[] }> {
    return this.http.get<{ items: ProductionAccessRequestListItem[] }>(
      `${this.base()}/production-access-requests`,
    );
  }

  get(id: string): Observable<ProductionAccessRequestDetail> {
    return this.http.get<ProductionAccessRequestDetail>(
      `${this.base()}/production-access-requests/${id}`,
    );
  }

  listCustomApis(
    id: string,
  ): Observable<{ orgId: string | null; items: ProductionAccessCustomApi[] }> {
    return this.http.get<{ orgId: string | null; items: ProductionAccessCustomApi[] }>(
      `${this.base()}/production-access-requests/${id}/custom-apis`,
    );
  }

  listEndpointApprovals(id: string): Observable<{ items: EndpointApprovalItem[] }> {
    return this.http.get<{ items: EndpointApprovalItem[] }>(
      `${this.base()}/production-access-requests/${id}/endpoint-approvals`,
    );
  }

  approve(id: string, note?: string): Observable<ProductionAccessRequestDetail> {
    return this.http.patch<ProductionAccessRequestDetail>(
      `${this.base()}/production-access-requests/${id}`,
      { action: 'approve', ...(note?.trim() ? { note: note.trim() } : {}) },
    );
  }

  revoke(id: string, note?: string): Observable<ProductionAccessRequestDetail> {
    return this.http.patch<ProductionAccessRequestDetail>(
      `${this.base()}/production-access-requests/${id}`,
      { action: 'revoke', ...(note?.trim() ? { note: note.trim() } : {}) },
    );
  }

  invokeCustomApi(parId: string, endpointId: string, body: unknown): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.base()}/production-access-requests/${parId}/custom-apis/${endpointId}/invoke`,
      body,
    );
  }

  update(
    id: string,
    fields: { customerStatusMessage?: string | null; staffInternalNotes?: string | null },
  ): Observable<ProductionAccessRequestDetail> {
    return this.http.patch<ProductionAccessRequestDetail>(
      `${this.base()}/production-access-requests/${id}`,
      { action: 'update', ...fields },
    );
  }
}
