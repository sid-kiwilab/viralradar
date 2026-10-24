"use client";

import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { convex } from "./ConvexClientProvider";

function ConvexHealthStatus() {
  const health = useQuery(api.health.get);
  if (health === undefined) {
    return <>Connecting to Convex…</>;
  }
  return health.ok ? <>Convex connected.</> : <>Convex query did not return ok.</>;
}

export function HomeClient() {
  const [brandUrl, setBrandUrl] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16 sm:px-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
          Viral Radar
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          Find organic outliers in your niche
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-zinc-400">
          Paste a brand URL. We infer competitors, scrape recent TikTok posts,
          and rank what is breaking out relative to each account baseline.
        </p>
      </header>

      <div className="space-y-3">
        <label htmlFor="brand-url" className="sr-only">
          Brand URL
        </label>
        <input
          id="brand-url"
          name="brandUrl"
          type="url"
          placeholder="https://example.com"
          value={brandUrl}
          onChange={(event) => setBrandUrl(event.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 outline-none ring-zinc-600 focus:border-zinc-600 focus:ring-2"
        />
        <button
          type="button"
          disabled
          className="rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 opacity-50"
        >
          Scan (coming soon)
        </button>
      </div>

      <p className="text-sm text-zinc-500">
        {convex ? (
          mounted ? (
            <ConvexHealthStatus />
          ) : (
            "Connecting to Convex…"
          )
        ) : (
          "Set NEXT_PUBLIC_CONVEX_URL in .env.local (run npx convex dev)."
        )}
      </p>
    </main>
  );
}
