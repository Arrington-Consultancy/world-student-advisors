import { afterEach, describe, expect, it, vi } from "vitest";
import { reportSignupConversion } from "../client/src/lib/googleAdsConversion";

const expectedPayload = {
  send_to: "AW-946725823/hviLCPiHkOMcEL_Ht8MD",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reportSignupConversion", () => {
  it("sends the Google Ads conversion through gtag when available", async () => {
    const gtag = vi.fn();
    vi.stubGlobal("window", { gtag });

    await reportSignupConversion();

    expect(gtag).toHaveBeenCalledWith("event", "conversion", expectedPayload);
  });

  it("queues the conversion on dataLayer when gtag has not loaded yet, as an arguments object", async () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", { dataLayer });

    await reportSignupConversion();

    // gtag.js runs only `arguments` objects as commands. Until 23 November
    // 2026 this fallback queued an Array, which it ignores (googleAdsTag.ts).
    expect(dataLayer).toHaveLength(1);
    expect(Object.prototype.toString.call(dataLayer[0])).toBe("[object Arguments]");
    expect(Array.from(dataLayer[0] as ArrayLike<unknown>)).toEqual(["event", "conversion", expectedPayload]);
  });

  it("does nothing outside the browser", async () => {
    vi.stubGlobal("window", undefined);

    await expect(reportSignupConversion()).resolves.toBeUndefined();
  });

  // Since 18 September 2026 the conversion can carry hashed user data. Called
  // with no contact, as it is here, it behaves exactly as it always did.
  it("sends the conversion alone when no contact details are given", async () => {
    const gtag = vi.fn();
    vi.stubGlobal("window", { gtag });

    await reportSignupConversion();

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "conversion", expectedPayload);
  });
});
