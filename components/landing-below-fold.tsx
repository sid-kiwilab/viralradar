import Link from "next/link";

export function LandingBelowFold() {
  return (
    <footer className="demo-footer landing-below">
      <p className="content-note">
        Demo only.{" "}
        <Link href="/how-it-works" className="demo-footer-link">
          Check out how it works
        </Link>
        .
      </p>
    </footer>
  );
}
