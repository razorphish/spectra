/** Top-level routes before the API Documentation menu. */
export const primaryNavLinksBeforeDocs = [{ path: '/use-cases', label: 'Use Cases' }] as const;

/** Top-level routes after Data, before Sandbox. */
export const primaryNavLinksAfterDocs = [
  { path: '/production-access', label: 'Production Access' },
  { path: '/support', label: 'Support' },
] as const;

/**
 * API Documentation sections — each `fragment` maps to `GET /docs#&lt;fragment&gt;`.
 */
export const docsNavItems = [
  { fragment: 'get-started', label: 'Get Started' },
  { fragment: 'explore-the-api', label: 'Explore the API' },
  { fragment: 'get-started-with-sandbox', label: 'Get Started with Sandbox' },
  { fragment: 'integrations', label: 'Integrations' },
  { fragment: 'authorization', label: 'Authorization' },
  { fragment: 'consuming-the-data', label: 'Consuming the Data' },
  { fragment: 'calling-the-api', label: 'Calling the API' },
  { fragment: 'optimizing-your-application', label: 'Optimizing Your Application' },
  { fragment: 'implementation-guides', label: 'Implementation Guides' },
] as const satisfies ReadonlyArray<{
  fragment: string;
  label: string;
}>;

/**
 * Data submenu — fragments on `/data`.
 */
export const dataNavItems = [
  { fragment: 'overview', label: 'Overview' },
  { fragment: 'understanding-the-data', label: 'Understanding the Data' },
  { fragment: 'resources', label: 'Resources' },
] as const;

export type FooterLink = {
  path: string;
  label: string;
  fragment?: string;
};

/** Footer columns (internal routes + optional fragments). */
export const footerColumns: readonly { title: string; links: readonly FooterLink[] }[] = [
  {
    title: 'Solutions',
    links: [
      { path: '/', label: 'Overview' },
      { path: '/use-cases', label: 'Use Cases' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { path: '/docs', label: 'API Documentation' },
      { path: '/docs', label: 'Get Started', fragment: 'get-started' },
      { path: '/support', label: 'Support' },
    ],
  },
  {
    title: 'Data',
    links: [
      { path: '/data', label: 'Overview', fragment: 'overview' },
      { path: '/data', label: 'Understanding the Data', fragment: 'understanding-the-data' },
      { path: '/data', label: 'Resources', fragment: 'resources' },
    ],
  },
  {
    title: 'Company',
    links: [{ path: '/production-access', label: 'Production Access' }],
  },
];
