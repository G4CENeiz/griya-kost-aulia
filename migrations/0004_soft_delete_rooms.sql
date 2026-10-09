-- Soft delete for the property records (ADR-0036, ADR-0037). The column-level
-- UNIQUE constraints stay, so a deleted room or room type keeps its number or
-- name until it is purged.
ALTER TABLE room_types ADD COLUMN deleted_at INTEGER;
ALTER TABLE rooms ADD COLUMN deleted_at INTEGER;

CREATE INDEX room_types_deleted_at_index ON room_types (deleted_at);
CREATE INDEX rooms_deleted_at_index ON rooms (deleted_at);
