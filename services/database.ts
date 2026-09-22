import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('sawitin_local.db');
  await initDb(dbInstance);
  return dbInstance;
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
}

// ── Sync Queue Local DB CRUD Operations ──────────────────────────────
export const syncQueueDb = {
  getAll: async (): Promise<any[]> => {
    const db = await getDb();
    const rows = await db.getAllAsync('SELECT * FROM sync_queue ORDER BY created_at ASC');
    return rows.map((r: any) => ({
      id: r.id,
      module: r.module,
      action: r.action,
      endpoint: r.endpoint,
      payload: r.payload ? JSON.parse(r.payload) : null,
      createdAt: r.created_at,
      retryCount: r.retry_count,
    }));
  },

  add: async (item: { id: string; module: string; action: string; endpoint: string; payload: any; createdAt: number }) => {
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO sync_queue (id, module, action, endpoint, payload, created_at, retry_count) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [
        item.id,
        item.module,
        item.action,
        item.endpoint,
        item.payload ? JSON.stringify(item.payload) : null,
        item.createdAt,
      ]
    );
  },

  remove: async (id: string) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
  },

  incrementRetry: async (id: string) => {
    const db = await getDb();
    await db.runAsync('UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?', [id]);
  },

  updatePayload: async (id: string, payload: Record<string, unknown>) => {
    const db = await getDb();
    await db.runAsync('UPDATE sync_queue SET payload = ? WHERE id = ?', [JSON.stringify(payload), id]);
  },

  clear: async () => {
    const db = await getDb();
    await db.runAsync('DELETE FROM sync_queue');
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
                d.jumlah_brondol ?? 0,
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
