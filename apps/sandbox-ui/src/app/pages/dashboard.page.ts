import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
            <button type="button" routerLink="/applications/new" class="btn-add">Add an application</button>
          }
          <button type="button" routerLink="/integrations/new" class="btn-add">New integration</button>
        </div>
      </header>

      @if (!sessionError()) {
        <section class="spectra-probe dash-context" aria-label="Sandbox context">
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
            <p class="context-swagger">
              <strong>Public API reference:</strong>
              <a [href]="sw" target="_blank" rel="noopener noreferrer">{{ sw }}</a>
              <button type="button" class="linkish" (click)="copy(sw)">Copy URL</button>
            </p>
          }
          <p class="context-path-hint">
            <strong>Choose a path:</strong>
            <strong>New integration</strong> for server-to-server <code>client_credentials</code>.
            @if (developerApplicationsUiEnabled()) {
              Use <strong>Add an application</strong> for redirect-based OAuth when a user signs in through your app.
            } @else {
              Sandbox applications are disabled for your org — use integrations for API access.
            }
          </p>
        </section>
      }

      @if (sessionError(); as se) {
        <p class="spectra-auth-error">{{ se }}</p>
      }

      @if (error()) {
        <p class="spectra-auth-error">{{ error() }}</p>
      }

      @if (developerApplicationsUiEnabled()) {
        <section class="spectra-probe apps-panel" aria-labelledby="apps-heading">
          <h2 id="apps-heading">My Sandbox Apps</h2>
          @if (loading()) {
            <p>Loading…</p>
          } @else if (apps().length === 0) {
            <p class="hint">No applications yet. Create one to get a client ID and secret.</p>
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
                        class="cred-field"
                        [type]="showSecrets() ? 'text' : 'password'"
                        [value]="row.clientId"
                        (click)="copy(row.clientId)"
                      />
                    </td>
                    <td>
                      <input
                        readonly
                        class="cred-field"
                        [type]="showSecrets() ? 'text' : 'password'"
                        value="••••••••••••••••"
                        title="Secret is only shown once when the app is created"
                        (click)="copyHint()"
                      />
                    </td>
                    <td class="actions actions-icon-row">
                      <button
                        type="button"
                        class="icon-btn"
                        [attr.title]="showSecrets() ? 'Mask client ID values' : 'Reveal client IDs as plain text'"
                        [attr.aria-label]="showSecrets() ? 'Mask client ID values' : 'Reveal client IDs as plain text'"
                        (click)="toggleSecrets()"
                      >
                        @if (showSecrets()) {
                          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                            />
                          </svg>
                        } @else {
                          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                            />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        }
                      </button>
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

      <section class="spectra-probe apps-panel" aria-labelledby="int-heading">
        <h2 id="int-heading">Integrations</h2>
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
          <p class="hint">No integrations yet. Create one for server-to-server <code>client_credentials</code> access.</p>
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
                    <input readonly class="cred-field" [value]="row.clientId" (click)="copy(row.clientId)" />
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
            <button type="button" [disabled]="intActionBusy()" (click)="dismissRotateModal()">Cancel</button>
            <button type="button" class="btn-modal-danger" [disabled]="intActionBusy()" (click)="confirmRotateFromDashboard()">
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
            <button type="button" [disabled]="intActionBusy()" (click)="dismissRevokeModal()">Cancel</button>
            <button type="button" class="btn-modal-danger" [disabled]="intActionBusy()" (click)="confirmRevokeFromDashboard()">
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
          <label class="token-label" for="dash-mint-secret">Client secret</label>
          <input
            id="dash-mint-secret"
            class="token-input"
            type="password"
            autocomplete="off"
            [value]="mintSecret()"
            (input)="mintSecret.set($any($event.target).value)"
          />
          <label class="token-label" for="dash-mint-scope">Scope</label>
          <input
            id="dash-mint-scope"
            class="token-input"
            type="text"
            spellcheck="false"
            [value]="mintScope()"
            (input)="mintScope.set($any($event.target).value)"
          />
          <p class="token-scope-hint">Leave as granted scopes or narrow to a subset auth-api allows for this client.</p>
          @if (mintErr(); as mintE) {
            <p class="spectra-auth-error modal-err">{{ mintE }}</p>
          }
          @if (mintTokenResult(); as mtok) {
            <label class="token-label" for="dash-mint-out">Access token</label>
            <textarea id="dash-mint-out" class="token-textarea" readonly rows="4">{{ mtok }}</textarea>
            @if (mintExpiresIn() !== null) {
              <p class="token-expiry">
                Expires in {{ mintExpiresIn() }} seconds (from auth-api). Copy and use as
                <code>Authorization: Bearer …</code> in Swagger or curl.
              </p>
            }
            @if (mintJwtPreview(); as jw) {
              <p class="token-label">Token claims (debug)</p>
              <pre class="token-jwt-preview">{{ jw }}</pre>
              <p class="token-scope-hint">Decoded locally in your browser only — not sent to Spectra.</p>
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
            <button type="button" [disabled]="mintBusy()" (click)="dismissMintModal()">Close</button>
            @if (!mintTokenResult()) {
              <button type="button" class="btn-modal-primary" [disabled]="mintBusy()" (click)="confirmMintToken()">
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
        max-width: 56rem;
        padding-top: 1rem;
      }
      .dash-context {
        margin-top: 1rem;
        padding: 0.85rem 1rem;
        font-size: 0.9rem;
        line-height: 1.45;
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
        color: var(--spectra-color-panel-text);
      }
      .ctx-meta code {
        font-size: 0.82rem;
      }
      .context-swagger {
        margin: 0.35rem 0;
        word-break: break-all;
      }
      .context-swagger a {
        color: var(--spectra-color-panel-link);
        font-weight: 600;
      }
      .context-path-hint {
        margin: 0.5rem 0 0;
        color: var(--spectra-color-muted);
        font-size: 0.85rem;
      }
      .linkish {
        margin-left: 0.5rem;
        padding: 0;
        border: none;
        background: none;
        color: var(--spectra-color-accent);
        font-weight: 600;
        cursor: pointer;
        text-decoration: underline;
        font: inherit;
      }
      .modal-security-hint {
        margin: 0 0 0.75rem;
        font-size: 0.82rem;
        line-height: 1.45;
        color: var(--spectra-color-muted);
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
      }
      .btn-add {
        display: inline-block;
        padding: 0.45rem 1rem;
        border-radius: var(--spectra-radius-sm);
        background: var(--spectra-color-accent);
        color: #fff !important;
        font-weight: 600;
        text-decoration: none;
        border: none;
        cursor: pointer;
        font: inherit;
      }
      .btn-add:hover {
        background: var(--spectra-color-accent-hover);
      }
      .apps-panel {
        margin-top: 1.5rem;
      }
      .integrations-doc-link {
        margin: 0 0 0.75rem;
        font-size: 0.9rem;
        color: var(--spectra-color-muted);
      }
      .integrations-doc-link a {
        color: var(--spectra-color-panel-link);
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
        border-bottom: 1px solid var(--spectra-color-panel-border);
        vertical-align: middle;
      }
      .cred-field {
        width: 100%;
        max-width: 14rem;
        font-size: 0.8rem;
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
        outline: 2px solid #f8fafc;
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
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgb(0 0 0 / 0.45);
        z-index: 80;
      }
      .modal {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 90;
        background: var(--spectra-color-card);
        color: var(--spectra-color-text);
        padding: 1.25rem 1.5rem;
        border-radius: var(--spectra-radius-md);
        box-shadow: var(--spectra-shadow-md);
        min-width: min(26rem, 92vw);
        max-width: min(32rem, 94vw);
      }
      .modal-wide {
        max-width: min(36rem, 96vw);
      }
      .modal h2 {
        margin: 0 0 0.75rem;
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--spectra-color-navy);
      }
      .modal-review {
        margin: 0.5rem 0 1rem;
        padding: 0.75rem 1rem;
        border-radius: var(--spectra-radius-sm);
        border: 1px solid var(--spectra-color-border);
        background: var(--spectra-color-surface);
      }
      .modal-review-dl {
        display: grid;
        grid-template-columns: minmax(7.5rem, max-content) minmax(0, 1fr);
        gap: 0.35rem 1rem;
        margin: 0;
        font-size: 0.9rem;
      }
      .modal-review-dl dt {
        margin: 0;
        font-weight: 600;
        color: var(--spectra-color-muted);
      }
      .modal-review-dl dd {
        margin: 0;
        word-break: break-word;
        min-width: 0;
      }
      .modal-code {
        font-size: 0.82rem;
      }
      .modal-review-empty {
        color: var(--spectra-color-muted);
        font-style: italic;
      }
      .modal-lede {
        margin: 0 0 0.75rem;
        font-size: 0.95rem;
        line-height: 1.5;
        color: var(--spectra-color-text);
      }
      .modal-err {
        margin: 0 0 0.75rem;
      }
      .modal-actions {
        margin-top: 1rem;
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .modal-actions button {
        padding: 0.45rem 0.9rem;
        border-radius: var(--spectra-radius-sm);
        font-weight: 600;
        cursor: pointer;
        border: 1px solid var(--spectra-color-border);
        background: var(--spectra-color-card);
        color: var(--spectra-color-text);
      }
      .modal-actions button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .btn-modal-danger {
        background: #b91c1c !important;
        color: #fff !important;
        border-color: #991b1b !important;
      }
      .btn-modal-primary {
        background: var(--spectra-color-accent) !important;
        color: #fff !important;
        border-color: var(--spectra-color-accent-hover) !important;
      }
      .modal-meta {
        margin: 0 0 0.65rem;
        font-size: 0.88rem;
        color: var(--spectra-color-muted);
      }
      .modal-meta-label {
        font-weight: 600;
        color: var(--spectra-color-text);
      }
      .modal-doc-hint {
        margin: 0 0 0.85rem;
        font-size: 0.88rem;
      }
      .modal-doc-hint a {
        color: var(--spectra-color-panel-link);
        font-weight: 600;
        word-break: break-all;
      }
      .token-label {
        display: block;
        margin: 0.5rem 0 0.25rem;
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--spectra-color-muted);
      }
      .token-input,
      .token-textarea {
        width: 100%;
        box-sizing: border-box;
        font-size: 0.85rem;
        padding: 0.4rem 0.5rem;
        border-radius: var(--spectra-radius-sm);
        border: 1px solid var(--spectra-color-border);
        background: var(--spectra-color-surface);
        color: var(--spectra-color-text);
      }
      .token-textarea {
        font-family: ui-monospace, monospace;
        resize: vertical;
        min-height: 5rem;
      }
      .token-scope-hint {
        margin: 0.25rem 0 0.5rem;
        font-size: 0.8rem;
        color: var(--spectra-color-muted);
      }
      .token-expiry {
        margin: 0.5rem 0;
        font-size: 0.85rem;
        line-height: 1.45;
      }
    `,
  ],
})
export class DashboardPageComponent {
  private readonly api = inject(SandboxPortalService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly sessionError = signal<string | null>(null);
  protected readonly developerApplicationsUiEnabled = signal(false);
  protected readonly apps = signal<SandboxApplicationSummary[]>([]);
  protected readonly intLoading = signal(true);
  protected readonly intErr = signal<string | null>(null);
  protected readonly integrations = signal<SandboxIntegrationSummary[]>([]);
  protected readonly showSecrets = signal(false);
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

  protected readonly customerSandboxLabel = computed(() => {
    const label = environment.customerSandboxLabel?.trim();
    if (label) return label;
    return environment.production ? 'Production' : 'Local';
  });

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
        this.sessionError.set(null);
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
      },
    });
    void this.loadIntegrations();
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
    const err = e as { error?: { message?: string } };
    this.intActionErr.set(err?.error?.message ?? (e instanceof Error ? e.message : fallback));
  }

  private loadIntegrations(): void {
    this.intLoading.set(true);
    this.intErr.set(null);
    this.api.listIntegrations().subscribe({
      next: (r) => {
        this.integrations.set(r.integrations);
        this.intLoading.set(false);
      },
      error: (e: unknown) => {
        this.intErr.set(e instanceof Error ? e.message : 'Failed to load integrations');
        this.intLoading.set(false);
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

  protected toggleSecrets(): void {
    this.showSecrets.update((v) => !v);
  }

  protected copy(text: string): void {
    void navigator.clipboard.writeText(text);
  }

  protected copyHint(): void {
    void navigator.clipboard.writeText(
      'Client secret is only shown once when you create the application. Rotate flow not implemented.',
    );
  }
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
