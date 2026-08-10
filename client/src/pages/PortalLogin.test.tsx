// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

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
    children: unknown;
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
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
  });

  async function renderWithSearch(search: string) {
    window.history.replaceState({}, "", `/portal/login${search}`);
    await act(async () => {
      root.render(<PortalLogin />);
    });

    const alert = container.querySelector(".bg-red-50");
    expect(alert).not.toBeNull();
    return alert as HTMLDivElement;
  }

  it("shows registration guidance for google_no_account with a contact link", async () => {
    const alert = await renderWithSearch("?error=google_no_account");

    expect(alert.textContent).toContain("No student portal account exists for that Google account.");
    expect(alert.textContent).toContain("Please contact WSA to complete your registration.");
    const link = alert.querySelector('a[href="/contact"]');
    expect(link?.textContent).toContain("Complete registration");
  });

  it("shows inactive-account guidance with a contact link", async () => {
    const alert = await renderWithSearch("?error=google_account_inactive");

    expect(alert.textContent).toContain("Your student portal account is inactive.");
    expect(alert.textContent).toContain("Please contact WSA for help reactivating it.");
    const link = alert.querySelector('a[href="/contact"]');
    expect(link?.textContent).toContain("Contact WSA");
  });

  it("shows conflict guidance with a contact link", async () => {
    const alert = await renderWithSearch("?error=google_account_conflict");

    expect(alert.textContent).toContain("We couldn't sign you in because this Google account does not match your student portal account details.");
    expect(alert.textContent).toContain("Please contact WSA for assistance.");
    const link = alert.querySelector('a[href="/contact"]');
    expect(link?.textContent).toContain("Contact WSA");
  });
});
