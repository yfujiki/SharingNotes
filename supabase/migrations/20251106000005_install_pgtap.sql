-- Install pgTAP extension for database testing
-- pgTAP is a unit testing framework for PostgreSQL

-- Enable the pgTAP extension
CREATE EXTENSION IF NOT EXISTS pgtap;

-- Add comment explaining the extension
COMMENT ON EXTENSION pgtap IS
  'Unit testing framework for PostgreSQL. Used for testing RLS policies and database schema.';
