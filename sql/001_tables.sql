-- ============================================
-- Bootcamp 2.0 — Tables Supabase
-- A executer dans le SQL Editor du dashboard
-- ============================================

-- 1. Table inscriptions
CREATE TABLE IF NOT EXISTS inscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telephone_normalized text NOT NULL UNIQUE,
  nom_complet text,
  email text,
  statut text NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente', 'en_attente_paiement', 'confirmee', 'annulee', 'remboursee')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Table payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inscription_id uuid REFERENCES inscriptions(id) ON DELETE SET NULL,
  telephone_normalized text NOT NULL,
  montant integer,
  reference_transaction text,
  source text,
  statut text NOT NULL DEFAULT 'succes'
    CHECK (statut IN ('succes', 'echoue')),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Table webhook_logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text,
  statut text NOT NULL DEFAULT 'traite'
    CHECK (statut IN ('traite', 'echoue', 'non_trouve')),
  payload jsonb,
  headers jsonb,
  reference_transaction text,
  code_paiement text,
  montant integer,
  telephone_normalized text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour la recherche par telephone
CREATE INDEX IF NOT EXISTS idx_inscriptions_phone ON inscriptions(telephone_normalized);
CREATE INDEX IF NOT EXISTS idx_payments_phone ON payments(telephone_normalized);
CREATE INDEX IF NOT EXISTS idx_payments_inscription ON payments(inscription_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_phone ON webhook_logs(telephone_normalized);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- anon peut lire inscriptions (pour la recherche par telephone)
CREATE POLICY "Anon can read inscriptions"
  ON inscriptions FOR SELECT
  TO anon
  USING (true);

-- anon peut lire payments (pour verifier le statut)
CREATE POLICY "Anon can read payments"
  ON payments FOR SELECT
  TO anon
  USING (true);

-- anon ne peut PAS ecrire dans inscriptions/payments/webhook_logs
-- Seul service_role (Edge Function) peut ecrire

CREATE POLICY "Service role can insert inscriptions"
  ON inscriptions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update inscriptions"
  ON inscriptions FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can insert payments"
  ON payments FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can insert webhook_logs"
  ON webhook_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read webhook_logs"
  ON webhook_logs FOR SELECT
  TO service_role
  USING (true);