import { eq, sql } from 'drizzle-orm';

import { platformSettings } from '../schema/control-plane';
import type { SpectraDb } from './connection';

export type PlatformApiEndpoint = {
  /** Unique key: `METHOD:/path` */
  key: string;
  method: string;
  path: string;
  group: string;
  displayName: string;
  description: string;
  /** null = open (no auth required) */
  defaultScope: string | null;
  isImplemented: boolean;
  status: 'active' | 'planned';
};

// ─── Static Catalog ──────────────────────────────────────────────────────────

export const PLATFORM_API_CATALOG: readonly PlatformApiEndpoint[] = [
  // GROUP: health — open, no scope (5)
  { key: 'GET:/v1/platform/health', method: 'GET', path: '/v1/platform/health', group: 'health', displayName: 'Health check', description: 'Returns service health status.', defaultScope: null, isImplemented: true, status: 'active' },
  { key: 'GET:/v1/platform/ready', method: 'GET', path: '/v1/platform/ready', group: 'health', displayName: 'Readiness check', description: 'Returns service readiness and database connectivity.', defaultScope: null, isImplemented: true, status: 'active' },
  { key: 'GET:/v1/platform/info', method: 'GET', path: '/v1/platform/info', group: 'health', displayName: 'Service info', description: 'Returns service name and version.', defaultScope: null, isImplemented: true, status: 'active' },
  { key: 'GET:/v1/platform/status', method: 'GET', path: '/v1/platform/status', group: 'health', displayName: 'Platform status', description: 'Returns platform-wide operational status page.', defaultScope: null, isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/version', method: 'GET', path: '/v1/platform/version', group: 'health', displayName: 'API version', description: 'Returns the current API version and changelog URL.', defaultScope: null, isImplemented: false, status: 'planned' },

  // GROUP: catalog — open, no scope (5)
  { key: 'GET:/v1/platform/catalog/endpoints', method: 'GET', path: '/v1/platform/catalog/endpoints', group: 'catalog', displayName: 'API endpoint catalog', description: 'Full catalog of available platform API endpoints and their scope requirements.', defaultScope: null, isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/catalog/models', method: 'GET', path: '/v1/platform/catalog/models', group: 'catalog', displayName: 'AI model catalog', description: 'Available AI language models for endpoint generation.', defaultScope: null, isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/catalog/pricing', method: 'GET', path: '/v1/platform/catalog/pricing', group: 'catalog', displayName: 'Pricing catalog', description: 'Available pricing plans and rate structures.', defaultScope: null, isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/catalog/scopes', method: 'GET', path: '/v1/platform/catalog/scopes', group: 'catalog', displayName: 'Scope catalog', description: 'All available OAuth scopes and their descriptions.', defaultScope: null, isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/catalog/openapi', method: 'GET', path: '/v1/platform/catalog/openapi', group: 'catalog', displayName: 'OpenAPI spec', description: 'Merged OpenAPI specification for the full platform API.', defaultScope: null, isImplemented: false, status: 'planned' },

  // GROUP: tenant — platform:read (15, 3 implemented)
  { key: 'GET:/v1/platform/tenant/profile', method: 'GET', path: '/v1/platform/tenant/profile', group: 'tenant', displayName: 'Tenant profile', description: "Calling tenant's runtime profile: display name, trust tier, external ref, status.", defaultScope: 'platform:read', isImplemented: true, status: 'active' },
  { key: 'GET:/v1/platform/tenant/organization', method: 'GET', path: '/v1/platform/tenant/organization', group: 'tenant', displayName: 'Organization info', description: "Tenant's organization details.", defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/tenant/usage-summary', method: 'GET', path: '/v1/platform/tenant/usage-summary', group: 'tenant', displayName: 'Usage summary', description: 'Aggregated usage metrics for the last 30 days, broken down by dimension.', defaultScope: 'platform:read', isImplemented: true, status: 'active' },
  { key: 'GET:/v1/platform/tenant/usage-events', method: 'GET', path: '/v1/platform/tenant/usage-events', group: 'tenant', displayName: 'Usage events', description: 'Paginated list of raw usage events for the tenant.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/tenant/endpoints', method: 'GET', path: '/v1/platform/tenant/endpoints', group: 'tenant', displayName: 'Tenant endpoints', description: 'AI endpoints registered to the tenant with production status.', defaultScope: 'platform:read', isImplemented: true, status: 'active' },
  { key: 'GET:/v1/platform/tenant/endpoints/:slug', method: 'GET', path: '/v1/platform/tenant/endpoints/:slug', group: 'tenant', displayName: 'Tenant endpoint detail', description: 'Detail for a specific AI endpoint by slug.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/tenant/integrations', method: 'GET', path: '/v1/platform/tenant/integrations', group: 'tenant', displayName: 'Tenant integrations', description: 'Integrations associated with the tenant.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/tenant/integrations/:id', method: 'GET', path: '/v1/platform/tenant/integrations/:id', group: 'tenant', displayName: 'Integration detail', description: 'Detail for a specific integration.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/tenant/pricing', method: 'GET', path: '/v1/platform/tenant/pricing', group: 'tenant', displayName: 'Tenant pricing', description: 'Effective pricing policy for the tenant.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/tenant/trust-tier', method: 'GET', path: '/v1/platform/tenant/trust-tier', group: 'tenant', displayName: 'Trust tier', description: "Tenant's custom endpoint trust tier level.", defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/tenant/status', method: 'GET', path: '/v1/platform/tenant/status', group: 'tenant', displayName: 'Tenant status', description: 'Current operational status of the tenant account.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/tenant/audit-log', method: 'GET', path: '/v1/platform/tenant/audit-log', group: 'tenant', displayName: 'Audit log', description: 'Paginated audit trail of actions on the tenant.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/tenant/quota', method: 'GET', path: '/v1/platform/tenant/quota', group: 'tenant', displayName: 'Quota', description: 'Current quota limits and consumption for the tenant.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/tenant/rate-limits', method: 'GET', path: '/v1/platform/tenant/rate-limits', group: 'tenant', displayName: 'Rate limits', description: 'Effective rate limit policies for the tenant.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/tenant/members', method: 'GET', path: '/v1/platform/tenant/members', group: 'tenant', displayName: 'Members', description: 'Users who are members of the tenant organization.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },

  // GROUP: ai-endpoints — platform:read (10, 1 implemented)
  { key: 'GET:/v1/platform/hello', method: 'GET', path: '/v1/platform/hello', group: 'ai-endpoints', displayName: 'Auth check (hello)', description: 'Validates M2M token and returns principal. Use to test authentication.', defaultScope: 'platform:read', isImplemented: true, status: 'active' },
  { key: 'GET:/v1/platform/ai/endpoints', method: 'GET', path: '/v1/platform/ai/endpoints', group: 'ai-endpoints', displayName: 'List AI endpoints', description: 'All AI endpoints for the tenant with version and approval status.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/ai/endpoints/:slug', method: 'GET', path: '/v1/platform/ai/endpoints/:slug', group: 'ai-endpoints', displayName: 'AI endpoint detail', description: 'Detailed info for a specific AI endpoint including all versions.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/ai/endpoints/:slug/versions', method: 'GET', path: '/v1/platform/ai/endpoints/:slug/versions', group: 'ai-endpoints', displayName: 'Endpoint versions', description: 'Full revision history for a specific AI endpoint.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/ai/endpoints/:slug/openapi', method: 'GET', path: '/v1/platform/ai/endpoints/:slug/openapi', group: 'ai-endpoints', displayName: 'Endpoint OpenAPI', description: 'OpenAPI specification for a specific AI endpoint.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/ai/endpoints/:slug/usage', method: 'GET', path: '/v1/platform/ai/endpoints/:slug/usage', group: 'ai-endpoints', displayName: 'Endpoint usage', description: 'Usage metrics for a specific AI endpoint.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/ai/endpoints/:slug/metrics', method: 'GET', path: '/v1/platform/ai/endpoints/:slug/metrics', group: 'ai-endpoints', displayName: 'Endpoint metrics', description: 'Performance metrics (latency, error rate) for a specific AI endpoint.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/ai/endpoints/:slug/approval', method: 'GET', path: '/v1/platform/ai/endpoints/:slug/approval', group: 'ai-endpoints', displayName: 'Endpoint approval', description: 'Production approval request status for a specific AI endpoint.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/ai/models', method: 'GET', path: '/v1/platform/ai/models', group: 'ai-endpoints', displayName: 'AI models', description: 'AI models available for endpoint generation.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/ai/models/:id', method: 'GET', path: '/v1/platform/ai/models/:id', group: 'ai-endpoints', displayName: 'AI model detail', description: 'Details for a specific AI model.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },

  // GROUP: invoke — custom_endpoints:invoke (5, 1 implemented)
  { key: 'POST:/v1/platform/tenant-runtime/endpoints/:slug/invoke', method: 'POST', path: '/v1/platform/tenant-runtime/endpoints/:slug/invoke', group: 'invoke', displayName: 'Invoke custom endpoint', description: 'Production invoke. Requires PAR approval and a pinned production revision.', defaultScope: 'custom_endpoints:invoke', isImplemented: true, status: 'active' },
  { key: 'POST:/v1/platform/ai/endpoints/:slug/invoke', method: 'POST', path: '/v1/platform/ai/endpoints/:slug/invoke', group: 'invoke', displayName: 'Invoke (sandbox)', description: 'Sandbox invoke without PAR requirement.', defaultScope: 'custom_endpoints:invoke', isImplemented: false, status: 'planned' },
  { key: 'POST:/v1/platform/ai/batch-invoke', method: 'POST', path: '/v1/platform/ai/batch-invoke', group: 'invoke', displayName: 'Batch invoke', description: 'Invoke multiple AI endpoints in a single request.', defaultScope: 'custom_endpoints:invoke', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/ai/endpoints/:slug/invoke/history', method: 'GET', path: '/v1/platform/ai/endpoints/:slug/invoke/history', group: 'invoke', displayName: 'Invocation history', description: 'Invocation history for a specific AI endpoint.', defaultScope: 'custom_endpoints:invoke', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/ai/endpoints/:slug/invoke/:requestId', method: 'GET', path: '/v1/platform/ai/endpoints/:slug/invoke/:requestId', group: 'invoke', displayName: 'Invocation detail', description: 'Details for a specific invocation request.', defaultScope: 'custom_endpoints:invoke', isImplemented: false, status: 'planned' },

  // GROUP: analytics — analytics:read (10)
  { key: 'GET:/v1/platform/analytics/overview', method: 'GET', path: '/v1/platform/analytics/overview', group: 'analytics', displayName: 'Analytics overview', description: 'High-level analytics summary for the tenant.', defaultScope: 'analytics:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/analytics/usage', method: 'GET', path: '/v1/platform/analytics/usage', group: 'analytics', displayName: 'Usage analytics', description: 'Time-series usage data for the tenant.', defaultScope: 'analytics:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/analytics/usage/by-endpoint', method: 'GET', path: '/v1/platform/analytics/usage/by-endpoint', group: 'analytics', displayName: 'Usage by endpoint', description: 'Usage broken down by AI endpoint.', defaultScope: 'analytics:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/analytics/usage/by-integration', method: 'GET', path: '/v1/platform/analytics/usage/by-integration', group: 'analytics', displayName: 'Usage by integration', description: 'Usage broken down by integration.', defaultScope: 'analytics:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/analytics/usage/daily', method: 'GET', path: '/v1/platform/analytics/usage/daily', group: 'analytics', displayName: 'Daily usage', description: 'Daily usage totals for the last 90 days.', defaultScope: 'analytics:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/analytics/usage/monthly', method: 'GET', path: '/v1/platform/analytics/usage/monthly', group: 'analytics', displayName: 'Monthly usage', description: 'Monthly usage totals for the last 12 months.', defaultScope: 'analytics:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/analytics/costs', method: 'GET', path: '/v1/platform/analytics/costs', group: 'analytics', displayName: 'Cost analytics', description: 'Cost breakdown for the tenant.', defaultScope: 'analytics:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/analytics/costs/breakdown', method: 'GET', path: '/v1/platform/analytics/costs/breakdown', group: 'analytics', displayName: 'Cost breakdown', description: 'Detailed cost breakdown by endpoint and dimension.', defaultScope: 'analytics:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/analytics/rate-limits', method: 'GET', path: '/v1/platform/analytics/rate-limits', group: 'analytics', displayName: 'Rate limit analytics', description: 'Rate limit hit frequency and patterns.', defaultScope: 'analytics:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/analytics/quota', method: 'GET', path: '/v1/platform/analytics/quota', group: 'analytics', displayName: 'Quota analytics', description: 'Quota utilization and projection data.', defaultScope: 'analytics:read', isImplemented: false, status: 'planned' },

  // GROUP: integrations — integrations:read (8)
  { key: 'GET:/v1/platform/integrations', method: 'GET', path: '/v1/platform/integrations', group: 'integrations', displayName: 'List integrations', description: 'All integrations for the organization.', defaultScope: 'integrations:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/integrations/:id', method: 'GET', path: '/v1/platform/integrations/:id', group: 'integrations', displayName: 'Integration detail', description: 'Details for a specific integration.', defaultScope: 'integrations:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/integrations/:id/scopes', method: 'GET', path: '/v1/platform/integrations/:id/scopes', group: 'integrations', displayName: 'Integration scopes', description: 'Scopes granted to a specific integration.', defaultScope: 'integrations:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/integrations/:id/tokens', method: 'GET', path: '/v1/platform/integrations/:id/tokens', group: 'integrations', displayName: 'Integration tokens', description: 'Active access token metadata for a specific integration.', defaultScope: 'integrations:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/integrations/:id/activity', method: 'GET', path: '/v1/platform/integrations/:id/activity', group: 'integrations', displayName: 'Integration activity', description: 'Recent API activity for a specific integration.', defaultScope: 'integrations:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/integrations/:id/production-access', method: 'GET', path: '/v1/platform/integrations/:id/production-access', group: 'integrations', displayName: 'Production access status', description: 'Production access request status for a specific integration.', defaultScope: 'integrations:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/integrations/:id/endpoints', method: 'GET', path: '/v1/platform/integrations/:id/endpoints', group: 'integrations', displayName: 'Integration endpoints', description: 'AI endpoints associated with a specific integration.', defaultScope: 'integrations:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/integrations/:id/usage', method: 'GET', path: '/v1/platform/integrations/:id/usage', group: 'integrations', displayName: 'Integration usage', description: 'Usage metrics for a specific integration.', defaultScope: 'integrations:read', isImplemented: false, status: 'planned' },

  // GROUP: billing — billing:read (7)
  { key: 'GET:/v1/platform/billing/profile', method: 'GET', path: '/v1/platform/billing/profile', group: 'billing', displayName: 'Billing profile', description: "Tenant billing profile and payment settings.", defaultScope: 'billing:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/billing/invoices', method: 'GET', path: '/v1/platform/billing/invoices', group: 'billing', displayName: 'Invoices', description: "List of tenant invoices.", defaultScope: 'billing:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/billing/invoices/:id', method: 'GET', path: '/v1/platform/billing/invoices/:id', group: 'billing', displayName: 'Invoice detail', description: 'Line items for a specific invoice.', defaultScope: 'billing:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/billing/current-period', method: 'GET', path: '/v1/platform/billing/current-period', group: 'billing', displayName: 'Current billing period', description: "Current billing period usage and projected charges.", defaultScope: 'billing:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/billing/usage-charges', method: 'GET', path: '/v1/platform/billing/usage-charges', group: 'billing', displayName: 'Usage charges', description: 'Itemized usage charges for the current period.', defaultScope: 'billing:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/billing/credits', method: 'GET', path: '/v1/platform/billing/credits', group: 'billing', displayName: 'Credits', description: "Tenant's available credit balance and history.", defaultScope: 'billing:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/billing/notifications', method: 'GET', path: '/v1/platform/billing/notifications', group: 'billing', displayName: 'Billing alerts', description: "Billing alert settings for the tenant.", defaultScope: 'billing:read', isImplemented: false, status: 'planned' },

  // GROUP: config — platform:read (6)
  { key: 'GET:/v1/platform/config/auth', method: 'GET', path: '/v1/platform/config/auth', group: 'config', displayName: 'Auth config', description: 'Authentication configuration for the platform.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/config/features', method: 'GET', path: '/v1/platform/config/features', group: 'config', displayName: 'Feature flags', description: 'Enabled platform features for the tenant.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/config/capabilities', method: 'GET', path: '/v1/platform/config/capabilities', group: 'config', displayName: 'Capabilities', description: 'Full set of platform capabilities available to the tenant.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/config/rate-limits', method: 'GET', path: '/v1/platform/config/rate-limits', group: 'config', displayName: 'Rate limit config', description: 'Rate limiting configuration for the platform API.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/config/models', method: 'GET', path: '/v1/platform/config/models', group: 'config', displayName: 'Model config', description: 'AI model availability and configuration.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/config/pricing-plans', method: 'GET', path: '/v1/platform/config/pricing-plans', group: 'config', displayName: 'Pricing plans', description: 'Available pricing plan structures.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },

  // GROUP: webhooks — webhooks:manage (7)
  { key: 'GET:/v1/platform/webhooks', method: 'GET', path: '/v1/platform/webhooks', group: 'webhooks', displayName: 'List webhooks', description: "All webhook configurations for the tenant.", defaultScope: 'webhooks:manage', isImplemented: false, status: 'planned' },
  { key: 'POST:/v1/platform/webhooks', method: 'POST', path: '/v1/platform/webhooks', group: 'webhooks', displayName: 'Create webhook', description: 'Creates a new webhook subscription.', defaultScope: 'webhooks:manage', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/webhooks/:id', method: 'GET', path: '/v1/platform/webhooks/:id', group: 'webhooks', displayName: 'Webhook detail', description: 'Details for a specific webhook.', defaultScope: 'webhooks:manage', isImplemented: false, status: 'planned' },
  { key: 'PATCH:/v1/platform/webhooks/:id', method: 'PATCH', path: '/v1/platform/webhooks/:id', group: 'webhooks', displayName: 'Update webhook', description: 'Updates an existing webhook configuration.', defaultScope: 'webhooks:manage', isImplemented: false, status: 'planned' },
  { key: 'DELETE:/v1/platform/webhooks/:id', method: 'DELETE', path: '/v1/platform/webhooks/:id', group: 'webhooks', displayName: 'Delete webhook', description: 'Deletes a webhook configuration.', defaultScope: 'webhooks:manage', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/webhooks/:id/deliveries', method: 'GET', path: '/v1/platform/webhooks/:id/deliveries', group: 'webhooks', displayName: 'Webhook deliveries', description: 'Delivery history for a specific webhook.', defaultScope: 'webhooks:manage', isImplemented: false, status: 'planned' },
  { key: 'POST:/v1/platform/webhooks/:id/test', method: 'POST', path: '/v1/platform/webhooks/:id/test', group: 'webhooks', displayName: 'Test webhook', description: 'Sends a test payload to the webhook URL.', defaultScope: 'webhooks:manage', isImplemented: false, status: 'planned' },

  // GROUP: api-keys — apikeys:manage (7)
  { key: 'GET:/v1/platform/api-keys', method: 'GET', path: '/v1/platform/api-keys', group: 'api-keys', displayName: 'List API keys', description: "All API keys for the tenant.", defaultScope: 'apikeys:manage', isImplemented: false, status: 'planned' },
  { key: 'POST:/v1/platform/api-keys', method: 'POST', path: '/v1/platform/api-keys', group: 'api-keys', displayName: 'Create API key', description: 'Creates a new API key.', defaultScope: 'apikeys:manage', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/api-keys/:id', method: 'GET', path: '/v1/platform/api-keys/:id', group: 'api-keys', displayName: 'API key detail', description: 'Metadata for a specific API key (value never returned).', defaultScope: 'apikeys:manage', isImplemented: false, status: 'planned' },
  { key: 'PATCH:/v1/platform/api-keys/:id', method: 'PATCH', path: '/v1/platform/api-keys/:id', group: 'api-keys', displayName: 'Update API key', description: 'Updates name or expiry for a specific API key.', defaultScope: 'apikeys:manage', isImplemented: false, status: 'planned' },
  { key: 'DELETE:/v1/platform/api-keys/:id', method: 'DELETE', path: '/v1/platform/api-keys/:id', group: 'api-keys', displayName: 'Revoke API key', description: 'Permanently revokes a specific API key.', defaultScope: 'apikeys:manage', isImplemented: false, status: 'planned' },
  { key: 'POST:/v1/platform/api-keys/:id/rotate', method: 'POST', path: '/v1/platform/api-keys/:id/rotate', group: 'api-keys', displayName: 'Rotate API key', description: 'Rotates a specific API key and returns the new value once.', defaultScope: 'apikeys:manage', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/api-keys/:id/usage', method: 'GET', path: '/v1/platform/api-keys/:id/usage', group: 'api-keys', displayName: 'API key usage', description: 'Usage metrics for a specific API key.', defaultScope: 'apikeys:manage', isImplemented: false, status: 'planned' },

  // GROUP: notifications — platform:read (5)
  { key: 'GET:/v1/platform/notifications', method: 'GET', path: '/v1/platform/notifications', group: 'notifications', displayName: 'List notifications', description: "All notifications for the tenant.", defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/notifications/:id', method: 'GET', path: '/v1/platform/notifications/:id', group: 'notifications', displayName: 'Notification detail', description: 'Details for a specific notification.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'PATCH:/v1/platform/notifications/:id/read', method: 'PATCH', path: '/v1/platform/notifications/:id/read', group: 'notifications', displayName: 'Mark as read', description: 'Marks a specific notification as read.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/notifications/preferences', method: 'GET', path: '/v1/platform/notifications/preferences', group: 'notifications', displayName: 'Notification preferences', description: "Tenant's notification preferences.", defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'PATCH:/v1/platform/notifications/preferences', method: 'PATCH', path: '/v1/platform/notifications/preferences', group: 'notifications', displayName: 'Update preferences', description: "Updates the tenant's notification preferences.", defaultScope: 'platform:read', isImplemented: false, status: 'planned' },

  // GROUP: team — team:read (5)
  { key: 'GET:/v1/platform/team/members', method: 'GET', path: '/v1/platform/team/members', group: 'team', displayName: 'Team members', description: "All members of the tenant's organization.", defaultScope: 'team:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/team/members/:id', method: 'GET', path: '/v1/platform/team/members/:id', group: 'team', displayName: 'Member detail', description: 'Details for a specific team member.', defaultScope: 'team:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/team/invitations', method: 'GET', path: '/v1/platform/team/invitations', group: 'team', displayName: 'Invitations', description: 'Pending team invitations.', defaultScope: 'team:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/team/roles', method: 'GET', path: '/v1/platform/team/roles', group: 'team', displayName: 'Roles', description: "Available roles within the tenant's organization.", defaultScope: 'team:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/team/activity', method: 'GET', path: '/v1/platform/team/activity', group: 'team', displayName: 'Team activity', description: 'Recent activity across all team members.', defaultScope: 'team:read', isImplemented: false, status: 'planned' },

  // GROUP: search — platform:read (5)
  { key: 'GET:/v1/platform/search', method: 'GET', path: '/v1/platform/search', group: 'search', displayName: 'Global search', description: 'Full-text search across endpoints, integrations, and resources.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/search/endpoints', method: 'GET', path: '/v1/platform/search/endpoints', group: 'search', displayName: 'Search endpoints', description: 'Searches AI endpoints by name, slug, or prompt.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/search/models', method: 'GET', path: '/v1/platform/search/models', group: 'search', displayName: 'Search models', description: 'Searches available AI models by name or provider.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/search/integrations', method: 'GET', path: '/v1/platform/search/integrations', group: 'search', displayName: 'Search integrations', description: 'Searches integrations by name or status.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
  { key: 'GET:/v1/platform/search/audit-log', method: 'GET', path: '/v1/platform/search/audit-log', group: 'search', displayName: 'Search audit log', description: 'Full-text search across the audit log.', defaultScope: 'platform:read', isImplemented: false, status: 'planned' },
] as const;

// ponytail: open endpoints are those with null defaultScope — no DB needed
export const OPEN_ENDPOINT_KEYS = new Set(
  PLATFORM_API_CATALOG.filter((e) => e.defaultScope === null).map((e) => e.key),
);

// ─── Scope Override Settings (platform_settings key-value) ───────────────────

const SCOPE_OVERRIDES_KEY = 'platform_api.scope_overrides';

type ScopeOverrides = Record<string, string | null>;

export async function fetchPlatformApiScopeOverrides(db: SpectraDb): Promise<ScopeOverrides> {
  const [row] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, SCOPE_OVERRIDES_KEY))
    .limit(1);
  if (!row) return {};
  const val = row.value;
  if (!val || typeof val !== 'object' || Array.isArray(val)) return {};
  return val as ScopeOverrides;
}

export async function setPlatformApiScopeOverride(
  db: SpectraDb,
  endpointKey: string,
  scope: string | null,
): Promise<void> {
  const current = await fetchPlatformApiScopeOverrides(db);
  const next = { ...current, [endpointKey]: scope };
  await db
    .insert(platformSettings)
    .values({ key: SCOPE_OVERRIDES_KEY, value: sql`${JSON.stringify(next)}::jsonb` })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value: sql`${JSON.stringify(next)}::jsonb` },
    });
}

/** Returns catalog with DB scope overrides applied. */
export async function getEffectivePlatformApiCatalog(
  db: SpectraDb,
): Promise<(PlatformApiEndpoint & { effectiveScope: string | null; isOverridden: boolean })[]> {
  const overrides = await fetchPlatformApiScopeOverrides(db);
  return PLATFORM_API_CATALOG.map((ep) => {
    const isOverridden = Object.prototype.hasOwnProperty.call(overrides, ep.key);
    const effectiveScope = isOverridden ? overrides[ep.key] ?? null : ep.defaultScope;
    return { ...ep, effectiveScope, isOverridden };
  });
}

/** All distinct scopes defined across the catalog (default values). */
export const KNOWN_CATALOG_SCOPES = [
  ...new Set(PLATFORM_API_CATALOG.map((e) => e.defaultScope).filter(Boolean)),
] as readonly (string | null)[];
