import { TELLA_EMBED_URL } from "@/lib/site-constants";

export function WalkthroughSlot() {
  const embedUrl = TELLA_EMBED_URL.trim();
  if (!embedUrl) {
    return null;
  }

  return (
    <section className="walkthrough-slot" aria-label="Product walkthrough">
      <p className="content-eyebrow">Walkthrough</p>
      <div className="walkthrough-embed-wrap">
        <iframe
          title="Viral Radar walkthrough"
          src={embedUrl}
          className="walkthrough-embed"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </section>
  );
}
