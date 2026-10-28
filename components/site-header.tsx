import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";

function LogoContent() {
  return (
    <>
      <LogoMark />
      <span>viralradar</span>
    </>
  );
}

export function SiteHeader({
  homeHref = "/",
  onHomeClick,
}: {
  homeHref?: string;
  onHomeClick?: () => void;
}) {
  return (
    <header className="header">
      {onHomeClick ? (
        <button
          type="button"
          className="logo logo-button"
          aria-label="Viral Radar home"
          onClick={onHomeClick}
        >
          <LogoContent />
        </button>
      ) : (
        <a href={homeHref} className="logo" aria-label="Viral Radar">
          <LogoContent />
        </a>
      )}
      <nav className="header-nav" aria-label="Site">
        <Link href="/how-it-works" className="header-nav-link">
          How it works
        </Link>
      </nav>
    </header>
  );
}
