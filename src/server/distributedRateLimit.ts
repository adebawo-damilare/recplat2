/**
 * Distributed rate limiting via Upstash when env vars are set;
 * falls back to in-memory limiting for local dev without Redis.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { enforceRateLimit as enforceMemoryRateLimit } from "./rateLimit";

export type RateLimitBackend = "upstash" | "memory";

export interface DistributedRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  backend: RateLimitBackend;
}

const WINDOW_MS = 60_000;
const JOBS_MAX = 120;

let jobsLimiter: Ratelimit | null | undefined;

function getJobsLimiter(): Ratelimit | null {
  if (jobsLimiter !== undefined) return jobsLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    jobsLimiter = null;
    return null;
  }

  const redis = new Redis({ url, token });
  jobsLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(JOBS_MAX, "60 s"),
    analytics: false,
    prefix: "talentbridge:api:jobs",
  });
  return jobsLimiter;
}

/** Rate limit key should already include route prefix (see getClientKey). */
export async function enforceJobsApiRateLimit(identifier: string): Promise<DistributedRateLimitResult> {
  const limiter = getJobsLimiter();
  if (limiter) {
    const result = await limiter.limit(identifier);
    return {
      allowed: result.success,
      remaining: Math.max(0, result.remaining),
      resetAt: result.reset,
      backend: "upstash",
    };
  }

  const local = enforceMemoryRateLimit(identifier, {
    maxRequests: JOBS_MAX,
    windowMs: WINDOW_MS,
  });

  return {
    allowed: local.allowed,
    remaining: Math.max(0, local.remaining),
    resetAt: local.resetAt,
    backend: "memory",
  };
}
