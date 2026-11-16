export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  status: 'online' | 'offline' | 'error';
  installed: {
    docker: boolean;
    k8s: boolean;
  };
  telemetry?: Telemetry;
}

/** Raw payload from GET /api/servers/:id/telemetry. All values are strings. */
export interface Telemetry {
  cpu?: string;
  ram?: string;
  ram_total_mb?: string;
  ram_available_mb?: string;
  swap_used_mb?: string;
  disk?: string;
  disk_free?: string;
  disk_total?: string;
  disk_usage_all?: string;
  load1?: string;
  load5?: string;
  load15?: string;
  uptime_s?: string;
  /** Cumulative bytes received since boot, in MB. Not a rate. */
  net_rx_mb?: string;
  /** Cumulative bytes transmitted since boot, in MB. Not a rate. */
  net_tx_mb?: string;
  docker?: string;
  k3s?: string;
  error?: string;
}

/** One telemetry sample, normalised to numbers for charting. */
export interface Sample {
  ts: number;
  cpu?: number;
  ram?: number;
  load1?: number;
  load5?: number;
  load15?: number;
  /** Cumulative MB since boot. */
  rxMb?: number;
  txMb?: number;
  /** Derived MB/s, computed from consecutive cumulative samples. */
  rxRate?: number;
  txRate?: number;
}

export interface Cluster {
  id: string;
  name: string;
  serverIds: string[];
}

export type ClusterState = Cluster & { editing?: boolean };

export interface Container {
  id?: string;
  name: string;
  image: string;
  status: string;
  ports?: string;
  serverId?: string;
  serverName?: string;
  serverHost?: string;
}

export type ViewId =
  | 'fleet'
  | 'terminals'
  | 'apps'
  | 'monitoring'
  | 'clusters'
  | 'storage'
  | 'settings';

export type Theme = 'light' | 'dark';

/** What to run automatically once an SSH session reports "Connected". */
export type AutoRun =
  | { kind: 'input'; label: string; command: string }
  | {
      kind: 'deploy';
      label: string;
      scriptType: 'verify' | 'template';
      templateConfig?: unknown;
    };

export type DeployScriptType = 'docker' | 'k3s' | 'full' | 'verify';

export interface ExecResult {
  code: number;
  output: string;
  error?: string;
}
