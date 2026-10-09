-- Soft delete, starting with the records that carry no unique constraint of
-- their own (ADR-0036). A delete sets deleted_at; a restore clears it; only a
-- permanent delete removes the row.
ALTER TABLE tenants ADD COLUMN deleted_at INTEGER;

CREATE INDEX tenants_deleted_at_index ON tenants (deleted_at);
