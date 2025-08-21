/**
 * Creates a URL for a page
 * @param pageNameOrUrl - Either a page name (e.g., 'TradingDashboard') or a direct URL (e.g., '/trading')
 * @returns The formatted URL
 */
export const createPageUrl = (pageNameOrUrl: string): string => {
  // If it already starts with a slash, assume it's a direct URL
  if (pageNameOrUrl.startsWith('/')) {
    return pageNameOrUrl;
  }
  // Otherwise, convert to kebab-case URL
  return `/${pageNameOrUrl.toLowerCase().replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`;
};
