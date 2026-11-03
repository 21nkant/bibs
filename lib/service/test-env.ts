// Vitest setup: load .env.local before any test imports lib/db (which reads POSTGRES_URL at import time).
// Missing file is fine: pure engine tests don't need it, and DB tests skip without POSTGRES_URL.
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local
}
