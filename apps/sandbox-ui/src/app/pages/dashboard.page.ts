import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { catchError, from, map, mergeMap, of, toArray } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  SandboxApplicationSummary,
  SandboxPortalService,
  SandboxSession,
} from '../services/sandbox-portal.service';

type SandboxIntegrationSummary = {
  id: string;
  name: string;
  updatedAt: string;
  clientId: string;
  grantedScopes: string;
};

/** Which primary block fills the dashboard main column. */
type DashboardMainPanel = 'overview' | 'integrations' | 'approvals';

/** Integrations that already have a production access request (GET returns 200). */
type ParApprovalRow = {
  integrationId: string;
  integrationName: string;
  requestId: string;
  statusId: string;
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  selector: 'sandbox-dashboard',
  imports: [RouterLink, DatePipe],
  template: `
    <main class="spectra-page sandbox-dashboard">
      <header class="dash-head">
        <div>
          <h1>Developer dashboard</h1>
          <p class="lede">
            @if (developerApplicationsUiEnabled()) {
              Manage sandbox applications and integrations.
            } @else {
              Manage integrations and API credentials.
            }
          </p>
        </div>
        <div class="dash-actions">
          @if (developerApplicationsUiEnabled()) {
            <a routerLink="/applications/new" class="btn btn-primary">Add an application</a>
          }
          <a routerLink="/integrations/new" class="btn btn-primary">New integration</a>
        </div>
      </header>

      @if (error()) {
        <p class="spectra-auth-error">{{ error() }}</p>
      }

      <div class="spectra-doc-layout dash-doc-layout">
        <aside class="spectra-doc-sidebar" aria-label="Page sections">
          <nav class="spectra-doc-nav">
            <a class="spectra-doc-nav-link" href="#dash-overview" (click)="onOverviewNavClick($event)">Overview</a>
            @if (developerApplicationsUiEnabled()) {
              <a class="spectra-doc-nav-link" href="#dash-applications" (click)="onApplicationsNavClick($event)">Applications</a>
            }
            <a class="spectra-doc-nav-link" href="#dash-integrations" (click)="onIntegrationsNavClick($event)">Integrations</a>
            @if (productionAccessPortalEnabled()) {
              <a class="spectra-doc-nav-link" href="#dash-approvals" (click)="onApprovalsNavClick($event)">Approvals</a>
            }
            @if (sandboxAiEndpointsEnabled()) {
              <a class="spectra-doc-nav-link" routerLink="/custom-endpoints">Custom API endpoints</a>
            }
          </nav>
        </aside>

        <div class="spectra-doc-main">
          <div class="int-card">
            @if (docMainPanel() === 'overview') {
            <section id="dash-overview" class="spectra-doc-section" aria-labelledby="dash-overview-heading">
              <h2 id="dash-overview-heading" class="spectra-doc-section-heading">Overview</h2>
              @if (sessionError(); as se) {
                <p class="form-error">{{ se }}</p>
              } @else {
                <h3 id="dash-environment" class="spectra-doc-subheading">Environment &amp; session</h3>
                <p class="context-line">
                  <span class="env-badge">{{ customerSandboxLabel() }}</span>
                  @if (sandboxSession(); as sess) {
                    <span class="ctx-meta">
                      Signed in as <strong>{{ sess.email }}</strong>
                      · Org <code>{{ sess.orgId }}</code>
                    </span>
                  }
                </p>
                @if (swaggerDocsUrl(); as sw) {
                  <h3 id="dash-api-reference" class="spectra-doc-subheading">Public API reference</h3>
                  <p class="context-swagger">
                    <a [href]="sw" target="_blank" rel="noopener noreferrer">{{ sw }}</a>
                    <button type="button" class="btn btn-link btn-sm" (click)="copy(sw)">Copy URL</button>
                  </p>
                }
                <h3 id="dash-choose-path" class="spectra-doc-subheading">Choose a path</h3>
                <p class="context-path-hint">
                  <strong>New integration</strong> for server-to-server <code>client_credentials</code>.
                  @if (developerApplicationsUiEnabled()) {
                    Use <strong>Add an application</strong> for redirect-based OAuth when a user signs in through your app.
                  } @else {
                    Sandbox applications are disabled for your org — use integrations for API access.
                  }
                </p>
                @if (sandboxAiEndpointsEnabled()) {
                  <p class="context-path-hint">
                    <a routerLink="/custom-endpoints">Custom API endpoints</a> — draft and preview org-private sandbox
                    APIs (staff approval for production).
                  </p>
                }
              }
            </section>

            @if (developerApplicationsUiEnabled()) {
              <section id="dash-applications" class="spectra-doc-section" aria-labelledby="dash-apps-heading">
                <h2 id="dash-apps-heading" class="spectra-doc-section-heading">My Sandbox Apps</h2>
                @if (loading()) {
                  <p>Loading…</p>
                } @else if (apps().length === 0) {
                  <p class="text-muted">No applications yet. Create one to get a client ID and secret.</p>
                } @else {
                  <table class="apps-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Updated</th>
                        <th>Client ID</th>
                        <th>Client secret</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of apps(); track row.id) {
                        <tr>
                          <td>{{ row.name }}</td>
                          <td>{{ row.updatedAt | date: 'medium' }}</td>
                          <td>
                            <input
                              readonly
                              class="form-control form-control-compact font-monospace"
                              type="text"
                              [value]="row.clientId"
                              (click)="copy(row.clientId)"
                              title="Click to copy client ID"
                            />
                          </td>
                          <td>
                            <input
                              readonly
                              class="form-control form-control-compact font-monospace"
                              type="text"
                              value="••••••••••••••••"
                              title="Secret is only shown once when the app is created"
                              (click)="copyHint()"
                            />
                          </td>
                          <td class="actions actions-icon-row">
                            <button
                              type="button"
                              class="icon-btn"
                              title="Open application details"
                              aria-label="Open application details"
                              [routerLink]="['/applications', row.id]"
                            >
                              <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              class="icon-btn"
                              title="Edit application"
                              aria-label="Edit application"
                              [routerLink]="['/applications', row.id, 'edit']"
                            >
                              <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                }
              </section>
            }
            }

            @if (docMainPanel() === 'approvals') {
            <section id="dash-approvals" class="spectra-doc-section" aria-labelledby="dash-par-heading">
              <h2 id="dash-par-heading" class="spectra-doc-section-heading">Approvals</h2>
              <p class="text-muted small mb-3">
                Integrations with a submitted <strong>production access</strong> request. Open an integration to see
                status, staff messages, and questionnaire details on the <strong>Production access</strong> tab.
              </p>
              @if (parListError(); as ple) {
                <p class="spectra-auth-error">{{ ple }}</p>
              }
              @if (parListLoading()) {
                <p>Loading…</p>
              } @else if (parApprovalRows().length === 0) {
                <p class="text-muted">
                  No production access requests yet. Submit one from an integration’s
                  <strong>Production access</strong> tab.
                </p>
              } @else {
                <table class="apps-table">
                  <thead>
                    <tr>
                      <th>Integration</th>
                      <th>Request ID</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of parApprovalRows(); track row.requestId) {
                      <tr>
                        <td>{{ row.integrationName }}</td>
                        <td><code class="font-monospace small">{{ row.requestId }}</code></td>
                        <td>
                          <span [attr.title]="row.statusId">{{ parStatusLabel(row.statusId) }}</span>
                        </td>
                        <td class="actions actions-icon-row">
                          <button
                            type="button"
                            class="icon-btn"
                            title="Open production access tab for this integration"
                            aria-label="Open production access tab for this integration"
                            [routerLink]="['/integrations', row.integrationId, 'production-access']"
                          >
                            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </section>
            }

            @if (docMainPanel() === 'integrations') {
            <section id="dash-integrations" class="spectra-doc-section" aria-labelledby="dash-int-heading">
              <h2 id="dash-int-heading" class="spectra-doc-section-heading">Integrations</h2>
              @if (integrationsDocHref(); as docHref) {
                <p class="integrations-doc-link">
                  <a [href]="docHref" target="_blank" rel="noopener noreferrer">What are integrations?</a>
                  — overview in the Spectra API documentation (Integrations section).
                </p>
              }
              @if (intLoading()) {
                <p>Loading…</p>
              } @else if (intErr(); as ie) {
                <p class="spectra-auth-error">{{ ie }}</p>
              } @else if (integrations().length === 0) {
                <p class="text-muted">No integrations yet. Create one for server-to-server <code>client_credentials</code> access.</p>
              } @else {
                <table class="apps-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Updated</th>
                      <th>Client ID</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of integrations(); track row.id) {
                      <tr>
                        <td>{{ row.name }}</td>
                        <td>{{ row.updatedAt | date: 'medium' }}</td>
                        <td>
                          <input
                            readonly
                            class="form-control form-control-compact font-monospace"
                            [value]="row.clientId"
                            (click)="copy(row.clientId)"
                          />
                        </td>
                        <td class="actions actions-icon-row">
                          <button
                            type="button"
                            class="icon-btn"
                            title="Open integration details"
                            aria-label="Open integration details"
                            [routerLink]="['/integrations', row.id]"
                          >
                            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            class="icon-btn"
                            title="Edit integration"
                            aria-label="Edit integration"
                            [routerLink]="['/integrations', row.id, 'edit']"
                          >
                            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            class="icon-btn icon-btn-accent"
                            title="Get an access token for Swagger or API calls (client credentials)"
                            aria-label="Get an access token for Swagger or API calls"
                            (click)="openMintToken(row)"
                          >
                            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            class="icon-btn"
                            title="Rotate client secret (opens confirmation)"
                            aria-label="Rotate client secret"
                            (click)="openRotateReview(row)"
                          >
                            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            class="icon-btn icon-btn-danger"
                            title="Revoke integration permanently"
                            aria-label="Revoke integration permanently"
                            (click)="openRevokeReview(row)"
                          >
                            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </section>
            }
          </div>
        </div>

        <aside class="spectra-doc-toc" aria-labelledby="dash-toc-title">
          <p id="dash-toc-title" class="spectra-doc-toc-title">On this page</p>
          @if (docMainPanel() === 'overview') {
            <ul class="spectra-doc-toc-list">
              <li>
                <a href="#dash-overview">Overview</a>
                <ul class="spectra-doc-toc-sub">
                  <li><a href="#dash-environment">Environment &amp; session</a></li>
                  @if (swaggerDocsUrl()) {
                    <li><a href="#dash-api-reference">Public API reference</a></li>
                  }
                  <li><a href="#dash-choose-path">Choose a path</a></li>
                </ul>
              </li>
              @if (developerApplicationsUiEnabled()) {
                <li><a href="#dash-applications">My Sandbox Apps</a></li>
              }
              <li>
                <a href="#dash-integrations" (click)="onIntegrationsNavClick($event)">Integrations</a>
              </li>
              @if (productionAccessPortalEnabled()) {
                <li>
                  <a href="#dash-approvals" (click)="onApprovalsNavClick($event)">Approvals</a>
                </li>
              }
            </ul>
          } @else if (docMainPanel() === 'integrations') {
            <ul class="spectra-doc-toc-list">
              <li><span class="text-muted small">Integrations</span></li>
              <li>
                <a href="#dash-overview" (click)="onOverviewNavClick($event)">← Overview</a>
              </li>
            </ul>
          } @else if (docMainPanel() === 'approvals') {
            <ul class="spectra-doc-toc-list">
              <li><span class="text-muted small">Approvals</span></li>
              <li>
                <a href="#dash-overview" (click)="onOverviewNavClick($event)">← Overview</a>
              </li>
            </ul>
          }
        </aside>
      </div>

      @if (pendingRotate(); as pr) {
        <div class="modal-backdrop" role="presentation" (click)="dismissRotateModal()"></div>
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="dash-rotate-title">
          <h2 id="dash-rotate-title">Review: rotate client secret</h2>
          <div class="modal-review">
            <dl class="modal-review-dl">
              <dt>Integration</dt>
              <dd>{{ pr.name }}</dd>
              <dt>Client ID</dt>
              <dd><code class="modal-code">{{ pr.clientId }}</code></dd>
              <dt>Granted scopes</dt>
              <dd>
                @if (pr.grantedScopes.trim()) {
                  <code class="modal-code">{{ pr.grantedScopes }}</code>
                } @else {
                  <span class="modal-review-empty">None</span>
                }
              </dd>
              <dt>Last updated</dt>
              <dd>{{ pr.updatedAt | date: 'medium' }}</dd>
            </dl>
          </div>
          <p class="modal-lede">
            Confirming generates a <strong>new</strong> secret and invalidates the old one immediately. Update any
            servers that use the current secret before you continue.
          </p>
          @if (intActionErr(); as ae) {
            <p class="spectra-auth-error modal-err">{{ ae }}</p>
          }
          <div class="modal-actions">
            <button type="button" class="btn btn-outline-secondary" [disabled]="intActionBusy()" (click)="dismissRotateModal()">Cancel</button>
            <button type="button" class="btn btn-danger" [disabled]="intActionBusy()" (click)="confirmRotateFromDashboard()">
              {{ intActionBusy() ? 'Working…' : 'Confirm rotate' }}
            </button>
          </div>
        </div>
      }

      @if (pendingRevoke(); as pv) {
        <div class="modal-backdrop" role="presentation" (click)="dismissRevokeModal()"></div>
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="dash-revoke-title">
          <h2 id="dash-revoke-title">Review: revoke integration</h2>
          <div class="modal-review">
            <dl class="modal-review-dl">
              <dt>Integration</dt>
              <dd>{{ pv.name }}</dd>
              <dt>Client ID</dt>
              <dd><code class="modal-code">{{ pv.clientId }}</code></dd>
              <dt>Granted scopes</dt>
              <dd>
                @if (pv.grantedScopes.trim()) {
                  <code class="modal-code">{{ pv.grantedScopes }}</code>
                } @else {
                  <span class="modal-review-empty">None</span>
                }
              </dd>
              <dt>Last updated</dt>
              <dd>{{ pv.updatedAt | date: 'medium' }}</dd>
            </dl>
          </div>
          <p class="modal-lede">
            This permanently revokes <strong>{{ pv.name }}</strong> from the sandbox. Token mints for this client will
            stop. You cannot undo this from the portal.
          </p>
          @if (intActionErr(); as ae2) {
            <p class="spectra-auth-error modal-err">{{ ae2 }}</p>
          }
          <div class="modal-actions">
            <button type="button" class="btn btn-outline-secondary" [disabled]="intActionBusy()" (click)="dismissRevokeModal()">Cancel</button>
            <button type="button" class="btn btn-danger" [disabled]="intActionBusy()" (click)="confirmRevokeFromDashboard()">
              {{ intActionBusy() ? 'Working…' : 'Confirm revoke' }}
            </button>
          </div>
        </div>
      }

      @if (pendingMint(); as mintRow) {
        <div class="modal-backdrop" role="presentation" (click)="dismissMintModal()"></div>
        <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="dash-mint-title">
          <h2 id="dash-mint-title">Get access token (Swagger)</h2>
          <p class="modal-lede">
            Enter this integration’s <strong>client secret</strong> (from when you created it or after rotate). The
            portal calls auth-api with <code>client_credentials</code> and shows the bearer token to paste into Swagger
            <strong>Authorize</strong>.
          </p>
          <p class="modal-security-hint">
            This runs in your browser: treat the machine as trusted. For production traffic, mint tokens only from
            your own servers (never ship integration secrets to end-user devices). Rotate a leaked secret immediately
            from the integration page; see Spectra API docs → Authorization and the M2M incident guidance in
            <code>docs/plans/m2m-client-credentials-edge-auth.md</code>.
          </p>
          @if (oauthDiscoveryUrl(); as meta) {
            <p class="modal-doc-hint">
              OAuth 2.0 Authorization Server metadata (RFC 8414):
              <a [href]="meta" target="_blank" rel="noopener noreferrer">{{ meta }}</a>
            </p>
          }
          <p class="modal-meta">
            <span class="modal-meta-label">Integration</span> {{ mintRow.name }} —
            <code class="modal-code">{{ mintRow.clientId }}</code>
          </p>
          @if (swaggerDocsUrl(); as docu) {
            <p class="modal-doc-hint">
              Public API Swagger:
              <a [href]="docu" target="_blank" rel="noopener noreferrer">{{ docu }}</a>
            </p>
          }
          <label class="form-label" for="dash-mint-secret">Client secret</label>
          <input
            id="dash-mint-secret"
            class="form-control form-control-stretch"
            type="password"
            autocomplete="off"
            [value]="mintSecret()"
            (input)="mintSecret.set($any($event.target).value)"
          />
          <label class="form-label" for="dash-mint-scope">Scope</label>
          <input
            id="dash-mint-scope"
            class="form-control form-control-stretch"
            type="text"
            spellcheck="false"
            [value]="mintScope()"
            (input)="mintScope.set($any($event.target).value)"
          />
          <p class="form-text">Leave as granted scopes or narrow to a subset auth-api allows for this client.</p>
          @if (mintErr(); as mintE) {
            <p class="spectra-auth-error modal-err">{{ mintE }}</p>
          }
          @if (mintTokenResult(); as mtok) {
            <label class="form-label" for="dash-mint-out">Access token</label>
            <textarea id="dash-mint-out" class="form-control font-monospace" readonly rows="4">{{ mtok }}</textarea>
            @if (mintExpiresIn() !== null) {
              <p class="token-expiry">
                Expires in {{ mintExpiresIn() }} seconds (from auth-api). Copy and use as
                <code>Authorization: Bearer …</code> in Swagger or curl.
              </p>
            }
            @if (mintJwtPreview(); as jw) {
              <p class="form-label mb-0">Token claims (debug)</p>
              <pre class="token-jwt-preview">{{ jw }}</pre>
              <p class="form-text">Decoded locally in your browser only — not sent to Spectra.</p>
            }
            <button
              type="button"
              class="icon-btn icon-btn-accent token-copy-icon"
              title="Copy access token to clipboard"
              aria-label="Copy access token to clipboard"
              (click)="copy(mtok)"
            >
              <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.75 9h-7.5A2.25 2.25 0 006 11.25v7.5A2.25 2.25 0 008.25 21h7.5a2.25 2.25 0 002.25-2.25v-7.5A2.25 2.25 0 0015.75 9z"
                />
              </svg>
            </button>
          }
          <div class="modal-actions">
            <button type="button" class="btn btn-outline-secondary" [disabled]="mintBusy()" (click)="dismissMintModal()">Close</button>
            @if (!mintTokenResult()) {
              <button type="button" class="btn btn-primary" [disabled]="mintBusy()" (click)="confirmMintToken()">
                {{ mintBusy() ? 'Working…' : 'Get token' }}
              </button>
            }
          </div>
        </div>
      }
    </main>
  `,
  styles: [
    `
      .sandbox-dashboard {
        max-width: var(--spectra-max-width);
        padding-top: 1rem;
      }
      .context-line {
        margin: 0 0 0.5rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem 1rem;
        align-items: center;
      }
      .env-badge {
        display: inline-block;
        padding: 0.2rem 0.55rem;
        border-radius: var(--spectra-radius-sm);
        background: var(--spectra-color-navy);
        color: #e8edf4;
        font-weight: 700;
        font-size: 0.75rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .ctx-meta {
        color: var(--spectra-color-text);
      }
      .ctx-meta code {
        font-size: 0.82rem;
      }
      .context-swagger {
        margin: 0.35rem 0;
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .context-swagger a {
        word-break: break-all;
        color: var(--spectra-color-link);
        font-weight: 600;
      }
      .context-path-hint {
        margin: 0.5rem 0 0;
        color: var(--spectra-color-muted);
        font-size: 0.85rem;
      }
      .token-jwt-preview {
        margin: 0 0 0.5rem;
        padding: 0.5rem 0.65rem;
        max-height: 10rem;
        overflow: auto;
        font-size: 0.75rem;
        line-height: 1.35;
        border-radius: var(--spectra-radius-sm);
        border: 1px solid var(--spectra-color-border);
        background: var(--spectra-color-surface);
        color: var(--spectra-color-text);
      }
      .token-expiry {
        margin: 0.5rem 0;
        font-size: 0.85rem;
        line-height: 1.45;
      }
      .dash-head {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }
      .dash-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }
      .integrations-doc-link {
        margin: 0 0 0.75rem;
        font-size: 0.9rem;
        color: var(--spectra-color-muted);
      }
      .integrations-doc-link a {
        color: var(--spectra-color-link);
        font-weight: 600;
      }
      .apps-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
      }
      .apps-table th,
      .apps-table td {
        padding: 0.5rem 0.35rem;
        border-bottom: 1px solid var(--spectra-color-border);
        vertical-align: middle;
        color: var(--spectra-color-text);
      }
      .apps-table th {
        color: var(--spectra-color-navy);
        font-weight: 700;
        font-size: 0.82rem;
        text-align: left;
      }
      .actions {
        white-space: normal;
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        align-items: center;
      }
      .actions-icon-row {
        gap: 0.25rem;
      }
      .icon-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.25rem;
        height: 2.25rem;
        padding: 0;
        border-radius: var(--spectra-radius-sm);
        border: none;
        background: #e2e8f0;
        color: #0f172a;
        cursor: pointer;
        flex-shrink: 0;
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
      }
      .icon-btn:hover {
        background: #f8fafc;
        color: #020617;
      }
      .icon-btn:active {
        transform: translateY(1px);
        box-shadow: 0 0 1px rgb(0 0 0 / 0.2);
      }
      .icon-btn:focus-visible {
        outline: 2px solid var(--spectra-color-accent);
        outline-offset: 2px;
      }
      .icon-btn .icon-svg {
        width: 1.125rem;
        height: 1.125rem;
        flex-shrink: 0;
      }
      .icon-btn-accent {
        background: var(--spectra-color-accent);
        color: #fff;
        box-shadow: 0 1px 3px rgb(0 0 0 / 0.35);
      }
      .icon-btn-accent:hover {
        background: var(--spectra-color-accent-hover);
        color: #fff;
      }
      .icon-btn-accent:focus-visible {
        outline-color: var(--spectra-color-accent);
        outline-offset: 3px;
      }
      .icon-btn-danger {
        background: #dc2626;
        color: #fff;
        box-shadow: 0 1px 3px rgb(0 0 0 / 0.35);
      }
      .icon-btn-danger:hover {
        background: #b91c1c;
        color: #fff;
      }
      .icon-btn-danger:focus-visible {
        outline-color: #fecaca;
        outline-offset: 2px;
      }
      .token-copy-icon {
        margin-top: 0.5rem;
      }
    `,
  ],
})
export class DashboardPageComponent {
  private readonly api = inject(SandboxPortalService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly sessionError = signal<string | null>(null);
  protected readonly developerApplicationsUiEnabled = signal(false);
  protected readonly apps = signal<SandboxApplicationSummary[]>([]);
  protected readonly intLoading = signal(true);
  protected readonly intErr = signal<string | null>(null);
  protected readonly integrations = signal<SandboxIntegrationSummary[]>([]);
  protected readonly parListError = signal<string | null>(null);
  protected readonly pendingRotate = signal<SandboxIntegrationSummary | null>(null);
  protected readonly pendingRevoke = signal<SandboxIntegrationSummary | null>(null);
  protected readonly intActionErr = signal<string | null>(null);
  protected readonly intActionBusy = signal(false);
  protected readonly pendingMint = signal<SandboxIntegrationSummary | null>(null);
  protected readonly mintSecret = signal('');
  protected readonly mintScope = signal('');
  protected readonly mintErr = signal<string | null>(null);
  protected readonly mintBusy = signal(false);
  protected readonly mintTokenResult = signal<string | null>(null);
  protected readonly mintExpiresIn = signal<number | null>(null);
  protected readonly mintJwtPreview = signal<string | null>(null);
  protected readonly sandboxSession = signal<SandboxSession | null>(null);
  /** When true, show dashboard entry points to sandbox custom AI endpoints (from session). */
  protected readonly sandboxAiEndpointsEnabled = signal(false);
  /** When false, hide PAR / Approvals (from sandbox session). */
  protected readonly productionAccessPortalEnabled = signal(true);
  protected readonly parApprovalRows = signal<ParApprovalRow[]>([]);
  protected readonly parListLoading = signal(false);

  /** Main column shows Overview (+ apps), Integrations only, or Approvals only — mutually exclusive. */
  protected readonly docMainPanel = signal<DashboardMainPanel>('overview');

  protected readonly customerSandboxLabel = computed(() => {
    const label = environment.customerSandboxLabel?.trim();
    if (label) return label;
    return environment.production ? 'Production' : 'Local';
  });

  // Security: the URLs below feed `[href]` bindings. They MUST stay derived from build-time
  // `environment.*` config only. Never populate them from server/session/user data — a
  // `javascript:`/`data:` URL would then execute on click. Sanitize if that ever changes.
  protected readonly oauthDiscoveryUrl = computed(() => {
    const b = environment.authApiPublicBaseUrl?.trim();
    if (!b) return null;
    return `${b.replace(/\/$/, '')}/.well-known/oauth-authorization-server`;
  });

  /** Marketing site API docs — `#integrations` section (requires `spectraMarketingUrl`). */
  protected readonly integrationsDocHref = computed(() => {
    const base = environment.spectraMarketingUrl?.trim();
    if (!base) return null;
    return `${base.replace(/\/$/, '')}/docs#integrations`;
  });

  /** Public OpenAPI / Swagger (`/docs`) — same origin as API by default. */
  protected readonly swaggerDocsUrl = computed(() => {
    const pub = environment.publicApiDocsBaseUrl?.trim();
    const api = environment.apiBaseUrl?.trim();
    const base = (pub || api || '').replace(/\/$/, '');
    return base ? `${base}/docs` : '';
  });

  constructor() {
    this.api.session().subscribe({
      next: (s) => {
        this.sandboxSession.set(s);
        const enabled = s.developerApplicationsUiEnabled === true;
        this.developerApplicationsUiEnabled.set(enabled);
        this.sandboxAiEndpointsEnabled.set(s.sandboxAiEndpointsEnabled === true);
        this.productionAccessPortalEnabled.set(s.productionAccessIntegratorPortalEnabled !== false);
        this.sessionError.set(null);
        if (!this.productionAccessPortalEnabled()) {
          this.parApprovalRows.set([]);
          this.parListLoading.set(false);
        } else if (!this.intLoading()) {
          this.refreshParApprovalsForCurrentIntegrations();
        }
        if (enabled) {
          void this.load();
        } else {
          this.loading.set(false);
          this.apps.set([]);
        }
      },
      error: (e: unknown) => {
        this.sessionError.set(e instanceof Error ? e.message : 'Failed to load session');
        this.loading.set(false);
        this.developerApplicationsUiEnabled.set(false);
        this.sandboxSession.set(null);
        this.sandboxAiEndpointsEnabled.set(false);
      },
    });
    void this.loadIntegrations();
    queueMicrotask(() => {
      if (typeof location === 'undefined') return;
      if (location.hash === '#dash-integrations') {
        this.docMainPanel.set('integrations');
        queueMicrotask(() =>
          document.getElementById('dash-integrations')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        );
      } else if (location.hash === '#dash-approvals') {
        this.docMainPanel.set('approvals');
        queueMicrotask(() =>
          document.getElementById('dash-approvals')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        );
      }
    });
  }

  protected onOverviewNavClick(ev: Event): void {
    if (this.docMainPanel() === 'integrations' || this.docMainPanel() === 'approvals') {
      ev.preventDefault();
      this.docMainPanel.set('overview');
      queueMicrotask(() =>
        document.getElementById('dash-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    }
  }

  protected onApplicationsNavClick(ev: Event): void {
    if (this.docMainPanel() === 'integrations' || this.docMainPanel() === 'approvals') {
      ev.preventDefault();
      this.docMainPanel.set('overview');
      queueMicrotask(() =>
        document.getElementById('dash-applications')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    }
  }

  protected onIntegrationsNavClick(ev: Event): void {
    if (this.docMainPanel() === 'integrations') {
      return;
    }
    ev.preventDefault();
    this.docMainPanel.set('integrations');
    queueMicrotask(() =>
      document.getElementById('dash-integrations')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }

  protected onApprovalsNavClick(ev: Event): void {
    if (this.docMainPanel() === 'approvals') {
      return;
    }
    ev.preventDefault();
    this.docMainPanel.set('approvals');
    queueMicrotask(() =>
      document.getElementById('dash-approvals')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }

  protected openRotateReview(row: SandboxIntegrationSummary): void {
    this.intActionErr.set(null);
    this.pendingRevoke.set(null);
    this.pendingMint.set(null);
    this.pendingRotate.set(row);
  }

  protected dismissRotateModal(): void {
    if (!this.intActionBusy()) {
      this.pendingRotate.set(null);
      this.intActionErr.set(null);
    }
  }

  protected confirmRotateFromDashboard(): void {
    const row = this.pendingRotate();
    if (!row || this.intActionBusy()) return;
    this.intActionBusy.set(true);
    this.intActionErr.set(null);
    this.api.rotateIntegrationSecret(row.id).subscribe({
      next: (res) => {
        this.intActionBusy.set(false);
        this.pendingRotate.set(null);
        void this.loadIntegrations();
        void this.router.navigate(['/integrations', row.id], {
          state: { clientSecret: res.clientSecret },
        });
      },
      error: (e: unknown) => {
        this.intActionBusy.set(false);
        this.setIntActionHttpError(e, 'Rotate failed');
      },
    });
  }

  protected openRevokeReview(row: SandboxIntegrationSummary): void {
    this.intActionErr.set(null);
    this.pendingRotate.set(null);
    this.pendingMint.set(null);
    this.pendingRevoke.set(row);
  }

  protected openMintToken(row: SandboxIntegrationSummary): void {
    this.pendingRotate.set(null);
    this.pendingRevoke.set(null);
    this.intActionErr.set(null);
    this.mintErr.set(null);
    this.mintTokenResult.set(null);
    this.mintExpiresIn.set(null);
    this.mintJwtPreview.set(null);
    this.mintSecret.set('');
    this.mintScope.set(row.grantedScopes?.trim() || 'platform:read');
    this.pendingMint.set(row);
  }

  protected dismissMintModal(): void {
    if (this.mintBusy()) return;
    this.pendingMint.set(null);
    this.mintErr.set(null);
    this.mintSecret.set('');
    this.mintTokenResult.set(null);
    this.mintExpiresIn.set(null);
    this.mintJwtPreview.set(null);
  }

  protected confirmMintToken(): void {
    const row = this.pendingMint();
    if (!row || this.mintBusy()) return;
    const secret = this.mintSecret().trim();
    if (!secret) {
      this.mintErr.set('Client secret is required.');
      return;
    }
    this.mintBusy.set(true);
    this.mintErr.set(null);
    const scope = this.mintScope().trim();
    this.api
      .mintIntegrationAccessToken(row.id, { clientSecret: secret, scope: scope || undefined })
      .subscribe({
        next: (res) => {
          this.mintBusy.set(false);
          this.mintTokenResult.set(res.access_token);
          this.mintExpiresIn.set(typeof res.expires_in === 'number' ? res.expires_in : null);
          this.mintJwtPreview.set(formatMintJwtPreview(res.access_token));
        },
        error: (e: unknown) => {
          this.mintBusy.set(false);
          const http = e as { error?: { error_description?: string; message?: string } };
          this.mintErr.set(
            http?.error?.error_description ??
              http?.error?.message ??
              (e instanceof Error ? e.message : 'Could not mint token'),
          );
        },
      });
  }

  protected dismissRevokeModal(): void {
    if (!this.intActionBusy()) {
      this.pendingRevoke.set(null);
      this.intActionErr.set(null);
    }
  }

  protected confirmRevokeFromDashboard(): void {
    const row = this.pendingRevoke();
    if (!row || this.intActionBusy()) return;
    this.intActionBusy.set(true);
    this.intActionErr.set(null);
    this.api.deleteIntegration(row.id).subscribe({
      next: () => {
        this.intActionBusy.set(false);
        this.pendingRevoke.set(null);
        void this.loadIntegrations();
      },
      error: (e: unknown) => {
        this.intActionBusy.set(false);
        this.setIntActionHttpError(e, 'Revoke failed');
      },
    });
  }

  private setIntActionHttpError(e: unknown, fallback: string): void {
    // Only surface the backend message for client-side (4xx) validation errors; for 5xx/unknown
    // show a generic fallback so internal details aren't leaked to the UI.
    const err = e as { status?: number; error?: { message?: string } };
    const isClientError = typeof err?.status === 'number' && err.status >= 400 && err.status < 500;
    this.intActionErr.set(isClientError && err?.error?.message ? err.error.message : fallback);
  }

  private loadIntegrations(): void {
    this.intLoading.set(true);
    this.intErr.set(null);
    this.api.listIntegrations().subscribe({
      next: (r) => {
        this.integrations.set(r.integrations);
        this.intLoading.set(false);
        this.refreshParApprovalsForCurrentIntegrations();
      },
      error: (e: unknown) => {
        this.intErr.set(e instanceof Error ? e.message : 'Failed to load integrations');
        this.intLoading.set(false);
        this.parApprovalRows.set([]);
        this.parListLoading.set(false);
      },
    });
  }

  private refreshParApprovalsForCurrentIntegrations(): void {
    if (!this.productionAccessPortalEnabled()) {
      this.parApprovalRows.set([]);
      this.parListLoading.set(false);
      return;
    }
    const ints = this.integrations();
    if (ints.length === 0) {
      this.parApprovalRows.set([]);
      this.parListLoading.set(false);
      return;
    }
    this.parListLoading.set(true);
    this.parListError.set(null);
    const CONCURRENCY = 5;
    from(ints)
      .pipe(
        mergeMap(
          (int) =>
            this.api.getProductionAccessRequest(int.id).pipe(
              map((par) => ({
                integrationId: int.id,
                integrationName: int.name,
                requestId: par.id,
                statusId: par.statusId,
              })),
              catchError((e: unknown) => {
                // 404 = this integration simply has no PAR yet (expected). Surface anything else
                // instead of silently masking it.
                const status = (e as { status?: number })?.status;
                if (status !== 404) this.parListError.set('Some approval statuses could not be loaded.');
                return of(null);
              }),
            ),
          CONCURRENCY,
        ),
        toArray(),
      )
      .subscribe({
        next: (rows) => {
          this.parApprovalRows.set(rows.filter((x): x is ParApprovalRow => x !== null));
          this.parListLoading.set(false);
        },
        error: () => {
          this.parApprovalRows.set([]);
          this.parListLoading.set(false);
        },
      });
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.api.listApplications().subscribe({
      next: (r) => {
        this.apps.set(r.applications);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(e instanceof Error ? e.message : 'Failed to load applications');
        this.loading.set(false);
      },
    });
  }

  protected copy(text: string): void {
    navigator.clipboard.writeText(text).then(
      () => this.toastr.success('Copied to clipboard'),
      () => this.toastr.error('Could not copy — copy manually'),
    );
  }

  protected copyHint(): void {
    this.toastr.info('Client secret is only shown once, when you create the application.');
  }

  /** Maps `production_access_requests.status_id` catalog UUIDs to short labels (see `catalog-seed-ids.ts`). */
  protected parStatusLabel(statusId: string): string {
    return productionAccessRequestStatusLabel(statusId);
  }
}

/** Stable `spectra.catalog` UUIDs for `family = production_access_request_states` (packages/database catalog-seed-ids). */
function productionAccessRequestStatusLabel(statusId: string): string {
  const id = statusId.trim().toLowerCase();
  const labels: Record<string, string> = {
    'a0000040-0000-4000-8000-000000000001': 'Pending review',
    'a0000040-0000-4000-8000-000000000002': 'Needs information',
    'a0000040-0000-4000-8000-000000000003': 'Approved',
    'a0000040-0000-4000-8000-000000000004': 'Rejected',
  };
  return labels[id] ?? statusId;
}

function formatMintJwtPreview(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const seg = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = seg.length % 4;
    const padded = pad ? seg + '='.repeat(4 - pad) : seg;
    const json = JSON.parse(atob(padded)) as Record<string, unknown>;
    const keys = ['iss', 'aud', 'sub', 'scope', 'exp', 'iat', 'client_id', 'org_id', 'integration_id'];
    const lines: string[] = [];
    for (const k of keys) {
      if (k in json) lines.push(`${k}: ${JSON.stringify(json[k])}`);
    }
    return lines.length ? lines.join('\n') : null;
  } catch {
    return null;
  }
}
