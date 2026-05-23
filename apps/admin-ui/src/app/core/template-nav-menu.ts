/**
 * Template sidebar keys — keep in sync with `apps/services/admin-ui-api/src/routes/admin-nav-visibility.ts`
 * `TEMPLATE_NAV_MENU_KEYS` and OpenAPI enums.
 */
export const TEMPLATE_NAV_MENU_KEYS = [
  'authentication_pages',
  'error_pages',
  'user_profile',
  'landing',
  'iconography',
  'tables',
  'tanstack_table',
  'blank_page',
] as const;

export type TemplateNavMenuKey = (typeof TEMPLATE_NAV_MENU_KEYS)[number];

export const TEMPLATE_NAV_MENU_LABELS: Record<TemplateNavMenuKey, string> = {
  authentication_pages: 'Authentication pages',
  error_pages: 'Error pages',
  user_profile: 'User profile',
  landing: 'Landing',
  iconography: 'Iconography',
  tables: 'Tables',
  tanstack_table: 'TanStack table',
  blank_page: 'Blank page',
};

/** Default when API row is missing or invalid: hide every template section. */
export function defaultHiddenTemplateNavKeys(): TemplateNavMenuKey[] {
  return [...TEMPLATE_NAV_MENU_KEYS];
}
