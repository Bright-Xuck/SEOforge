// @forge/ai-engine/health-tracker
// Tracks provider health status over time.

import type { HealthStatus, ProviderHealthRecord } from "./types.js";

interface MutableHealthCheck {
  status: HealthStatus;
  latency: number;
  lastChecked: number;
  consecutiveFailures: number;
  errorRate: number;
  message?: string;
}

interface MutableProviderRecord {
  providerId: string;
  checks: MutableHealthCheck[];
  uptimePercentage: number;
  averageLatency: number;
  lastError?: string;
  lastErrorAt?: number;
}

export class HealthTracker {
  private records: Map<string, MutableProviderRecord> = new Map();
  private readonly windowSize: number;

  constructor(windowSize = 100) {
    this.windowSize = windowSize;
  }

  recordCheck(
    providerId: string,
    status: HealthStatus,
    latency: number,
    errorMessage?: string,
  ): MutableHealthCheck {
    const check: MutableHealthCheck = {
      status,
      latency,
      lastChecked: Date.now(),
      consecutiveFailures: status === "unhealthy" ? 1 : 0,
      errorRate: status === "unhealthy" || status === "degraded" ? 1 : 0,
      message: errorMessage,
    };

    const existing = this.records.get(providerId);
    if (existing) {
      if (status === "unhealthy") {
        const lastCheck = existing.checks[existing.checks.length - 1];
        check.consecutiveFailures = lastCheck
          ? lastCheck.consecutiveFailures + 1
          : 1;
      }

      existing.checks.push(check);

      if (errorMessage) {
        existing.lastError = errorMessage;
        existing.lastErrorAt = check.lastChecked;
      }

      if (existing.checks.length > this.windowSize) {
        existing.checks = existing.checks.slice(-this.windowSize);
      }

      this.recalculate(providerId);
    } else {
      const record: MutableProviderRecord = {
        providerId,
        checks: [check],
        uptimePercentage: status === "healthy" || status === "degraded" ? 100 : 0,
        averageLatency: latency,
        lastError: errorMessage,
        lastErrorAt: errorMessage ? check.lastChecked : undefined,
      };
      this.records.set(providerId, record);
    }

    return check;
  }

  getHealth(providerId: string): ProviderHealthRecord | undefined {
    const record = this.records.get(providerId);
    if (!record) return undefined;
    return {
      providerId: record.providerId,
      checks: record.checks.map((c) => ({
        status: c.status,
        latency: c.latency,
        lastChecked: c.lastChecked,
        consecutiveFailures: c.consecutiveFailures,
        errorRate: c.errorRate,
        message: c.message,
      })),
      uptimePercentage: record.uptimePercentage,
      averageLatency: record.averageLatency,
      lastError: record.lastError,
      lastErrorAt: record.lastErrorAt,
    };
  }

  getStatus(providerId: string): HealthStatus {
    const record = this.records.get(providerId);
    if (!record || record.checks.length === 0) return "unknown";

    const recent = record.checks.slice(-10);
    const failures = recent.filter((c) => c.status !== "healthy").length;
    const ratio = failures / recent.length;

    if (ratio === 0) return "healthy";
    if (ratio <= 0.05) return "degraded";
    return "unhealthy";
  }

  isHealthy(providerId: string, threshold = 0.95): boolean {
    const record = this.records.get(providerId);
    if (!record || record.checks.length === 0) return true;

    const recent = record.checks.slice(-20);
    const failures = recent.filter((c) => c.status !== "healthy").length;
    return failures / recent.length <= 1 - threshold;
  }

  getAllHealth(): ProviderHealthRecord[] {
    return Array.from(this.records.values()).map((r) => ({
      providerId: r.providerId,
      checks: r.checks.map((c) => ({
        status: c.status,
        latency: c.latency,
        lastChecked: c.lastChecked,
        consecutiveFailures: c.consecutiveFailures,
        errorRate: c.errorRate,
        message: c.message,
      })),
      uptimePercentage: r.uptimePercentage,
      averageLatency: r.averageLatency,
      lastError: r.lastError,
      lastErrorAt: r.lastErrorAt,
    }));
  }

  getHealthyProviders(threshold = 0.95): string[] {
    return Array.from(this.records.entries())
      .filter(([, record]) => {
        if (record.checks.length === 0) return true;
        const recent = record.checks.slice(-20);
        const failures = recent.filter((c) => c.status !== "healthy").length;
        return failures / recent.length <= 1 - threshold;
      })
      .map(([id]) => id);
  }

  getUnhealthyProviders(): string[] {
    return Array.from(this.records.entries())
      .filter(([, record]) => {
        if (record.checks.length === 0) return false;
        const recent = record.checks.slice(-10);
        const failures = recent.filter((c) => c.status !== "healthy").length;
        return failures / recent.length > 0.05;
      })
      .map(([id]) => id);
  }

  private recalculate(providerId: string): void {
    const record = this.records.get(providerId);
    if (!record || record.checks.length === 0) return;

    const totalChecks = record.checks.length;
    const healthyChecks = record.checks.filter(
      (c) => c.status === "healthy" || c.status === "degraded",
    ).length;
    const totalLatency = record.checks.reduce((s, c) => s + c.latency, 0);

    record.uptimePercentage = (healthyChecks / totalChecks) * 100;
    record.averageLatency = totalLatency / totalChecks;
  }

  clear(): void {
    this.records.clear();
  }
}