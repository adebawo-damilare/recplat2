/** Work arrangement for vacancies (stored as snake_case in API + DB). */

export const JOB_TYPES = ["full_time", "hybrid", "part_time", "remote"] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: "Full-Time",
  hybrid: "Hybrid",
  part_time: "Part-Time",
  remote: "Remote",
};

export const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = JOB_TYPES.map((value) => ({
  value,
  label: JOB_TYPE_LABELS[value],
}));

const ALLOWED = new Set<string>(JOB_TYPES);

export function isJobType(value: string): value is JobType {
  return ALLOWED.has(value);
}

export function jobTypeLabel(value: JobType): string {
  return JOB_TYPE_LABELS[value];
}

export function parseJobTypeRequired(value: unknown): { ok: true; value: JobType } | { ok: false; message: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, message: "jobType is required." };
  }
  const normalized = value.trim().toLowerCase();
  if (!isJobType(normalized)) {
    return {
      ok: false,
      message: "Invalid jobType. Allowed values: full_time, hybrid, part_time, remote.",
    };
  }
  return { ok: true, value: normalized };
}
