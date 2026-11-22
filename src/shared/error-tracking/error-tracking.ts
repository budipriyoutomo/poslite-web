/**
 * Error tracking (P1-7): Sentry or a Sentry-compatible server (GlitchTip). Off without
 * NEXT_PUBLIC_SENTRY_DSN, and then the SDK is never downloaded, so the offline POS bundle stays the
 * same. Events carry `device_id` and `outlet_id` tags only: no request bodies, headers, cookies or
 * user, because carts and sync payloads hold guest names and payment references.
 */

export interface ErrorTrackingConfig {
  dsn: string;
  environment: string;
  release: string;
}

interface SentryLike {
  init: (options: {
    dsn: string;
    environment: string;
    release: string;
    sendDefaultPii: boolean;
    tracesSampleRate: number;
    beforeSend: <T>(event: T) => T;
    beforeBreadcrumb: <T>(breadcrumb: T) => T;
  }) => void;
}

type Loader = () => Promise<SentryLike>;

const REQUEST_KEPT = new Set(["url", "method"]);

function stripBody<T>(breadcrumb: T): T {
  if (typeof breadcrumb !== "object" || breadcrumb === null) return breadcrumb;
  const data = (breadcrumb as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return breadcrumb;
  const kept: Record<string, unknown> = { ...data };
  for (const key of ["body", "request_body", "response_body"]) delete kept[key];
  return { ...breadcrumb, data: kept };
}

/** `beforeSend`: keep the error, where it happened and the device tags; drop who and what was sent. */
export function scrubEvent<T>(event: T): T {
  if (typeof event !== "object" || event === null) return event;
  const scrubbed: Record<string, unknown> = { ...(event as Record<string, unknown>) };
  const { request, breadcrumbs } = scrubbed;
  delete scrubbed.user;
  delete scrubbed.request;
  delete scrubbed.breadcrumbs;
  if (typeof request === "object" && request !== null) {
    scrubbed.request = Object.fromEntries(Object.entries(request).filter(([key]) => REQUEST_KEPT.has(key)));
  }
  if (Array.isArray(breadcrumbs)) scrubbed.breadcrumbs = breadcrumbs.map(stripBody);
  return scrubbed as T;
}

export async function initErrorTracking(config: ErrorTrackingConfig, load: Loader): Promise<boolean> {
  if (!config.dsn) return false;
  const sentry = await load();
  sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: stripBody,
  });
  return true;
}
