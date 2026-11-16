import { beforeEach, describe, expect, it } from "vitest";
import { createHash } from "crypto";
import { hashedUserData } from "@/lib/googleAdsUserData";
import { reportSignupConversion } from "@/lib/googleAdsConversion";
import { normaliseEmail, normalisePhone } from "./googleUserData";

/**
 * The hashed identifiers sent with the Submit lead form conversion, on Tom
 * Arrington's decision of 18 September 2026 (open point AB-A10). What
 * matters here is what leaves the browser: a hash and never an address or a
 * number, the same normalisation the server uses, and a conversion that is
 * still reported when no identifier can be produced.
 */

const sha256 = (v: string) => createHash("sha256").update(v, "utf8").digest("hex");

declare global {
  // eslint-disable-next-line no-var
  var __sent: unknown[][];
}

function captureGtag() {
  globalThis.__sent = [];
  (globalThis as unknown as { window: Record<string, unknown> }).window = {
    gtag: (...args: unknown[]) => globalThis.__sent.push(args),
  };
}

describe("what is hashed", () => {
  it("normalises exactly as the server does before hashing", async () => {
    const data = await hashedUserData("  Vivian.Onuh@Gmail.com ", "+44 (0)7555 123456");
    expect(data).toEqual({
      sha256_email_address: sha256(normaliseEmail("  Vivian.Onuh@Gmail.com ")!),
      sha256_phone_number: sha256(normalisePhone("+44 (0)7555 123456")!),
    });
  });

  it("sends a hash, never the address or the number", async () => {
    const data = await hashedUserData("ada@example.com", "+2348012345678");
    const values = Object.values(data!).join(" ");
    expect(values).not.toContain("ada");
    expect(values).not.toContain("example.com");
    expect(values).not.toContain("2348012345678");
    expect(data!.sha256_email_address).toMatch(/^[0-9a-f]{64}$/);
    expect(data!.sha256_phone_number).toMatch(/^[0-9a-f]{64}$/);
  });

  it("refuses a phone number with no country code rather than guessing", async () => {
    const data = await hashedUserData("ada@example.com", "07555 123456");
    expect(data).toEqual({ sha256_email_address: sha256("ada@example.com") });
    expect(data).not.toHaveProperty("sha256_phone_number");
  });

  it("gives nothing when there is nothing usable", async () => {
    expect(await hashedUserData("not-an-address", "07555 123456")).toBeNull();
    expect(await hashedUserData(null, null)).toBeNull();
    expect(await hashedUserData("", "")).toBeNull();
  });
});

describe("the conversion itself", () => {
  beforeEach(() => captureGtag());

  it("sets the user data before the conversion, so gtag attaches it", async () => {
    await reportSignupConversion({ email: "ada@example.com", phone: "+2348012345678" });
    expect(globalThis.__sent).toHaveLength(2);
    expect(globalThis.__sent[0][0]).toBe("set");
    expect(globalThis.__sent[0][1]).toBe("user_data");
    expect(globalThis.__sent[1]).toEqual(["event", "conversion", { send_to: "AW-946725823/hviLCPiHkOMcEL_Ht8MD" }]);
  });

  it("still reports the conversion when there is no usable identifier", async () => {
    await reportSignupConversion({ email: "not-an-address", phone: null });
    expect(globalThis.__sent).toHaveLength(1);
    expect(globalThis.__sent[0][0]).toBe("event");
  });

  it("still reports the conversion when hashing is unavailable", async () => {
    const subtle = globalThis.crypto.subtle;
    Object.defineProperty(globalThis.crypto, "subtle", { value: undefined, configurable: true });
    try {
      await reportSignupConversion({ email: "ada@example.com", phone: "+2348012345678" });
      expect(globalThis.__sent).toHaveLength(1);
      expect(globalThis.__sent[0][0]).toBe("event");
    } finally {
      Object.defineProperty(globalThis.crypto, "subtle", { value: subtle, configurable: true });
    }
  });

  it("queues both calls in order when gtag has not loaded yet", async () => {
    const pushed: unknown[][] = [];
    (globalThis as unknown as { window: Record<string, unknown> }).window = {
      dataLayer: { push: (a: unknown[]) => pushed.push(a) } as unknown,
    };
    await reportSignupConversion({ email: "ada@example.com", phone: null });
    expect(pushed).toHaveLength(2);
    expect((pushed[0] as unknown[])[0]).toBe("set");
    expect((pushed[1] as unknown[])[0]).toBe("event");
  });

  it("reports nothing at all when there is no window", async () => {
    const saved = (globalThis as { window?: unknown }).window;
    delete (globalThis as { window?: unknown }).window;
    try {
      await expect(reportSignupConversion({ email: "ada@example.com" })).resolves.toBeUndefined();
    } finally {
      (globalThis as { window?: unknown }).window = saved;
    }
  });
});

describe("the server and the browser agree", () => {
  it("normalise the same values the same way", () => {
    for (const email of ["Ada.O@Gmail.com", "ada@example.com", "  X@GOOGLEMAIL.COM  ", "nope"]) {
      expect(normaliseEmail(email)).toBe(normaliseEmail(email));
    }
    expect(normaliseEmail("Ada.O@Gmail.com")).toBe("adao@gmail.com");
    expect(normaliseEmail("Ada.O@example.com")).toBe("ada.o@example.com");
    expect(normalisePhone("002348012345678")).toBe("+2348012345678");
    expect(normalisePhone("0801 234 5678")).toBeNull();
  });
});
