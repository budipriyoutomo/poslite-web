// Error tracking (P1-7), before the app becomes interactive. Off without NEXT_PUBLIC_SENTRY_DSN;
// the SDK is a separate chunk loaded only when it is on. Never lets tracking break the POS.
import { APP_VERSION } from "@/config/env";
import { getDb, readState } from "@/shared/db";
import { initErrorTracking } from "@/shared/error-tracking";

const loadSentry = () => import("@sentry/nextjs");

void (async () => {
  try {
    const on = await initErrorTracking(
      { dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "", environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? "development", release: APP_VERSION },
      loadSentry,
    );
    if (!on) return;
    const device = await readState(getDb(), "device");
    const sentry = await loadSentry();
    if (device?.mode === "server") sentry.setTags({ device_id: device.deviceId, outlet_id: device.outletId });
    else sentry.setTag("device_id", device?.mode ?? "not_activated");
  } catch {
    // tracking is best effort
  }
})();
