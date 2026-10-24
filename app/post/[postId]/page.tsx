import Link from "next/link";
import { Suspense } from "react";
import { SiteShell } from "@/components/site-shell";

async function PostBreakdownContent({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  return (
    <div className="content-panel job-panel">
      <p className="content-eyebrow">Breakdown</p>
      <h1 className="panel-h2 panel-title-spaced">Post analysis</h1>
      <p className="panel-body">
        Structural breakdown for post{" "}
        <code className="inline-code">{postId}</code> ships in a later build
        step.
      </p>
    </div>
  );
}

function PostBreakdownFallback() {
  return (
    <div className="content-panel">
      <p className="content-note">Loading breakdown…</p>
    </div>
  );
}

export default function PostBreakdownPage({
  params,
}: PageProps<"/post/[postId]">) {
  return (
    <SiteShell isLanding={false}>
      <Link href="/" className="btn btn-ghost page-back">
        Back
      </Link>
      <Suspense fallback={<PostBreakdownFallback />}>
        <PostBreakdownContent params={params} />
      </Suspense>
    </SiteShell>
  );
}
