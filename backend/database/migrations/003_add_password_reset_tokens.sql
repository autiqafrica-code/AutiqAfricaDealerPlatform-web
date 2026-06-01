-- Migration 003: Add password_reset_tokens table
-- Run: psql -U postgres -d autiq_africa_db -f 003_add_password_reset_tokens.sql

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    token      TEXT UNIQUE NOT NULL,
    user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
    admin_id   TEXT REFERENCES enterprise_admins(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_token   ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_admin_id ON password_reset_tokens(admin_id);
