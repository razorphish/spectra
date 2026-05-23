import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NavSidebarVisibilityDto {
  sidebarNavHiddenMenuKeys: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminNavVisibilityApiService {
  private readonly http = inject(HttpClient);

  private base(): string {
    return `${environment.apiBaseUrl.replace(/\/$/, '')}/v1/admin/nav-sidebar-visibility`;
  }

  getVisibility(): Observable<NavSidebarVisibilityDto> {
    return this.http.get<NavSidebarVisibilityDto>(this.base());
  }

  putVisibility(body: NavSidebarVisibilityDto): Observable<NavSidebarVisibilityDto> {
    return this.http.put<NavSidebarVisibilityDto>(this.base(), body);
  }
}
