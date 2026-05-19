// SQLite schema migration registry. Each entry runs forward-only when the
// migration runner observes a `schema_version` row that is lower than the
// entry's `to` version. Native bring-up will iterate this in order via
// `db.execAsync(sql)`; the runner is unit-tested against fixture databases.

export type Migration = Readonly<{
  description: string;
  sql: string;
  to: number;
}>;

export const MIGRATIONS: ReadonlyArray<Migration> = [
  {
    description: 'Initial schema for projects, takes, pending_takes.',
    sql: `
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        projectType TEXT NOT NULL CHECK (projectType IN ('music','multi-cam')),
        layoutId TEXT NOT NULL,
        aspectRatio TEXT NOT NULL,
        schemaVersion INTEGER NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        deletedAt INTEGER NULL
      );
      CREATE INDEX IF NOT EXISTS idx_projects_updatedAt ON projects(updatedAt);

      CREATE TABLE IF NOT EXISTS takes (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        fileUri TEXT NOT NULL,
        durationMs INTEGER NOT NULL,
        slotIndex INTEGER NOT NULL,
        slotMeta TEXT NOT NULL,
        mutedInExport INTEGER NOT NULL DEFAULT 0,
        gain REAL NOT NULL DEFAULT 1,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_takes_projectId ON takes(projectId);

      CREATE TABLE IF NOT EXISTS pending_takes (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        fileUri TEXT NOT NULL,
        slotIndex INTEGER NOT NULL,
        recordingStartedAt INTEGER NOT NULL,
        interruptedAt INTEGER NULL,
        reason TEXT NULL
      );
    `,
    to: 1,
  },
];

export function nextMigrationsFrom(currentVersion: number): ReadonlyArray<Migration> {
  return MIGRATIONS.filter((m) => m.to > currentVersion);
}
