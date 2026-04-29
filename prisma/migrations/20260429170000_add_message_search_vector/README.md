# Add Message Search Vector

This migration adds PostgreSQL full-text search capability to messages.

## What it does

1. Adds a `search_vector` column of type `tsvector` to the `Message` table
2. Creates a GIN index on `search_vector` for fast full-text search
3. Creates a trigger function that automatically updates `search_vector` on INSERT or UPDATE of `content`
4. Backfills existing messages with their search vectors

## Running the migration

```bash
# Run with Prisma
npx prisma migrate deploy

# Or run raw SQL directly
psql $DATABASE_URL -f prisma/migrations/20260429170000_add_message_search_vector/migration.sql
```

## Usage in queries

```sql
-- Basic search with ranking
SELECT id, content, ts_rank(search_vector, plainto_tsquery('english', 'search term')) as rank
FROM "Message"
WHERE search_vector @@ plainto_tsquery('english', 'search term')
ORDER BY rank DESC;

-- With highlighting
SELECT id, content, ts_headline('english', content, plainto_tsquery('english', 'search term')) as highlight
FROM "Message"
WHERE search_vector @@ plainto_tsquery('english', 'search term');
```
