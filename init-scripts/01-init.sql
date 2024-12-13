-- Extentions required
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Example tabe
CREATE TABLE IF NOT EXISTS example_table (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial data
INSERT INTO example_table (name) VALUES ('Example Record');
