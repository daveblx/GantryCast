# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Renamed the project from KubeCast to GantryCast. The `package.json` name, the
  page title, the release archive (`gantrycast-<version>-web.tar.gz`), the CSV
  export filename, the remote deploy temp directory, and the sudo prompt marker
  all follow. Browser state moves to `gantrycast:` keys, so saved alert
  thresholds, theme, sidebar state, auto-sync and default port reset once on
  first load after upgrading.

### Removed

- Kubernetes support. GantryCast installs and reports on Docker only. The `k3s`
  deploy script, the `kubectl`/`k3s` entries in the `/exec` allowlist, the K3s
  probe in the Prod Test, the K8s runtime badges, the "K8s Nodes" fleet stat, and
  the K3s teardown in the destroy endpoint are all gone. The `installed.k8s` and
  `Telemetry.k3s` fields are dropped; existing `db.json` files keep the stale key
  and it is ignored.

## [0.1.0] - 2026-11-16

### Added

- The sidebar can be collapsed to an icon rail. The choice is remembered in
  `localStorage` under `kubecast:sidebar-collapsed`.

### Changed

- Redesigned the interface, including navigation, the fleet overview, and the
  per-server views.
- The accent is now the logo's steel blue instead of amber, and the status
  palette follows it: nominal states are blue, warnings ochre, errors red, and
  informational states the logo's navy. No green remains in the interface.
- Interface text uses the sans stack; monospace is reserved for numbers, IDs,
  terminal output and log panes.
- Status dots are flat 5px squares. The pulsing animation is gone, and the
  status bar and sidebar footer are plain text.
- KubeCast is now a self-hosted web app. The Electron desktop shell is gone; a
  single Node process serves the API and the built frontend.
- Releases now publish a `kubecast-<version>-web.tar.gz` bundle instead of a macOS
  DMG, built and attached automatically by the `Release` workflow.
- `PORT` is configurable through the environment instead of being fixed at 3000.
- The server binds `127.0.0.1` by default. Set `HOST=0.0.0.0` to expose it, and
  put authentication in front of it first: the process holds root SSH
  credentials for every managed host.
- The "SSH port default" and "Automatic sync" settings now do what they say.
  Both persist in `localStorage`.

### Fixed

- Deleting a host always failed: the API answers `204` with no body and the
  client tried to parse it as JSON.
- The rate limiter throttled the app's own telemetry polling, and counted static
  asset requests against the same budget.
- 49 route handlers answered a 4xx/5xx without returning, so the handler kept
  running and could write a second response.
- A host that went away stayed "online" forever; a failed telemetry poll now
  flips it back to "offline".
- Terminal input and deploy commands typed while the socket was still dialling
  were dropped silently. They are now queued and flushed once the shell is up.
- Auto-run commands (log analysis, container shell, container logs) were sent
  before the server had registered the shell, so they were discarded.
- Every reconnect added another `message` listener to the socket, so input was
  written to stale shells.
- Polling could fork a second concurrent chain on a tab switch and leak the
  timer.
- A hung request stalled fleet polling indefinitely; requests now time out after
  20 seconds.
- The sidebar's "api reachable" indicator could never go back to unreachable.
- "Nuke server" reported success and dropped the host from the fleet even when
  the sudo password was rejected and nothing was removed.
- A failed deploy over the terminal reported nothing at all.
- Template deploys on key-only hosts failed step by step with no explanation.
- Template step failures discarded stderr, and a stream error left the deploy
  hanging forever.
- One Escape keypress closed every stacked modal.
- The status bar clock and the "telemetry Xs ago" label only updated when
  something else re-rendered.
- Unknown `/api/*` paths returned `index.html` with a 200 in production.
- `db.json` was written non-atomically and world-readable; it now goes through a
  temp file and `rename`, at mode `0600`.
- Duplicate React keys in the simulated traffic flow list and the mount table.
- A telemetry payload that omitted `docker`/`k3s` rendered as "Absent" instead
  of falling back to the stored value.
- The terminal dialog had no Escape handler, no focus trap, and did not restore
  focus on close. Host status was conveyed only by a colour swatch.

### Removed

- Electron, electron-builder, and the macOS packaging pipeline.

### Fixed

- Network throughput was labelled as a rate while showing a cumulative counter.
- Load average 5m and 15m displayed the 1m value.
- The terminal rendered raw ANSI escape sequences as visible text.
- The production simulation overlay re-randomised its metrics on every render.
- Container polling could overlap on a slow fleet.
- The Prod Test action returned 403 because the exec allowlist rejected the
  compound command the UI sent.

[0.1.0]: https://github.com/daveblx/KubeCast/releases/tag/v0.1.0
