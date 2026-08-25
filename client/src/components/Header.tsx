import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// `navLabel` overrides `label` for the compact desktop bar only — the full
// name is what's shown everywhere else (mobile menu, page headings).
// Interview Readiness Coach doesn't fit the desktop bar at full length, so
// it uses the IRC abbreviation there per the brief.
const navItems = [
  { label: "About", href: "/about" },
  { label: "Study Options", href: "/study-options" },
  { label: "Educational Partners", href: "/partners" },
  { label: "Counsellors", href: "/counsellors" },
  { label: "Staff Portal", href: "/staff-portal" },
  { label: "Events", href: "/events" },
  { label: "Student Support Library", href: "/student-support-library" },
  { label: "Interview Readiness Coach", navLabel: "IRC", href: "/portal/interview-coach" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  // Only the homepage has a full-viewport hero image where transparent header works
  const isHomepage = location === "/";
  // Header is "light" (white text) only on homepage AND not scrolled
  const isTransparent = isHomepage && !scrolled;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ease-out ${
        isTransparent
          ? ""
          : "bg-white/95 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.06)]"
      }`}
    >
     {/* Strong but subtle dark gradient behind header for readability over any hero image */}
      {isTransparent && (
        <div className="absolute inset-0 -bottom-12 bg-gradient-to-b from-black/50 via-black/25 to-transparent pointer-events-none" />
      )}
      {/* Not the shared .container (max-width 1320px) — the full nav row
          needs more room than the site's content width caps at; same
          responsive padding scale, just without that cap. */}
      <div className="relative mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12 flex items-center justify-between h-20 lg:h-24">
     <Link href="/" className="relative flex items-center shrink-0">
       <img
          src="/manus-storage/wsa_logo_beb199d6.png"
          alt="World Student Advisors"
          className="h-16 lg:h-[4.5rem] w-auto"
        />
      </Link>

        {/* Desktop Navigation. Bar only appears once there's genuinely room
            for every item at full length without compressing the logo —
            see the width math in the PR/commit description. Narrower
            desktops fall back to the (fully equivalent) mobile menu. */}
        <nav className="relative hidden min-[1680px]:flex items-center gap-4 2xl:gap-6 shrink-0">
          {navItems.map((item) => {
            const linkClassName = `whitespace-nowrap text-[12px] 2xl:text-[13px] font-semibold tracking-normal uppercase transition-colors duration-200 ${
              isTransparent
                ? "text-white/95 hover:text-white font-bold [text-shadow:0_1px_4px_rgba(0,0,0,0.6),0_0px_2px_rgba(0,0,0,0.3)]"
                : "text-wsa-navy/70 hover:text-wsa-navy"
            } ${location === item.href ? "!text-wsa-red" : ""}`;

            // An abbreviated navLabel (currently just IRC) needs an accessible
            // name beyond the abbreviation itself, plus a sighted hover/focus
            // hint — via aria-label and the existing Radix tooltip, not by
            // adding visible characters that would reopen the width problem
            // this abbreviation exists to avoid.
            if (item.navLabel) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link href={item.href} aria-label={item.label} className={linkClassName}>
                      {item.navLabel}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link key={item.href} href={item.href} className={linkClassName}>
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/contact"
            className="ml-2 px-5 py-2.5 bg-wsa-red text-white text-[12px] whitespace-nowrap font-semibold tracking-wide uppercase transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
          >
            Start Your Application
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`relative min-[1680px]:hidden p-2 transition-colors ${
            isTransparent ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]" : "text-wsa-navy"
          }`}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="min-[1680px]:hidden bg-white border-t border-border/40">
          <nav className="container py-8 flex flex-col gap-5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-base font-medium text-wsa-navy/80 hover:text-wsa-navy transition-colors ${
                  location === item.href ? "!text-wsa-red" : ""
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/contact"
              className="mt-4 px-6 py-3.5 bg-wsa-red text-white text-center font-semibold tracking-wide"
            >
              Start Your Application
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
