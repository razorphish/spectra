import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminSandboxAiApiService {
  private readonly http = inject(HttpClient);

  private base(): string {
    return `${environment.apiBaseUrl.replace(/\/$/, '')}/v1/admin`;
  }

  listModels(): Observable<{ items: unknown[] }> {
    return this.http.get<{ items: unknown[] }>(`${this.base()}/ai-llm-models`);
  }

  listPricingProfiles(): Observable<{ items: unknown[] }> {
    return this.http.get<{ items: unknown[] }>(`${this.base()}/pricing-profiles`);
  }

  listProductionRequests(): Observable<{ items: unknown[] }> {
    return this.http.get<{ items: unknown[] }>(`${this.base()}/ai-endpoint-production-requests`);
  }

  getProductionRequest(id: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.base()}/ai-endpoint-production-requests/${id}`);
  }

  patchProductionRequest(id: string, body: Record<string, unknown>): Observable<unknown> {
    return this.http.patch<unknown>(`${this.base()}/ai-endpoint-production-requests/${id}`, body);
  }

  listRuntimeTenants(): Observable<{ items: unknown[] }> {
    return this.http.get<{ items: unknown[] }>(`${this.base()}/runtime-tenants`);
  }

  patchRuntimeTenant(id: string, body: Record<string, unknown>): Observable<unknown> {
    return this.http.patch<unknown>(`${this.base()}/runtime-tenants/${id}`, body);
  }
}
