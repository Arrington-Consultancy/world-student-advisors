import { afterEach, describe, expect, it, vi } from "vitest";
import { reportSignupConversion } from "../client/src/lib/googleAdsConversion";

const expectedPayload = {
  send_to: "AW-946725823/hviLCPiHkOMcEL_Ht8MD",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reportSignupConversion", () => {
  it("sends the Google Ads conversion through gtag when available", () => {
    const gtag = vi.fn();
    vi.stubGlobal("window", { gtag });

    reportSignupConversion();

    expect(gtag).toHaveBeenCalledWith("event", "conversion", expectedPayload);
  });

  it("queues the conversion on dataLayer when gtag has not loaded yet", () => {
    const dataLayer: unknown[][] = [];
    vi.stubGlobal("window", { dataLayer });

    reportSignupConversion();

    expect(dataLayer).toEqual([["event", "conversion", expectedPayload]]);
  });

  it("does nothing outside the browser", () => {
    vi.stubGlobal("window", undefined);

    expect(() => reportSignupConversion()).not.toThrow();
  });
});
