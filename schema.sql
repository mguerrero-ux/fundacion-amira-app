-- ═══════════════════════════════════════════════════════════
-- AMIRA AL DAHAB — SCHEMA NEON (PostgreSQL)
-- Ejecutar en: Neon Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- TABLA: USUARIOS (miembros del sistema de afiliados)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT        NOT NULL,
  pin_hash      TEXT        NOT NULL,           -- SHA-256 del PIN
  role          TEXT        NOT NULL DEFAULT 'member',  -- 'admin' | 'member'
  invite_code   TEXT        UNIQUE NOT NULL,    -- código que este usuario comparte
  parent_id     INTEGER     REFERENCES users(id) ON DELETE SET NULL,  -- quién lo invitó
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- TABLA: SETTINGS (por usuario)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  user_id   INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  signer    TEXT NOT NULL DEFAULT 'AMIRA AL DAHAB',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- TABLA: LEADS (registros pendientes de aprobación)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id          SERIAL PRIMARY KEY,
  created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom         TEXT    NOT NULL,
  dir         TEXT    NOT NULL,
  mon         NUMERIC(14,2) NOT NULL,
  tax         NUMERIC(14,2) NOT NULL,
  neto        NUMERIC(14,2) NOT NULL,
  prio        TEXT    NOT NULL DEFAULT '',
  desc        TEXT,
  folio       TEXT    UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- TABLA: PENDINGS (en cola de pago)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pendings (
  id           SERIAL PRIMARY KEY,
  created_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom          TEXT    NOT NULL,
  dir          TEXT    NOT NULL,
  mon          NUMERIC(14,2) NOT NULL,
  tax          NUMERIC(14,2) NOT NULL,
  neto         NUMERIC(14,2) NOT NULL,
  prio         TEXT    NOT NULL DEFAULT '',
  desc         TEXT,
  folio        TEXT    UNIQUE NOT NULL,
  approved_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- TABLA: HISTORY (pagos completados)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS history (
  id           SERIAL PRIMARY KEY,
  created_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom          TEXT    NOT NULL,
  dir          TEXT    NOT NULL,
  mon          NUMERIC(14,2) NOT NULL,
  tax          NUMERIC(14,2) NOT NULL,
  neto         NUMERIC(14,2) NOT NULL,
  prio         TEXT    NOT NULL DEFAULT '',
  desc         TEXT,
  folio        TEXT    UNIQUE NOT NULL,
  executed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- ÍNDICES para performance
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_parent     ON users(parent_id);
CREATE INDEX IF NOT EXISTS idx_users_invite     ON users(invite_code);
CREATE INDEX IF NOT EXISTS idx_leads_created    ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_pendings_created ON pendings(created_by);
CREATE INDEX IF NOT EXISTS idx_history_created  ON history(created_by);
CREATE INDEX IF NOT EXISTS idx_history_executed ON history(executed_at DESC);

-- ─────────────────────────────────────────────────────────
-- ADMIN ROOT — Tu cuenta inicial
-- PIN: 2024 → hash SHA-256
-- IMPORTANTE: Cambia el pin_hash por el hash real de tu PIN
--   Puedes generar el hash en: https://emn178.github.io/online-tools/sha256.html
--   Escribe tu PIN y copia el hash de 64 caracteres
-- ─────────────────────────────────────────────────────────
INSERT INTO users (name, pin_hash, role, invite_code, parent_id)
VALUES (
  'Anthony Guerrero',
  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',  -- hash de "1234" (CAMBIA ESTO)
  'admin',
  'AMIRA-ROOT',
  NULL
)
ON CONFLICT DO NOTHING;

-- Crear settings para el admin
INSERT INTO user_settings (user_id, signer)
SELECT id, 'AMIRA AL DAHAB'
FROM users WHERE invite_code = 'AMIRA-ROOT'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- FUNCIÓN: Obtener árbol de usuarios descendientes
-- Usa recursión CTE para traer toda la jerarquía
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_tree(root_id INTEGER)
RETURNS TABLE (
  id         INTEGER,
  name       TEXT,
  role       TEXT,
  invite_code TEXT,
  parent_id  INTEGER,
  depth      INTEGER,
  created_at TIMESTAMPTZ
) AS $$
  WITH RECURSIVE tree AS (
    -- Base: hijos directos del usuario raíz
    SELECT u.id, u.name, u.role, u.invite_code, u.parent_id, 1 AS depth, u.created_at
    FROM users u
    WHERE u.parent_id = root_id

    UNION ALL

    -- Recursión: hijos de hijos
    SELECT u.id, u.name, u.role, u.invite_code, u.parent_id, t.depth + 1, u.created_at
    FROM users u
    INNER JOIN tree t ON u.parent_id = t.id
    WHERE t.depth < 10  -- máximo 10 niveles de profundidad
  )
  SELECT * FROM tree ORDER BY depth, name;
$$ LANGUAGE sql STABLE;
