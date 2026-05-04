import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'loadvault.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    email        TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name         TEXT NOT NULL DEFAULT '',
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS companies (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL DEFAULT '',
    mc_number  TEXT NOT NULL DEFAULT '',
    dot_number TEXT NOT NULL DEFAULT '',
    type       TEXT NOT NULL DEFAULT 'broker',
    status     TEXT NOT NULL DEFAULT 'active',
    address    TEXT NOT NULL DEFAULT '',
    city       TEXT NOT NULL DEFAULT '',
    state      TEXT NOT NULL DEFAULT '',
    zip        TEXT NOT NULL DEFAULT '',
    phone      TEXT NOT NULL DEFAULT '',
    email      TEXT NOT NULL DEFAULT '',
    website    TEXT NOT NULL DEFAULT '',
    notes      TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL DEFAULT '',
    last_name  TEXT NOT NULL DEFAULT '',
    role       TEXT NOT NULL DEFAULT '',
    phone      TEXT NOT NULL DEFAULT '',
    email      TEXT NOT NULL DEFAULT '',
    notes      TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS loads (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    load_number    TEXT NOT NULL DEFAULT '',
    company_id     TEXT REFERENCES companies(id) ON DELETE SET NULL,
    origin_city    TEXT NOT NULL DEFAULT '',
    origin_state   TEXT NOT NULL DEFAULT '',
    origin_address TEXT NOT NULL DEFAULT '',
    origin_zip     TEXT NOT NULL DEFAULT '',
    dest_city      TEXT NOT NULL DEFAULT '',
    dest_state     TEXT NOT NULL DEFAULT '',
    dest_address   TEXT NOT NULL DEFAULT '',
    dest_zip       TEXT NOT NULL DEFAULT '',
    pickup_date    TEXT,
    pickup_time    TEXT NOT NULL DEFAULT '',
    delivery_date  TEXT,
    delivery_time  TEXT NOT NULL DEFAULT '',
    rate           REAL NOT NULL DEFAULT 0,
    status         TEXT NOT NULL DEFAULT 'pending',
    truck_type     TEXT NOT NULL DEFAULT '',
    weight         REAL NOT NULL DEFAULT 0,
    commodity      TEXT NOT NULL DEFAULT '',
    miles          REAL NOT NULL DEFAULT 0,
    driver_name    TEXT NOT NULL DEFAULT '',
    truck_number   TEXT NOT NULL DEFAULT '',
    trailer_number TEXT NOT NULL DEFAULT '',
    notes          TEXT NOT NULL DEFAULT '',
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id                TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    load_id           TEXT REFERENCES loads(id) ON DELETE SET NULL,
    company_id        TEXT REFERENCES companies(id) ON DELETE SET NULL,
    type              TEXT NOT NULL DEFAULT 'other',
    filename          TEXT NOT NULL DEFAULT '',
    original_name     TEXT NOT NULL DEFAULT '',
    size              INTEGER NOT NULL DEFAULT 0,
    mime_type         TEXT NOT NULL DEFAULT '',
    file_path         TEXT NOT NULL DEFAULT '',
    url               TEXT NOT NULL DEFAULT '',
    notes             TEXT NOT NULL DEFAULT '',
    raw_text          TEXT NOT NULL DEFAULT '',
    extracted_fields  TEXT NOT NULL DEFAULT '{}',
    extraction_status TEXT NOT NULL DEFAULT 'pending',
    extraction_error  TEXT,
    status            TEXT NOT NULL DEFAULT 'confirmed',
    uploaded_at       TEXT NOT NULL,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_companies_user ON companies(user_id);
  CREATE INDEX IF NOT EXISTS idx_contacts_user  ON contacts(user_id);
  CREATE INDEX IF NOT EXISTS idx_contacts_co    ON contacts(company_id);
  CREATE INDEX IF NOT EXISTS idx_loads_user     ON loads(user_id);
  CREATE INDEX IF NOT EXISTS idx_loads_co       ON loads(company_id);
  CREATE INDEX IF NOT EXISTS idx_docs_user      ON documents(user_id);
  CREATE INDEX IF NOT EXISTS idx_docs_load      ON documents(load_id);
  CREATE INDEX IF NOT EXISTS idx_docs_co        ON documents(company_id);
`);

export default db;
