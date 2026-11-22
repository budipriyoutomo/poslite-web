// @ts-check
// Serwist configurator mode: `serwist build` runs after `next build` so every prerendered POS route
// is precached (ADR-002 — `output: "export"` is not supported by @serwist/next).
import { readFile } from "node:fs/promises";

import { serwist } from "@serwist/next/config";

/**
 * P1-7: the error tracking SDK is only loaded through `import("@sentry/nextjs")` when
 * NEXT_PUBLIC_SENTRY_DSN is set, so its chunk stays out of the precache — otherwise every tablet
 * would download it at install even with tracking off. Offline, a failed import just leaves
 * tracking off (src/instrumentation-client.ts).
 * @type {import("@serwist/build").ManifestTransform}
 */
async function withoutErrorTrackingSdk(entries) {
  const kept = [];
  for (const entry of entries) {
    const isChunk = entry.url.startsWith(".next/static/chunks/") && entry.url.endsWith(".js");
    if (isChunk && (await readFile(entry.url, "utf8")).includes("sentry.javascript.")) continue;
    kept.push(entry);
  }
  return { manifest: kept, warnings: [] };
}

export default serwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  manifestTransforms: [withoutErrorTrackingSdk],
});
