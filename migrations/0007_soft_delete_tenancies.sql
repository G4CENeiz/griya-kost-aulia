-- Soft delete for a stay (ADR-0036). Hiding a stay hides the charges of that
-- stay with it, so a hidden stay leaves every balance and every availability
-- count.
ALTER TABLE tenancies ADD COLUMN deleted_at INTEGER;

CREATE INDEX tenancies_deleted_at_index ON tenancies (deleted_at);
