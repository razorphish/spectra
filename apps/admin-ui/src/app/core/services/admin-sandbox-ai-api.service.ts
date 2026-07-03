import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';

export interface AiLlmModel {
  id: string;
  displayName: string;
  provider: string;
  modelName: string;
  apiBaseUrl: string | null;
  maxTokens: number | null;
  secretRef: string | null;
  statusId: string | null;
  updatedAt: string | null;
}

export interface AiLlmModelInput {
  displayName: string;
  provider: string;
  modelName: string;
  apiBaseUrl?: string | null;
  maxTokens?: number | null;
  secretRef?: string | null;
}

export interface PricingProfile {
  id: string;
  displayName: string;
  policy: Record<string, unknown>;
  statusId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminSandboxAiApiService {
  private readonly http = inject(HttpClient);

  private base(): string {
    return `${environment.apiBaseUrl.replace(/\/$/, '')}/v1/admin`;
  }

  listModels(): Observable<{ items: AiLlmModel[] }> {
    return this.http.get<{ items: AiLlmModel[] }>(`${this.base()}/ai-llm-models`);
  }

  createModel(body: AiLlmModelInput): Observable<AiLlmModel> {
    return this.http.post<AiLlmModel>(`${this.base()}/ai-llm-models`, body);
  }

  patchModel(id: string, body: Partial<AiLlmModelInput>): Observable<AiLlmModel> {
    return this.http.patch<AiLlmModel>(`${this.base()}/ai-llm-models/${id}`, body);
  }

  listPricingProfiles(): Observable<{ items: PricingProfile[] }> {
    return this.http.get<{ items: PricingProfile[] }>(`${this.base()}/pricing-profiles`);
  }

  createPricingProfile(body: {
    displayName: string;
    policy: Record<string, unknown>;
  }): Observable<PricingProfile> {
    return this.http.post<PricingProfile>(`${this.base()}/pricing-profiles`, body);
  }

  patchPricingProfile(
    id: string,
    body: { displayName?: string; policy?: Record<string, unknown> },
  ): Observable<PricingProfile> {
    return this.http.patch<PricingProfile>(`${this.base()}/pricing-profiles/${id}`, body);
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
