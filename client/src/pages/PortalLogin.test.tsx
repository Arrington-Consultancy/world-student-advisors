import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
const mockMutate = vi.fn();

vi.mock("wouter", () => ({
  Link: ({
    href,
    className,
    children,
  }: {
    href: string;
    className?: string;
    children: ReactNode;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useLocation: () => ["/portal/login", mockNavigate],
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    portal: {
      login: {
        useMutation: () => ({
          mutate: mockMutate,
          isPending: false,
        }),
      },
    },
  },
}));

import PortalLogin from "./PortalLogin";

describe("PortalLogin Google auth error guidance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  function renderWithSearch(search: string) {
    vi.stubGlobal("window", {
      location: { search },
    });
    return renderToStaticMarkup(<PortalLogin />);
  }

  it("shows registration guidance for google_no_account with a contact link", () => {
    const markup = renderWithSearch("?error=google_no_account");

    expect(markup).toContain("No student portal account exists for that Google account.");
    expect(markup).toContain("Please contact WSA to complete your registration.");
    expect(markup).toContain('href="/contact"');
    expect(markup).toContain("Complete registration");
  });

  it("shows inactive-account guidance with a contact link", () => {
    const markup = renderWithSearch("?error=google_account_inactive");

    expect(markup).toContain("Your student portal account is inactive.");
    expect(markup).toContain("Please contact WSA for help reactivating it.");
    expect(markup).toContain('href="/contact"');
    expect(markup).toContain("Contact WSA");
  });

  it("shows conflict guidance with a contact link", () => {
    const markup = renderWithSearch("?error=google_account_conflict");

    expect(markup).toContain("this Google account does not match your student portal account details.");
    expect(markup).toContain("Please contact WSA for assistance.");
    expect(markup).toContain('href="/contact"');
    expect(markup).toContain("Contact WSA");
  });
});
