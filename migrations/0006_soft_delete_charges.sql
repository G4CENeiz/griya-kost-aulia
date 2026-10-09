-- Soft delete for a charge (ADR-0036). Every balance filters it, so a hidden
-- charge stops being owed and stops being chased.
ALTER TABLE charges ADD COLUMN deleted_at INTEGER;

CREATE INDEX charges_deleted_at_index ON charges (deleted_at);
