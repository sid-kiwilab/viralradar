import Link from "next/link";
import { Suspense } from "react";
import { SiteShell } from "@/components/site-shell";
import type { Id } from "@/convex/_generated/dataModel";
import { PostBreakdownClient } from "./post-breakdown-client";

function PostBreakdownFallback() {
  return (
    <div className="content-panel">
      <p className="content-note">Loading breakdown…</p>
    </div>
  );
}

async function PostBreakdownContent({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  return <PostBreakdownClient postId={postId as Id<"posts">} />;
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
