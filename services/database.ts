import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('sawitin_local.db');
  await initDb(dbInstance);
  return dbInstance;
}

/**
 * Additive schema migrations, tracked with SQLite's own `user_version`.
 *
 * These run against handsets holding real unsent work, so every step only adds:
 * nothing drops a column or a row. A worker whose queue survived an app update
 * must still be able to upload it.
 */
const MIGRATIONS: string[][] = [
  // v1 — queue ownership and per-item recovery state. Before this a queue row
  // said nothing about who created it, so on a shared handset the next person
  // to sign in would upload the previous worker's work under their own session.
  [
    "ALTER TABLE sync_queue ADD COLUMN user_id TEXT",
    "ALTER TABLE sync_queue ADD COLUMN device_id TEXT",
    "ALTER TABLE sync_queue ADD COLUMN status TEXT NOT NULL DEFAULT 'PENDING'",
    "ALTER TABLE sync_queue ADD COLUMN error_class TEXT",
    "ALTER TABLE sync_queue ADD COLUMN last_error TEXT",
    "ALTER TABLE sync_queue ADD COLUMN next_attempt_at INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE sync_queue ADD COLUMN lease_until INTEGER",
    "ALTER TABLE sync_queue ADD COLUMN precondition TEXT",
    "CREATE INDEX IF NOT EXISTS sync_queue_owner_idx ON sync_queue (user_id, status, next_attempt_at)",
  ],
  ["ALTER TABLE sync_queue ADD COLUMN depends_on TEXT"],
];

async function migrateDb(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let version = current; version < MIGRATIONS.length; version++) {
    for (const statement of MIGRATIONS[version]) {
      try {
        await db.execAsync(statement);
      } catch (error) {
        // A column added by a build that crashed before bumping user_version is
        // already there. Anything else is a real failure and must surface.
        if (!String(error).includes('duplicate column name')) throw error;
      }
    }
  }
  await db.execAsync(`PRAGMA user_version = ${MIGRATIONS.length}`);
}

