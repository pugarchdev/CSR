/**
 * Standalone SLA Worker Process
 *
 * Runs SLA escalation sweeps independently of web server instances.
 * Ideal for multi-pod/clustered Kubernetes or ECS deployments where only
 * a single dedicated worker container should process recurring SLA escalation jobs.
 */

import dotenv from "dotenv";
dotenv.config();

import { runEscalationSweep } from "../services/slaSchedulerService";

async function main() {
  console.log("[SLA Worker] Starting standalone SLA escalation sweep...");
  const startTime = Date.now();

  try {
    const result = await runEscalationSweep();
    const durationMs = Date.now() - startTime;
    console.log(
      `[SLA Worker] Sweep completed in ${durationMs}ms | Processed: ${result.processed}, Escalated: ${result.escalated}, Failed: ${result.failed}`
    );
    process.exit(0);
  } catch (error) {
    console.error("[SLA Worker] Fatal error executing SLA sweep:", error);
    process.exit(1);
  }
}

void main();
