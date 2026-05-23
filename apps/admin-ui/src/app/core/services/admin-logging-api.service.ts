import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Mirrors Vital Woman Reset `logs.router` `adminList` row shape (subset used by the UI). */
export interface AdminLogDto {
  id: string;
  level: string;
  message: string;
  context: string | null;
  sessionId: string | null;
  userId: string | null;
  module: string;
  action: string;
  metadata: unknown;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface AdminLogsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminLogsResponse {
  logs: AdminLogDto[];
  pagination: AdminLogsPagination;
}

export interface LoggingSettingDto {
  key: string;
  value: unknown;
}

export interface LoggingSettingsResponse {
  settings: LoggingSettingDto[];
}

export interface ListAdminLogsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  userId?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminLoggingApiService {
  private readonly http = inject(HttpClient);

  private adminBaseUrl(): string {
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    return `${base}/v1/admin`;
  }

  listLogs(params: ListAdminLogsParams = {}): Observable<AdminLogsResponse> {
    let hp = new HttpParams();
    if (params.page != null) hp = hp.set('page', String(params.page));
    if (params.pageSize != null) hp = hp.set('pageSize', String(params.pageSize));
    if (params.search) hp = hp.set('search', params.search);
    if (params.userId) hp = hp.set('userId', params.userId);
    if (params.module) hp = hp.set('module', params.module);
    if (params.startDate) hp = hp.set('startDate', params.startDate);
    if (params.endDate) hp = hp.set('endDate', params.endDate);
    return this.http.get<AdminLogsResponse>(`${this.adminBaseUrl()}/logs`, {
      params: hp,
    });
  }

  getLoggingSettings(): Observable<LoggingSettingsResponse> {
    return this.http.get<LoggingSettingsResponse>(
      `${this.adminBaseUrl()}/logging/settings`,
    );
  }

  putLoggingSetting(key: string, value: unknown): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${this.adminBaseUrl()}/logging/settings`, {
      key,
      value,
    });
  }
}
