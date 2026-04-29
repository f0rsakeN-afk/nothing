-- Add tsvector column for full-text search
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS "Message_searchVector_idx" ON "Message" USING GIN ("searchVector");

-- Create trigger function to auto-update search vector
CREATE OR REPLACE FUNCTION update_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS message_search_vector_insert ON "Message";
CREATE TRIGGER message_search_vector_insert
  BEFORE INSERT ON "Message"
  FOR EACH ROW
  EXECUTE FUNCTION update_message_search_vector();

-- Create trigger for UPDATE
DROP TRIGGER IF EXISTS message_search_vector_update ON "Message";
CREATE TRIGGER message_search_vector_update
  BEFORE UPDATE ON "Message"
  FOR EACH ROW
  EXECUTE FUNCTION update_message_search_vector();

-- Backfill existing messages with search vectors
UPDATE "Message" SET "searchVector" = to_tsvector('english', COALESCE(content, ''));