async function initDb(db: SQLite.SQLiteDatabase) {
  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables if they do not exist
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      payload TEXT,
      created_at INTEGER NOT NULL,
      retry_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS bkm_panen_cache (
      id TEXT PRIMARY KEY NOT NULL,
      blok_id TEXT NOT NULL,
      lahan_id TEXT,
      tanggal_laporan TEXT NOT NULL,
      keterangan TEXT,
      grup_pekerja_id TEXT,
      status TEXT NOT NULL,
      created_at TEXT,
      created_by TEXT,
      modified_at TEXT,
      modified_by TEXT
    );

    CREATE TABLE IF NOT EXISTS bkm_panen_details_cache (
      id TEXT PRIMARY KEY NOT NULL,
      bkm_panen_id TEXT NOT NULL,
      pekerja_id TEXT NOT NULL,
      tph_id TEXT NOT NULL,
      jenis_pekerjaan TEXT NOT NULL,
      janjang_normal INTEGER DEFAULT 0,
      buah_mentah INTEGER DEFAULT 0,
      over_ripe INTEGER DEFAULT 0,
      tangkai_panjang INTEGER DEFAULT 0,
      buah_abnormal INTEGER DEFAULT 0,
      janjang_kosong INTEGER DEFAULT 0,
      jumlah_janjang INTEGER DEFAULT 0,
      jumlah_brondol INTEGER DEFAULT 0,
      foto_url TEXT,
      lat REAL,
      lng REAL,
      note TEXT,
      created_at TEXT,
      created_by TEXT,
      modified_at TEXT,
      modified_by TEXT,
      FOREIGN KEY (bkm_panen_id) REFERENCES bkm_panen_cache(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY NOT NULL,
      user_code TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      block_id TEXT,
      block_name TEXT,
      status TEXT NOT NULL,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS rawat_lookup_cache_by_user (
      cache_key TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lookup_cache (
      cache_key TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await migrateDb(db);
}

// ── Sync Queue Local DB CRUD Operations ──────────────────────────────

/**
 * Who a queued item belongs to.
 *
 * The organization is not stored: the server derives it from the token the item
 * replays under, and a user belongs to exactly one organization. Scoping by user
 * therefore already scopes by tenant. Add `org_id` here the day a user can
 * switch organizations without signing out.
 */
export interface QueueOwner {
  userId: string;
  deviceId: string;
}

export type QueueStatus = 'PENDING' | 'IN_FLIGHT' | 'DEAD';

/** How long a claimed item stays claimed before another pass may take it back. */
export const LEASE_MS = 2 * 60 * 1000;

const rowToItem = (r: any) => ({
  id: r.id,
  module: r.module,
  action: r.action,
  endpoint: r.endpoint,
  payload: r.payload ? JSON.parse(r.payload) : null,
  createdAt: r.created_at,
  retryCount: r.retry_count,
  status: (r.status ?? 'PENDING') as QueueStatus,
  errorClass: r.error_class ?? null,
  lastError: r.last_error ?? null,
  nextAttemptAt: r.next_attempt_at ?? 0,
  precondition: r.precondition ?? null,
  dependsOn: r.depends_on ?? null,
});

export const syncQueueDb = {
  /**
   * Only this user's work on this device. A row belonging to whoever used the
   * handset before is invisible here, which is what stops it uploading under
   * the wrong session.
   */
  getAll: async (owner: QueueOwner): Promise<any[]> => {
    const db = await getDb();
    const rows = await db.getAllAsync(
      'SELECT * FROM sync_queue WHERE user_id = ? ORDER BY created_at ASC',
      [owner.userId]
    );
    return rows.map(rowToItem);
  },

  add: async (item: {
    id: string;
    module: string;
    action: string;
    endpoint: string;
    payload: any;
    createdAt: number;
    owner: QueueOwner;
    precondition?: string | null;
    dependsOn?: string | null;
  }) => {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO sync_queue
         (id, module, action, endpoint, payload, created_at, retry_count,
          user_id, device_id, status, next_attempt_at, precondition, depends_on)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'PENDING', 0, ?, ?)`,
      [
        item.id,
        item.module,
        item.action,
        item.endpoint,
        item.payload ? JSON.stringify(item.payload) : null,
        item.createdAt,
        item.owner.userId,
        item.owner.deviceId,
        item.precondition ?? null,
        item.dependsOn ?? null,
      ]
    );
  },

  /**
   * Atomically take the next items to process. The lease is what makes a single
   * serialized processor out of two callers: a row claimed by one pass is
   * invisible to the other until its lease expires, and an expired lease is how
   * work abandoned by a crash or a force-quit comes back.
   */
  claim: async (owner: QueueOwner, limit: number, now = Date.now()): Promise<any[]> => {
    const db = await getDb();
    let claimed: any[] = [];
    await db.withTransactionAsync(async () => {
      const candidates = await db.getAllAsync<{ id: string }>(
        `SELECT id FROM sync_queue
          WHERE user_id = ?
            AND status != 'DEAD'
            AND next_attempt_at <= ?
            AND (lease_until IS NULL OR lease_until < ?)
            AND NOT EXISTS (SELECT 1 FROM sync_queue parent WHERE parent.id = sync_queue.depends_on)
          ORDER BY created_at ASC
          LIMIT ?`,
        [owner.userId, now, now, limit]
      );
      if (candidates.length === 0) return;

      const ids = candidates.map((row) => row.id);
      const placeholders = ids.map(() => '?').join(',');
      await db.runAsync(
        `UPDATE sync_queue SET status = 'IN_FLIGHT', lease_until = ?, device_id = ?
          WHERE id IN (${placeholders})`,
        [now + LEASE_MS, owner.deviceId, ...ids]
      );
      claimed = (
        await db.getAllAsync(
          `SELECT * FROM sync_queue WHERE id IN (${placeholders}) ORDER BY created_at ASC`,
          ids
        )
      ).map(rowToItem);
    });
    return claimed;
  },

  /** Hand an item back unchanged, for a pass that stopped before processing it. */
  release: async (id: string) => {
    const db = await getDb();
    await db.runAsync(
      "UPDATE sync_queue SET status = 'PENDING', lease_until = NULL WHERE id = ?",
      [id]
    );
  },

  /**
   * Record why an item failed and when it may be tried again. `dead` items are
   * never retried automatically — they wait for a person to inspect, retry or
   * discard them, because silently dropping field work is the failure this
   * whole queue exists to prevent.
   */
  markFailed: async (
    id: string,
    failure: { errorClass: string; lastError: string; nextAttemptAt: number; dead: boolean }
  ) => {
    const db = await getDb();
    await db.runAsync(
      `UPDATE sync_queue
          SET status = ?, lease_until = NULL, retry_count = retry_count + 1,
              error_class = ?, last_error = ?, next_attempt_at = ?
        WHERE id = ?`,
      [
        failure.dead ? 'DEAD' : 'PENDING',
        failure.errorClass,
        failure.lastError.slice(0, 500),
        failure.nextAttemptAt,
        id,
      ]
    );
  },

  /** Put a dead item back in line, from the queue screen. */
  retryNow: async (id: string, precondition?: string) => {
    const db = await getDb();
    await db.runAsync(
      `UPDATE sync_queue
          SET status = 'PENDING', lease_until = NULL, next_attempt_at = 0,
              retry_count = 0, error_class = NULL, last_error = NULL,
              precondition = COALESCE(?, precondition)
        WHERE id = ?`,
      [precondition ?? null, id]
    );
  },

  remove: async (id: string) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
  },

  complete: async (id: string, modifiedAt?: string) => {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      if (modifiedAt) await db.runAsync(`UPDATE sync_queue SET precondition = ? WHERE depends_on = ?
        AND module = (SELECT module FROM sync_queue WHERE id = ?)
        AND json_extract(payload, '$.id') IS (SELECT json_extract(payload, '$.id') FROM sync_queue WHERE id = ?)`, [modifiedAt, id, id, id]);
      await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
    });
  },

  incrementRetry: async (id: string) => {
    const db = await getDb();
    await db.runAsync('UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?', [id]);
  },

  updatePayload: async (id: string, payload: Record<string, unknown>) => {
    const db = await getDb();
    await db.runAsync('UPDATE sync_queue SET payload = ? WHERE id = ?', [JSON.stringify(payload), id]);
  },

  /**
   * Counters for `POST /sync/telemetry`. Deliberately aggregate only: the
   * endpoint refuses anything that is not a counter, so nothing here may grow
   * into carrying payloads or error strings off the device.
   */
  stats: async (owner: QueueOwner, now = Date.now()) => {
    const db = await getDb();
    const row = await db.getFirstAsync<{
      queued: number;
      dead: number;
      oldest: number | null;
    }>(
      `SELECT
         SUM(CASE WHEN status != 'DEAD' THEN 1 ELSE 0 END) AS queued,
         SUM(CASE WHEN status  = 'DEAD' THEN 1 ELSE 0 END) AS dead,
         MIN(created_at) AS oldest
       FROM sync_queue WHERE user_id = ?`,
      [owner.userId]
    );
    return {
      queued: row?.queued ?? 0,
      dead: row?.dead ?? 0,
      oldestQueuedAgeSeconds: row?.oldest ? Math.floor((now - row.oldest) / 1000) : undefined,
    };
  },

  /**
   * Only ever this user's rows. Another worker's unsent work stays on the
   * device untouched until they sign in again and it becomes theirs to send.
   */
  clear: async (owner: QueueOwner) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM sync_queue WHERE user_id = ?', [owner.userId]);
  },
};

/**
 * Master data cached so a field form still opens with no connectivity. Keys are
 * scoped to the signed-in user, and everything is dropped on logout, because a
 * device is shared between workers and one organization's master data must
 * never appear under another's session.
 *
 * ponytail: this duplicates rawatLookupCacheDb, which predates it and holds one
 * blob per user. Fold that table into this one the next time it is touched.
 */
export const lookupCacheDb = {
  save: async (cacheKey: string, payload: unknown) => {
    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO lookup_cache (cache_key, payload, updated_at) VALUES (?, ?, ?)',
      [cacheKey, JSON.stringify(payload), Date.now()]
    );
  },
  get: async (cacheKey: string): Promise<unknown | null> => {
    const db = await getDb();
    const row = await db.getFirstAsync<{ payload: string }>(
      'SELECT payload FROM lookup_cache WHERE cache_key = ?',
      [cacheKey]
    );
    if (!row) return null;
    try {
      return JSON.parse(row.payload);
    } catch {
      // A row written by an older build can be unreadable; treat it as absent.
      return null;
    }
  },
  clearAll: async () => {
    const db = await getDb();
    await db.runAsync('DELETE FROM lookup_cache');
    await db.runAsync('DELETE FROM rawat_lookup_cache_by_user');
  },
  /**
   * Drop every cached page of one resource for one user. Delta sync uses this:
   * the cache holds whole response payloads keyed by their request params, not
   * rows, so a changed resource is invalidated and refetched rather than
   * patched — which would mean knowing the shape of every endpoint's envelope.
   */
  clearResource: async (userId: string, resource: string) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM lookup_cache WHERE cache_key LIKE ?', [`${userId}:${resource}:%`]);
  },
};

export const rawatLookupCacheDb = {
  save: async (cacheKey: string, payload: Record<string, unknown>) => {
    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO rawat_lookup_cache_by_user (cache_key, payload, updated_at) VALUES (?, ?, ?)',
      [cacheKey, JSON.stringify(payload), Date.now()]
    );
  },
  get: async (cacheKey: string): Promise<Record<string, unknown> | null> => {
    const db = await getDb();
    const row = await db.getFirstAsync<{ payload: string }>('SELECT payload FROM rawat_lookup_cache_by_user WHERE cache_key = ?', [cacheKey]);
    return row ? JSON.parse(row.payload) : null;
  },
};

// ── BKM Panen Cache CRUD Operations ──────────────────────────────────
export const bkmPanenCacheDb = {
  saveList: async (list: any[]) => {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const item of list) {
        await db.runAsync(
          `INSERT OR REPLACE INTO bkm_panen_cache (
            id, blok_id, lahan_id, tanggal_laporan, keterangan, grup_pekerja_id, status, created_at, created_by, modified_at, modified_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.blok_id,
            item.lahan_id || null,
            item.tanggal_laporan,
            item.keterangan || null,
            item.grup_pekerja_id || null,
            item.status,
            item.created_at || null,
            item.created_by || null,
            item.modified_at || null,
            item.modified_by || null,
          ]
        );

        if (item.details && Array.isArray(item.details)) {
          // Clear old cached details for this document first
          await db.runAsync('DELETE FROM bkm_panen_details_cache WHERE bkm_panen_id = ?', [item.id]);

          for (const d of item.details) {
            await db.runAsync(
              `INSERT OR REPLACE INTO bkm_panen_details_cache (
                id, bkm_panen_id, pekerja_id, tph_id, jenis_pekerjaan, janjang_normal, buah_mentah, over_ripe, 
                tangkai_panjang, buah_abnormal, janjang_kosong, jumlah_janjang, jumlah_brondol, foto_url, lat, lng, note,
                created_at, created_by, modified_at, modified_by
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                d.id,
                item.id,
                d.pekerja_id,
                d.tph_id,
                d.jenis_pekerjaan,
                d.janjang_normal ?? 0,
                d.buah_mentah ?? 0,
                d.over_ripe ?? 0,
                d.tangkai_panjang ?? 0,
                d.buah_abnormal ?? 0,
                d.janjang_kosong ?? 0,
                d.jumlah_janjang ?? 0,
                d.jumlah_brondol ?? null,
                d.foto_url || null,
                d.lat || null,
                d.lng || null,
                d.note || null,
                d.created_at || null,
                d.created_by || null,
                d.modified_at || null,
                d.modified_by || null,
              ]
            );
          }
        }
      }
    });
  },

  getAll: async (): Promise<any[]> => {
    const db = await getDb();
    const rows = await db.getAllAsync('SELECT * FROM bkm_panen_cache ORDER BY tanggal_laporan DESC');
    const result = [];
    for (const row of rows as any[]) {
      const details = await db.getAllAsync('SELECT * FROM bkm_panen_details_cache WHERE bkm_panen_id = ?', [row.id]);
      result.push({
        ...row,
        details,
      });
    }
    return result;
  },

  getById: async (id: string): Promise<any | null> => {
    const db = await getDb();
    const row = await db.getFirstAsync('SELECT * FROM bkm_panen_cache WHERE id = ?', [id]);
    if (!row) return null;
    const details = await db.getAllAsync('SELECT * FROM bkm_panen_details_cache WHERE bkm_panen_id = ?', [id]);
    return {
      ...(row as any),
      details,
    };
  },
};

// ── Attendance Cache CRUD Operations ───────────────────────────────
export const attendanceDb = {
  saveRecord: async (record: {
    id: string;
    user_code: string;
    date: string;
    time: string;
    latitude: number | null;
    longitude: number | null;
    block_id: string | null;
    block_name: string | null;
    status: string;
    note: string | null;
  }) => {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO attendance_records (
        id, user_code, date, time, latitude, longitude, block_id, block_name, status, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.user_code,
        record.date,
        record.time,
        record.latitude,
        record.longitude,
        record.block_id,
        record.block_name,
        record.status,
        record.note,
      ]
    );
  },

  getAll: async (userCode: string): Promise<any[]> => {
    const db = await getDb();
    return db.getAllAsync(
      'SELECT * FROM attendance_records WHERE user_code = ? ORDER BY date DESC, time DESC',
      [userCode]
    );
  },
};
