// api/_lib/http.mjs — one deadline policy for every outbound call.
//
// WHY THIS EXISTS. Each fetch() in api/ already sits inside a try/catch that
// maps a connection failure to a 502 with a readable message. None of them had
// a DEADLINE, and those are different failures: a third party that refuses the
// connection fails fast and lands in the catch, but one that accepts it and
// then stalls held the function open until Vercel killed it at maxDuration
// (30s on save-trip). That surfaces as a bare 504 with no error body and no log
// line of ours — the admin just sees the dashboard hang.
//
// An AbortSignal turns the second failure into the first: the fetch rejects,
// the existing catch runs, and the caller returns the same 502 it already
// documents. So this needs no new error handling anywhere — only a `signal`.
//
// Budgets are sized against save-trip's 30s ceiling, which is the tightest
// path: verify the session, read a file, write a file. 8 + 10 + 10 = 28s worst
// case, and any single stall now costs its own budget instead of all of it.

/** Session checks gate every admin request; fail fast so the UI can say so. */
export const AUTH_TIMEOUT_MS = 8000;

/** GitHub reads/writes carry a file body and are allowed to be slower. */
export const GITHUB_TIMEOUT_MS = 10000;

/** A full lead export is the largest payload we ever pull back. */
export const SUPABASE_QUERY_TIMEOUT_MS = 12000;

/** Email is never on the critical path of saving a lead — it may fail fast. */
export const EMAIL_TIMEOUT_MS = 8000;

/**
 * An AbortSignal that fires after `ms`.
 *
 * Wrapped rather than calling AbortSignal.timeout at each site so the whole
 * policy is readable in one place, and so a runtime without it degrades to no
 * timeout (today's behaviour) instead of throwing on module load.
 */
export function deadline(ms) {
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(ms)
    : undefined;
}
