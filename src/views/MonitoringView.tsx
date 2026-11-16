import {
  Activity,
  ArrowDown,
  ArrowUp,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  RefreshCw,
  Server as ServerIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { Badge, Dot, EmptyState, KV, Meter, Sparkline, Stat } from '../components/ui';
import { ago, fixed, pct, percent, rate, severityTone } from '../lib/format';
import { lastSample, series } from '../lib/telemetry';
import type { Sample, Server, Telemetry } from '../types';

/** Status dot tone for a host. */
function statusTone(status: Server['status']): 'ok' | 'warn' | 'err' | 'idle' {
  if (status === 'online') return 'ok';
  if (status === 'error') return 'err';
  return 'idle';
}

function statusBadgeTone(status: Server['status']): 'ok' | 'err' | 'muted' {
  if (status === 'online') return 'ok';
  if (status === 'error') return 'err';
  return 'muted';
}

/** One labelled metric with a sparkline and a utilisation meter. */
function MetricBlock({
  label,
  icon,
  value,
  values,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  value: number | undefined;
  values: Array<number | null>;
  color: string;
}) {
  return (
    <div className="col" style={{ gap: 5, minWidth: 0 }}>
      <div className="row row--between">
        <span className="label row" style={{ gap: 4 }}>
          {icon}
          {label}
        </span>
        <span className="num" style={{ fontSize: 13, fontWeight: 500 }}>
          {percent(value, 1)}
        </span>
      </div>
      <Sparkline values={values} height={34} color={color} fill grid min={0} max={100} />
      <Meter value={value} tone={severityTone(value)} />
    </div>
  );
}

/** Load averages. Each window is read from its own field — never a fallback. */
function LoadBlock({ sample }: { sample: Sample | undefined }) {
  const windows: Array<{ label: string; value: number | undefined }> = [
    { label: '1m', value: sample?.load1 },
    { label: '5m', value: sample?.load5 },
    { label: '15m', value: sample?.load15 },
  ];

  return (
    <div className="col" style={{ gap: 5, minWidth: 0 }}>
      <span className="label row" style={{ gap: 4 }}>
        <Activity size={12} strokeWidth={1.75} />
        load average
      </span>
      <div className="grid grid-cols-3 gap-2">
        {windows.map((window) => (
          <div className="col" key={window.label} style={{ gap: 1 }}>
            <span className="label">{window.label}</span>
            <span className="num" style={{ fontSize: 13 }}>
              {fixed(window.value, 2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Per-second throughput, derived from consecutive cumulative counters. */
function NetworkBlock({
  rxRate,
  txRate,
  rxValues,
  txValues,
}: {
  rxRate: number | undefined;
  txRate: number | undefined;
  rxValues: Array<number | null>;
  txValues: Array<number | null>;
}) {
  return (
    <div className="col" style={{ gap: 5, minWidth: 0 }}>
      <span className="label row" style={{ gap: 4 }}>
        <Network size={12} strokeWidth={1.75} />
        network
      </span>
      <div className="grid grid-cols-2 gap-2">
        <div className="col" style={{ gap: 2, minWidth: 0 }}>
          <div className="row row--between">
            <span className="label row" style={{ gap: 2 }}>
              <ArrowDown size={12} strokeWidth={1.75} />
              rx
            </span>
            <span className="num" style={{ fontSize: 10.5 }}>
              {rate(rxRate)}
            </span>
          </div>
          <Sparkline values={rxValues} height={26} color="var(--fg-muted)" />
        </div>
        <div className="col" style={{ gap: 2, minWidth: 0 }}>
          <div className="row row--between">
            <span className="label row" style={{ gap: 2 }}>
              <ArrowUp size={12} strokeWidth={1.75} />
              tx
            </span>
            <span className="num" style={{ fontSize: 10.5 }}>
              {rate(txRate)}
            </span>
          </div>
          <Sparkline values={txValues} height={26} color="var(--fg-faint)" />
        </div>
      </div>
    </div>
  );
}

function ServerPanel({
  server,
  telemetry,
  history,
}: {
  server: Server;
  telemetry: Telemetry | undefined;
  history: Sample[];
}) {
  const latest = lastSample(history);
  const raw = telemetry ?? server.telemetry;

  const cpuValues = useMemo(() => series(history, 'cpu'), [history]);
  const ramValues = useMemo(() => series(history, 'ram'), [history]);
  const rxValues = useMemo(() => series(history, 'rxRate'), [history]);
  const txValues = useMemo(() => series(history, 'txRate'), [history]);

  const disk = pct(raw?.disk);
  const docker = raw?.docker;
  const dockerPresent = !!docker && docker !== 'none';

  return (
    <div className="card">
      <div className="card__head">
        <span style={{ display: 'flex', alignItems: 'center', height: 16, flex: '0 0 auto' }}>
          <Dot tone={statusTone(server.status)} />
        </span>
        <div className="grow">
          <div className="card__title">{server.name}</div>
          <div className="card__meta truncate">
            {server.username}@{server.host}:{server.port}
          </div>
        </div>
        <Badge tone={statusBadgeTone(server.status)}>{server.status}</Badge>
      </div>

      <div className="card__body" style={{ gap: 10 }}>
        <div className="grid grid-cols-2 gap-3">
          <MetricBlock
            label="cpu"
            icon={<Cpu size={12} strokeWidth={1.75} />}
            value={latest?.cpu}
            values={cpuValues}
            color="var(--fg-muted)"
          />
          <MetricBlock
            label="memory"
            icon={<MemoryStick size={12} strokeWidth={1.75} />}
            value={latest?.ram}
            values={ramValues}
            color="var(--fg-muted)"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <LoadBlock sample={latest} />
          <NetworkBlock
            rxRate={latest?.rxRate}
            txRate={latest?.txRate}
            rxValues={rxValues}
            txValues={txValues}
          />
        </div>

        <div className="divider" />

        <div className="grid grid-cols-3 gap-3">
          <KV
            k={
              <span className="row" style={{ gap: 4 }}>
                <HardDrive size={12} strokeWidth={1.75} />
                disk /
              </span>
            }
            v={percent(disk)}
            title={
              raw?.disk_free || raw?.disk_total
                ? `${raw?.disk_free ?? '—'} free of ${raw?.disk_total ?? '—'}`
                : undefined
            }
          />
          <KV
            k="docker"
            v={dockerPresent ? 'present' : 'absent'}
            muted={!dockerPresent}
            title={dockerPresent ? docker : 'docker not reported by the host'}
          />
          <KV
            k={
              <span className="row" style={{ gap: 4 }}>
                <RefreshCw size={12} strokeWidth={1.75} />
                sync
              </span>
            }
            v={
              <span className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                <Dot tone={latest ? 'ok' : 'idle'} />
                {latest ? ago(latest.ts) : 'pending'}
              </span>
            }
            muted={!latest}
          />
        </div>
      </div>
    </div>
  );
}

export function MonitoringView({
  servers,
  telemetry,
  history,
  search,
}: {
  servers: Server[];
  telemetry: Record<string, Telemetry>;
  history: Record<string, Sample[]>;
  search: string;
}) {

  const aggregates = useMemo(() => {
    let cpuSum = 0;
    let cpuCount = 0;
    let ramSum = 0;
    let ramCount = 0;
    let reporting = 0;

    for (const server of servers) {
      const latest = lastSample(history[server.id]);
      if (!latest) continue;
      reporting += 1;
      if (typeof latest.cpu === 'number' && Number.isFinite(latest.cpu)) {
        cpuSum += latest.cpu;
        cpuCount += 1;
      }
      if (typeof latest.ram === 'number' && Number.isFinite(latest.ram)) {
        ramSum += latest.ram;
        ramCount += 1;
      }
    }

    return {
      cpu: cpuCount ? cpuSum / cpuCount : undefined,
      ram: ramCount ? ramSum / ramCount : undefined,
      reporting,
      total: servers.length,
      online: servers.filter((server) => server.status === 'online').length,
    };
  }, [servers, history]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return servers;
    return servers.filter(
      (server) =>
        server.name.toLowerCase().includes(needle) ||
        server.host.toLowerCase().includes(needle) ||
        server.username.toLowerCase().includes(needle),
    );
  }, [servers, search]);

  return (
    <div className="view">
      <div className="view__head">
        <div>
          <p className="view__sub">
            Per-host CPU, memory, load and network from the telemetry poll.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Average CPU"
          value={fixed(aggregates.cpu, 1)}
          unit="%"
          foot={`${aggregates.reporting} reporting`}
        />
        <Stat
          label="Average memory"
          value={fixed(aggregates.ram, 1)}
          unit="%"
          foot={`${aggregates.reporting} reporting`}
        />
        <Stat
          label="Active nodes"
          value={aggregates.reporting}
          foot={`of ${aggregates.total} configured`}
        />
        <Stat
          label="Total servers"
          value={aggregates.total}
          foot={`${aggregates.online} online`}
        />
      </div>

      {servers.length === 0 ? (
        <EmptyState
          icon={<ServerIcon size={14} strokeWidth={1.75} />}
          title="No hosts"
          text="Add a host to start collecting telemetry. Samples appear after the first poll."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<ServerIcon size={14} strokeWidth={1.75} />}
          title="No hosts match"
          text={`Nothing matches "${search.trim()}".`}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {visible.map((server) => (
            <ServerPanel
              key={server.id}
              server={server}
              telemetry={telemetry[server.id]}
              history={history[server.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
