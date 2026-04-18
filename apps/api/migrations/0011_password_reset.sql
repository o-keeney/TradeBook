ALTER TABLE users ADD COLUMN password_reset_token_hash text;
ALTER TABLE users ADD COLUMN password_reset_expires_at integer;
