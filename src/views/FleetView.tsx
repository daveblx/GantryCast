import { Server as ServerIcon } from 'lucide-react';
import { useMemo } from 'react';
import { pct } from '../lib/format';
import type { Sample, Server, Telemetry } from '../types';
import { ServerCard } from '../components/ServerCard';
import { Button, Dot, EmptyState, Stat } from '../components/ui';

/**
 * Mean utilisation across every host that reported telemetry. A host that only
 * reported one of CPU or RAM still counts, using whichever value it has.
 */
function meanLoad(servers: Server[], telemetry: Record<string, Telemetry>): number | undefined {
  const samples: number[] = [];

  for (const server of servers) {
    const raw = telemetry[server.id];
    if (!raw) continue;
    const cpu = pct(raw.cpu);
    const ram = pct(raw.ram);
    const value = cpu !== undefined && ram !== undefined ? (cpu + ram) / 2 : (cpu ?? ram);
    if (value !== undefined) samples.push(value);
  }

  if (!samples.length) return undefined;
  return samples.reduce((total, value) => total + value, 0) / samples.length;
}

export function FleetView({
  servers,
  loading,
  search,
  telemetry,
  history,
  onAddHost,
  onOpenTerminal,
  onOpenSettings,
  onDelete,
  onNuke,
  onRefresh,
}: {
  servers: Server[];
  loading: boolean;
  search: string;
  telemetry: Record<string, Telemetry>;
  history: Record<string, Sample[]>;
  onAddHost: () => void;
  onOpenTerminal: (server: Server) => void;
  onOpenSettings: (server: Server) => void;
  onDelete: (id: string) => void;
  onNuke: (server: Server) => void;
  onRefresh: (id: string) => void;
}) {
  const online = servers.filter((server) => server.status === 'online').length;
  const dockerHosts = servers.filter((server) => server.installed?.docker).length;
  const k8sNodes = servers.filter((server) => server.installed?.k8s).length;
  const load = useMemo(() => meanLoad(servers, telemetry), [servers, telemetry]);

  const visible = useMemo(() => {
    const sorted = [...servers].sort((a, b) => {
      const aOnline = a.status === 'online' ? 1 : 0;
      const bOnline = b.status === 'online' ? 1 : 0;
      if (aOnline !== bOnline) return bOnline - aOnline;
      return a.name.localeCompare(b.name);
    });

    const query = search.trim().toLowerCase();
    if (!query) return sorted;

    return sorted.filter(
      (server) =>
        server.name.toLowerCase().includes(query) || server.host.toLowerCase().includes(query),
    );
  }, [servers, search]);

  return (
    <div className="view">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Active Nodes"
          value={servers.length}
          foot={
            <>
              <Dot tone={online > 0 ? 'ok' : 'idle'} />
              {online} online
            </>
          }
        />
        <Stat
          label="Docker Hosts"
          value={dockerHosts}
          foot={
            <>
              <Dot tone={dockerHosts > 0 ? 'ok' : 'idle'} />
              runtime installed
            </>
          }
        />
        <Stat
          label="K8s Nodes"
          value={k8sNodes}
          foot={
            <>
              <Dot tone={k8sNodes > 0 ? 'ok' : 'idle'} />
              k3s present
            </>
          }
        />
        <Stat
          label="Resource Load"
          value={load === undefined ? '—' : load.toFixed(1)}
          unit={load === undefined ? undefined : '%'}
          foot={
            <>
              <Dot tone={load === undefined ? 'idle' : load >= 75 ? 'warn' : 'ok'} />
              mean CPU + RAM
            </>
          }
        />
      </div>

      {loading && servers.length === 0 ? (
        <div className="panel">
          <div className="panel__body row gap-2">
            <Dot tone="idle" />
            <span className="dim">Loading hosts…</span>
          </div>
        </div>
      ) : servers.length === 0 ? (
        <EmptyState
          icon={<ServerIcon size={18} strokeWidth={1.75} />}
          title="No hosts connected"
          text="Add a host over SSH to start collecting telemetry, containers and cluster state."
          action={
            <Button variant="primary" onClick={onAddHost}>
              Connect Initial Host
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<ServerIcon size={18} strokeWidth={1.75} />}
          title="No hosts match"
          text={`Nothing in the fleet matches “${search.trim()}”.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visible.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              telemetry={telemetry[server.id]}
              history={history[server.id] ?? []}
              onOpenTerminal={() => onOpenTerminal(server)}
              onOpenSettings={() => onOpenSettings(server)}
              onDelete={() => onDelete(server.id)}
              onNuke={() => onNuke(server)}
              onRefresh={() => onRefresh(server.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
