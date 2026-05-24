import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MigrationPathsDto {
  migrationsFolder: string;
  journalPath: string;
  snapshotFolder: string;
}

export interface MigrationStatusDto {
  totalApplied: number;
  totalAvailable: number;
  pending: number;
  lastMigrationAt: string | null;
}

export interface MigrationCheckDto {
  isValid: boolean;
  method: string;
  hasGaps: boolean;
  pendingCount: number;
  orphanDbHashes: string[];
  message: string | null;
}

export interface MigrationRowDto {
  idx: number;
  tag: string;
  hash: string;
  status: 'applied' | 'pending';
  when: string | null;
}

export interface MigrationsInventoryDto {
  paths: MigrationPathsDto;
  status: MigrationStatusDto;
  check: MigrationCheckDto;
  rows: MigrationRowDto[];
}

export interface MigrationSqlDto {
  path: string;
  sql: string;
  hash: string;
  hashDisplay: string;
  byteSize: number;
  lineCount: number;
  idempotent: boolean;
  idempotentBasis: 'manifest' | 'heuristic';
  schemaMigration: boolean;
}

export interface MigrationRollbackGuideDto {
  tag: string;
  bullets: string[];
  sqlPreview: string | null;
}

export interface MigrationsRunnerConfigDto {
  useSharedHttpClient: boolean;
  fromDatabase: boolean;
  environmentDefault: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminMigrationsApiService {
  private readonly http = inject(HttpClient);

  private adminBaseUrl(): string {
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    return `${base}/v1/admin`;
  }

  getInventory(): Observable<MigrationsInventoryDto> {
    return this.http.get<MigrationsInventoryDto>(`${this.adminBaseUrl()}/migrations`);
  }

  getSql(tag: string): Observable<MigrationSqlDto> {
    const params = new HttpParams().set('tag', tag);
    return this.http.get<MigrationSqlDto>(`${this.adminBaseUrl()}/migrations/sql`, {
      params,
    });
  }

  getRollbackGuide(tag: string): Observable<MigrationRollbackGuideDto> {
    const params = new HttpParams().set('tag', tag);
    return this.http.get<MigrationRollbackGuideDto>(
      `${this.adminBaseUrl()}/migrations/rollback-guide`,
      { params },
    );
  }

  getRunnerConfig(): Observable<MigrationsRunnerConfigDto> {
    return this.http.get<MigrationsRunnerConfigDto>(`${this.adminBaseUrl()}/migrations/runner-config`);
  }

  putRunnerConfig(useSharedHttpClient: boolean): Observable<MigrationsRunnerConfigDto> {
    return this.http.put<MigrationsRunnerConfigDto>(`${this.adminBaseUrl()}/migrations/runner-config`, {
      useSharedHttpClient,
    });
  }

  deleteRunnerConfig(): Observable<MigrationsRunnerConfigDto> {
    return this.http.delete<MigrationsRunnerConfigDto>(`${this.adminBaseUrl()}/migrations/runner-config`);
  }

  runMigrations(
    scope: 'pending' | 'all' | 'single',
    tag?: string,
  ): Observable<{ ok: boolean; inventory: MigrationsInventoryDto; hashRepairedTags?: string[] }> {
    return this.http.post<{
      ok: boolean;
      inventory: MigrationsInventoryDto;
      hashRepairedTags?: string[];
    }>(`${this.adminBaseUrl()}/migrations/run`, { scope, ...(tag ? { tag } : {}) });
  }

  deleteMigrationRecord(tag: string): Observable<{ ok: boolean; inventory: MigrationsInventoryDto }> {
    return this.http.delete<{ ok: boolean; inventory: MigrationsInventoryDto }>(
      `${this.adminBaseUrl()}/migrations/record`,
      { body: { tag } },
    );
  }
}
