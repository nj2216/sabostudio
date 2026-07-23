// server/db/index.js
// Selects the correct DB adapter based on NODE_ENV.
// development (default) → SQLite (no external DB required)
// production            → Supabase (requires SUPABASE_* env vars)

const isProd = process.env.NODE_ENV === 'production';

let db;
if (isProd) {
  const { default: supabaseDb } = await import('./supabase.js');
  db = supabaseDb;
} else {
  const { default: sqliteDb } = await import('./sqlite.js');
  db = sqliteDb;
}

export default db;
