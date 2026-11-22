import { describe, expect, it, vi } from "vitest";

import { initErrorTracking, scrubEvent } from "./error-tracking";

describe("error tracking (P1-7)", () => {
  it("stays off without a DSN and never loads the SDK", async () => {
    const load = vi.fn();

    expect(await initErrorTracking({ dsn: "", environment: "test", release: "1.0.0" }, load)).toBe(false);
    expect(load).not.toHaveBeenCalled();
  });

  it("starts the SDK without personal data or tracing when a DSN is set", async () => {
    const init = vi.fn();

    expect(await initErrorTracking({ dsn: "https://k@o.example/1", environment: "staging", release: "1.2.0" }, async () => ({ init }))).toBe(true);
    expect(init).toHaveBeenCalledWith(expect.objectContaining({ dsn: "https://k@o.example/1", environment: "staging", release: "1.2.0", sendDefaultPii: false, tracesSampleRate: 0 }));
  });

  it("keeps the error and its tags but drops request data, breadcrumbs' bodies and the user", () => {
    const event = {
      exception: { values: [{ type: "TypeError" }] },
      request: { url: "https://pos/sell", headers: { Authorization: "Bearer x" }, cookies: "a=b", data: "{}", query_string: "q=1" },
      user: { ip_address: "10.0.0.1" },
      tags: { device_id: "01D", outlet_id: "01O" },
      breadcrumbs: [{ category: "fetch", data: { url: "/api/v1/sync/push", body: "{\"customer_name\":\"Andi\"}" } }],
    };

    expect(scrubEvent(event)).toEqual({
      exception: { values: [{ type: "TypeError" }] },
      request: { url: "https://pos/sell" },
      tags: { device_id: "01D", outlet_id: "01O" },
      breadcrumbs: [{ category: "fetch", data: { url: "/api/v1/sync/push" } }],
    });
  });
});
