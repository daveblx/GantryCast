import type { Sample, Telemetry } from '../types';
import { num, pct } from './format';

/** How many samples to retain per server. 120 × 30s ≈ 1 hour. */
export const HISTORY_LIMIT = 120;

/**
 * Convert a raw telemetry payload into a chartable sample.
 *
 * `net_rx_mb` / `net_tx_mb` are cumulative counters since boot, so a rate can
 * only be derived by diffing against the previous sample. When the counter
 * appears to have gone backwards the interface was reset (reboot, or a NIC
 * coming back), so the rate is dropped rather than reported as negative.
 */
export function toSample(raw: Telemetry, ts: number, previous?: Sample): Sample {
  const rxMb = num(raw.net_rx_mb);
  const txMb = num(raw.net_tx_mb);

  let rxRate: number | undefined;
  let txRate: number | undefined;

  if (previous && previous.ts > 0 && ts > previous.ts) {
    const dt = (ts - previous.ts) / 1000;
    if (dt > 0.5) {
      if (rxMb !== undefined && previous.rxMb !== undefined && rxMb >= previous.rxMb) {
        rxRate = (rxMb - previous.rxMb) / dt;
      }
      if (txMb !== undefined && previous.txMb !== undefined && txMb >= previous.txMb) {
        txRate = (txMb - previous.txMb) / dt;
      }
    }
  }

  return {
    ts,
    cpu: pct(raw.cpu),
    ram: pct(raw.ram),
    load1: num(raw.load1),
    load5: num(raw.load5),
    load15: num(raw.load15),
    rxMb,
    txMb,
    rxRate,
    txRate,
  };
}

/** Append a sample, trimming to HISTORY_LIMIT. Returns a new array. */
export function appendSample(history: Sample[] | undefined, sample: Sample): Sample[] {
  const next = history ? [...history, sample] : [sample];
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
}

export function lastSample(history: Sample[] | undefined): Sample | undefined {
  return history && history.length ? history[history.length - 1] : undefined;
}

/** Mean of a numeric field across samples, ignoring gaps. */
export function average(history: Sample[] | undefined, key: keyof Sample): number | undefined {
  if (!history || !history.length) return undefined;
  let sum = 0;
  let count = 0;
  for (const sample of history) {
    const value = sample[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      sum += value;
      count += 1;
    }
  }
  return count ? sum / count : undefined;
}

/** Extract one field as a nullable series for charting. */
export function series(history: Sample[] | undefined, key: keyof Sample): Array<number | null> {
  if (!history) return [];
  return history.map((sample) => {
    const value = sample[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  });
}

/** Sum the latest value of a field across every server's history. */
export function fleetTotal(
  histories: Record<string, Sample[]>,
  key: keyof Sample,
): number | undefined {
  let total = 0;
  let seen = false;
  for (const history of Object.values(histories)) {
    const value = lastSample(history)?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      total += value;
      seen = true;
    }
  }
  return seen ? total : undefined;
}

/**
 * Align every server's series to a common length so they can be summed
 * index-by-index for a fleet-wide chart.
 */
export function alignedFleetSeries(
  histories: Record<string, Sample[]>,
  key: keyof Sample,
): number[] {
  const entries = Object.values(histories).filter((h) => h.length > 0);
  if (!entries.length) return [];
  const maxLen = Math.max(...entries.map((h) => h.length));
  const out: number[] = [];
  for (let i = 0; i < maxLen; i += 1) {
    let sum = 0;
    for (const history of entries) {
      const idx = history.length - maxLen + i;
      if (idx >= 0 && idx < history.length) {
        const value = history[idx][key];
        if (typeof value === 'number' && Number.isFinite(value)) sum += value;
      }
    }
    out.push(sum);
  }
  return out;
}
