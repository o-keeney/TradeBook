ALTER TABLE users ADD COLUMN email_verification_token_hash text;
ALTER TABLE users ADD COLUMN email_verification_expires_at integer;
ALTER TABLE users ADD COLUMN email_verification_last_sent_at integer;
