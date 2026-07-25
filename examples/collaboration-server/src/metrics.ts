export class CollaborationMetrics {
  private connections = 0;
  private updates = 0;
  private updateBytes = 0;
  private persistenceFailures = 0;
  private compactions = 0;
  private compactionFailures = 0;

  connectionOpened(): void { this.connections += 1; }
  connectionClosed(): void { this.connections = Math.max(0, this.connections - 1); }
  updateReceived(bytes: number): void {
    this.updates += 1;
    this.updateBytes += bytes;
  }
  persistenceFailed(): void { this.persistenceFailures += 1; }
  compactionCompleted(): void { this.compactions += 1; }
  compactionFailed(): void { this.compactionFailures += 1; }

  renderPrometheus(): string {
    return [
      "# TYPE disnote_collab_connections gauge",
      `disnote_collab_connections ${this.connections}`,
      "# TYPE disnote_collab_updates_total counter",
      `disnote_collab_updates_total ${this.updates}`,
      "# TYPE disnote_collab_update_bytes_total counter",
      `disnote_collab_update_bytes_total ${this.updateBytes}`,
      "# TYPE disnote_collab_persistence_failures_total counter",
      `disnote_collab_persistence_failures_total ${this.persistenceFailures}`,
      "# TYPE disnote_collab_compactions_total counter",
      `disnote_collab_compactions_total ${this.compactions}`,
      "# TYPE disnote_collab_compaction_failures_total counter",
      `disnote_collab_compaction_failures_total ${this.compactionFailures}`,
      "",
    ].join("\n");
  }
}
