import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center py-32">
          <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-6">Page not found</p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold text-wsa-navy leading-[1.05] mb-8">
            404
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed mb-12 max-w-lg mx-auto">
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center px-8 py-4 bg-wsa-red text-white text-lg font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98]"
            >
              Back to homepage
              <ArrowRight className="ml-3" size={18} />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center px-8 py-4 border border-wsa-navy/20 text-wsa-navy text-lg font-medium transition-all duration-200 hover:border-wsa-navy/40"
            >
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

