/**
 * SLA Scheduler Service
 *
 * Maharashtra CSR Portal - Convergence Framework
 *
 * The SLAEscalationService can create escalation records and advance overdue
 * ones (`autoEscalate`), but nothing was invoking it periodically. This module
 * runs the escalation sweep on a fixed interval so the documented 5-3-2
 * time-bound escalation rule actually fires without manual intervention.
 *
 * Notes:
 * - Uses a simple in-process interval (no external queue infra required).
 * - Skips scheduling on serverless (Vercel) where long-lived timers don't run;
 *   there, the same sweep can be triggered via the admin endpoint or an
 *   external cron hitting POST /api/admin/sla/run-escalations.
 */

import SLAEscalationService from "./slaEscalationService";

/** How often to run the escalation sweep (default 1 hour). */
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

let timer: NodeJS.Timeout | null = null;
let running = false;

/**
 * Run a single escalation sweep. Safe to call directly (e.g. from an admin
 * endpoint or external cron). Guards against overlapping runs.
 */
export async function runEscalationSweep(): Promise<{
  processed: number;
  escalated: number;
  failed: number;
  skipped?: boolean;
}> {
  if (running) {
    return { processed: 0, escalated: 0, failed: 0, skipped: true };
  }

  running = true;
  try {
    const result = await SLAEscalationService.autoEscalate();
    if (result.escalated > 0 || result.failed > 0) {
      console.log(
        `[SLA Scheduler] Sweep complete: processed=${result.processed} escalated=${result.escalated} failed=${result.failed}`
      );
    }
    return result;
  } catch (error) {
    console.error("[SLA Scheduler] Sweep error:", error);
    return { processed: 0, escalated: 0, failed: 0 };
  } finally {
    running = false;
  }
}

/**
 * Start the recurring SLA escalation sweep.
 *
 * @param intervalMs - Interval between sweeps in milliseconds. Falls back to
 *   SLA_SWEEP_INTERVAL_MS env var, then a 1-hour default.
 */
export function startSlaScheduler(intervalMs?: number): void {
  // Do not schedule long-lived timers on serverless platforms.
  if (process.env.VERCEL) {
    console.log("[SLA Scheduler] Serverless environment detected - interval sweep disabled. Use POST /api/admin/sla/run-escalations.");
    return;
  }

  if (timer) {
    return; // already started
  }

  const envInterval = process.env.SLA_SWEEP_INTERVAL_MS
    ? parseInt(process.env.SLA_SWEEP_INTERVAL_MS, 10)
    : undefined;
  const interval = intervalMs || envInterval || DEFAULT_INTERVAL_MS;

  timer = setInterval(() => {
    void runEscalationSweep();
  }, interval);

  // Don't keep the process alive solely for the timer.
  if (typeof timer.unref === "function") {
    timer.unref();
  }

  console.log(`[SLA Scheduler] Started - sweeping overdue escalations every ${Math.round(interval / 1000)}s`);
}

/**
 * Stop the recurring sweep (used in tests / graceful shutdown).
 */
export function stopSlaScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
