-- Soft delete for the content records (ADR-0036, ADR-0037). Hiding a page hides
-- its gallery with it, so both tables carry the column.
ALTER TABLE pages ADD COLUMN deleted_at INTEGER;
ALTER TABLE page_images ADD COLUMN deleted_at INTEGER;

CREATE INDEX pages_deleted_at_index ON pages (deleted_at);
CREATE INDEX page_images_deleted_at_index ON page_images (deleted_at);
