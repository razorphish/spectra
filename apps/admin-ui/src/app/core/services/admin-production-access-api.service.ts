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

  get(id: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base()}/production-access-requests/${id}`);
  }
}
