import type { Doc, Id } from "../_generated/dataModel";

/** Job is still writable for brand/inference updates during readSite. */
export function activeScanJobForBrand(
  job: Doc<"scanJobs"> | null,
  brandId: Id<"brands">,
): job is Doc<"scanJobs"> {
  if (!job || job.brandId !== brandId) {
    return false;
  }
  return (
    job.status === "pending" ||
    job.status === "running" ||
    job.status === "waiting"
  );
}
