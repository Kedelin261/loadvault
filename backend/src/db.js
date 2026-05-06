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
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS companies (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL DEFAULT '',
    normalized_name TEXT NOT NULL DEFAULT '',
    mc_number       TEXT NOT NULL DEFAULT '',
    dot_number      TEXT NOT NULL DEFAULT '',
    type            TEXT NOT NULL DEFAULT 'broker',
    status          TEXT NOT NULL DEFAULT 'active',
    address         TEXT NOT NULL DEFAULT '',
    city            TEXT NOT NULL DEFAULT '',
    state           TEXT NOT NULL DEFAULT '',
    zip             TEXT NOT NULL DEFAULT '',
    phone           TEXT NOT NULL DEFAULT '',
    email           TEXT NOT NULL DEFAULT '',
    email_domain    TEXT NOT NULL DEFAULT '',
    website         TEXT NOT NULL DEFAULT '',
    notes           TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
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
    source     TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS loads (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    load_number    TEXT NOT NULL DEFAULT '',
    po_number      TEXT NOT NULL DEFAULT '',
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
    detected_type     TEXT NOT NULL DEFAULT 'UNKNOWN',
    filename          TEXT NOT NULL DEFAULT '',
    original_name     TEXT NOT NULL DEFAULT '',
    size              INTEGER NOT NULL DEFAULT 0,
    mime_type         TEXT NOT NULL DEFAULT '',
    file_path         TEXT NOT NULL DEFAULT '',
    url               TEXT NOT NULL DEFAULT '',
    notes             TEXT NOT NULL DEFAULT '',
    billing_email     TEXT NOT NULL DEFAULT '',
    raw_text          TEXT NOT NULL DEFAULT '',
    extracted_fields  TEXT NOT NULL DEFAULT '{}',
    extraction_status TEXT NOT NULL DEFAULT 'pending',
    extraction_error  TEXT,
    status            TEXT NOT NULL DEFAULT 'confirmed',
    uploaded_at       TEXT NOT NULL,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trucks (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    number     TEXT NOT NULL DEFAULT '',
    vin        TEXT NOT NULL DEFAULT '',
    make       TEXT NOT NULL DEFAULT '',
    model      TEXT NOT NULL DEFAULT '',
    year       TEXT NOT NULL DEFAULT '',
    notes      TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS maintenance_records (
    id                   TEXT PRIMARY KEY,
    user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    truck_id             TEXT NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
    type                 TEXT NOT NULL DEFAULT 'other',
    description          TEXT NOT NULL DEFAULT '',
    cost                 REAL NOT NULL DEFAULT 0,
    date                 TEXT,
    receipt_filename     TEXT NOT NULL DEFAULT '',
    receipt_path         TEXT NOT NULL DEFAULT '',
    receipt_original     TEXT NOT NULL DEFAULT '',
    notes                TEXT NOT NULL DEFAULT '',
    created_at           TEXT NOT NULL,
    updated_at           TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_templates (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL DEFAULT '',
    subject    TEXT NOT NULL DEFAULT '',
    body       TEXT NOT NULL DEFAULT '',
    variables  TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_companies_user   ON companies(user_id);
  CREATE INDEX IF NOT EXISTS idx_companies_mc     ON companies(mc_number);
  CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(email_domain);
  CREATE INDEX IF NOT EXISTS idx_contacts_user    ON contacts(user_id);
  CREATE INDEX IF NOT EXISTS idx_contacts_co      ON contacts(company_id);
  CREATE INDEX IF NOT EXISTS idx_loads_user       ON loads(user_id);
  CREATE INDEX IF NOT EXISTS idx_loads_co         ON loads(company_id);
  CREATE INDEX IF NOT EXISTS idx_loads_po         ON loads(po_number);
  CREATE INDEX IF NOT EXISTS idx_docs_user        ON documents(user_id);
  CREATE INDEX IF NOT EXISTS idx_docs_load        ON documents(load_id);
  CREATE INDEX IF NOT EXISTS idx_docs_co          ON documents(company_id);
  CREATE INDEX IF NOT EXISTS idx_trucks_user      ON trucks(user_id);
  CREATE INDEX IF NOT EXISTS idx_maint_truck      ON maintenance_records(truck_id);
  CREATE INDEX IF NOT EXISTS idx_etpl_user        ON email_templates(user_id);
`);

// Idempotent column additions for existing databases
const migrations = [
  `ALTER TABLE loads     ADD COLUMN po_number      TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE companies ADD COLUMN normalized_name TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE companies ADD COLUMN email_domain    TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE documents ADD COLUMN billing_email   TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE documents ADD COLUMN detected_type   TEXT NOT NULL DEFAULT 'UNKNOWN'`,
  `ALTER TABLE contacts  ADD COLUMN source          TEXT NOT NULL DEFAULT 'manual'`,
];
for (const sql of migrations) {
  try { db.exec(sql); } catch { /* column already exists */ }
}

export default db;
