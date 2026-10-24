import Link from "next/link";
import { Suspense } from "react";

async function PostBreakdownContent({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  return (
    <>
      <h1 className="text-2xl font-semibold text-zinc-50">Breakdown</h1>
      <p className="text-zinc-400">
        Structural breakdown for post{" "}
        <code className="text-zinc-300">{postId}</code> ships in a later build
        step.
      </p>
    </>
  );
}

function PostBreakdownFallback() {
  return (
    <p className="text-zinc-500">Loading breakdown…</p>
  );
}

export default function PostBreakdownPage({
  params,
}: PageProps<"/post/[postId]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16 sm:px-8">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
        Back
      </Link>
      <Suspense fallback={<PostBreakdownFallback />}>
        <PostBreakdownContent params={params} />
      </Suspense>
    </main>
  );
}
