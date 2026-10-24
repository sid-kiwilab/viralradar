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
      <div className="header-spacer" aria-hidden />
    </header>
  );
}
