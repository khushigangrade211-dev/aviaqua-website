-- AviAqua persistent application store. Also created automatically at server startup.
CREATE TABLE IF NOT EXISTS aviaqua_app_store (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
