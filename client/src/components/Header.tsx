import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";

// Study Options leads first (the main student action route). About is
// deprioritised, not removed. Contact is intentionally not listed here — it
// pointed to the exact same /contact destination as the "Get Started" button
// below, so it was a duplicate entry rather than a distinct page; /contact
// itself is untouched and still reachable via Get Started.
const navItems = [
  { label: "Study Options", href: "/study-options" },
  { label: "Educational Partners", href: "/partners" },
  { label: "Counsellors", href: "/counsellors" },
  { label: "Learning Hub", href: "/learning-hub" },
  { label: "Events", href: "/events" },
  { label: "About", href: "/about" },
  { label: "Student Portal", href: "/portal" },
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
      <div className="container relative flex items-center justify-between h-20 lg:h-24">
     <Link href="/" className="relative flex items-center">
       <img
          src="/manus-storage/wsa_logo_beb199d6.png"
          alt="World Student Advisors"
          className="h-16 lg:h-[4.5rem] w-auto"
        />
      </Link>

        {/* Desktop Navigation */}
        <nav className="relative hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-semibold tracking-wide uppercase transition-colors duration-200 ${
                isTransparent
                  ? "text-white/95 hover:text-white font-bold [text-shadow:0_1px_4px_rgba(0,0,0,0.6),0_0px_2px_rgba(0,0,0,0.3)]"
                  : "text-wsa-navy/70 hover:text-wsa-navy"
              } ${location === item.href ? "!text-wsa-red" : ""}`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="ml-4 px-6 py-2.5 bg-wsa-red text-white text-[13px] font-semibold tracking-wide uppercase transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
          >
            Get Started
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`relative lg:hidden p-2 transition-colors ${
            isTransparent ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]" : "text-wsa-navy"
          }`}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-border/40">
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
              Get Started
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
