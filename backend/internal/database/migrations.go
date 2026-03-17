package database

import (
	"context"
	"fmt"
	"time"
)

// RunMigrations creates all tables, indexes, and constraints.
// All statements use IF NOT EXISTS so they are safe to run repeatedly.
func RunMigrations(db *DB) error {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	statements := []string{
		// ── profiles ────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS profiles (
			id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			email         text NOT NULL,
			first_name    text NOT NULL,
			last_name     text NOT NULL,
			phone         text NOT NULL,
			password_hash text NOT NULL,
			verified      boolean NOT NULL DEFAULT false,
			rating        numeric(2,1) NOT NULL DEFAULT 0,
			sales_count   integer NOT NULL DEFAULT 0,
			created_at    timestamptz NOT NULL DEFAULT now()
		)`,

		// ── livestock_items ─────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS livestock_items (
			id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			title           text NOT NULL CHECK (char_length(title) <= 200),
			category        text NOT NULL CHECK (category IN ('Cattle','Goats','Sheep','Pigs','Chickens','Other')),
			breed           text NOT NULL,
			age             text NOT NULL,
			weight          text NOT NULL,
			description     text NOT NULL CHECK (char_length(description) <= 2000),
			location        text NOT NULL CHECK (location IN ('Harare','Bulawayo','Mutare','Masvingo','Gweru','Chinhoyi','Kadoma','Kwekwe')),
			health          text NOT NULL CHECK (health IN ('Excellent','Good','Fair')),
			starting_price  numeric NOT NULL CHECK (starting_price > 0),
			current_bid     numeric NOT NULL DEFAULT 0,
			bid_count       integer NOT NULL DEFAULT 0,
			view_count      integer NOT NULL DEFAULT 0,
			image_urls      text[] NOT NULL DEFAULT '{}',
			seller_id       uuid NOT NULL REFERENCES profiles(id),
			status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended','sold','cancelled')),
			duration_days   integer NOT NULL CHECK (duration_days IN (1,3,7,14)),
			end_time        timestamptz NOT NULL,
			created_at      timestamptz NOT NULL DEFAULT now()
		)`,

		// ── bids ────────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS bids (
			id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			livestock_id  uuid NOT NULL REFERENCES livestock_items(id) ON DELETE CASCADE,
			user_id       uuid NOT NULL REFERENCES profiles(id),
			amount        numeric NOT NULL CHECK (amount > 0),
			is_winner     boolean NOT NULL DEFAULT false,
			created_at    timestamptz NOT NULL DEFAULT now()
		)`,

		// ── payments ────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS payments (
			id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id           uuid NOT NULL REFERENCES profiles(id),
			livestock_id      uuid NOT NULL REFERENCES livestock_items(id),
			reference         text UNIQUE NOT NULL,
			amount            numeric NOT NULL CHECK (amount > 0),
			method            text NOT NULL CHECK (method IN ('EcoCash','OneMoney','Card')),
			status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
			paynow_reference  text,
			phone             text,
			created_at        timestamptz NOT NULL DEFAULT now(),
			updated_at        timestamptz NOT NULL DEFAULT now()
		)`,

		// ── notifications ───────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS notifications (
			id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id   uuid NOT NULL REFERENCES profiles(id),
			type      text NOT NULL CHECK (type IN ('bid','message','auction_ending','auction_won','auction_lost','verification','payment')),
			title     text NOT NULL,
			message   text NOT NULL,
			read      boolean NOT NULL DEFAULT false,
			priority  text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
			created_at timestamptz NOT NULL DEFAULT now()
		)`,

		// ── agents ──────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS agents (
			id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id     uuid NOT NULL REFERENCES profiles(id),
			agent_type  text NOT NULL,
			name        text NOT NULL,
			status      text NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','running','paused','error')),
			config      jsonb NOT NULL DEFAULT '{}',
			stats       jsonb NOT NULL DEFAULT '{}',
			last_run_at timestamptz,
			created_at  timestamptz NOT NULL DEFAULT now(),
			updated_at  timestamptz NOT NULL DEFAULT now()
		)`,

		// ── agent_goals ─────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS agent_goals (
			id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			agent_id            uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
			category            text NOT NULL CHECK (category IN ('Cattle','Goats','Sheep','Pigs','Chickens','Other')),
			preferred_breed     text,
			preferred_location  text,
			min_health          text CHECK (min_health IS NULL OR min_health IN ('Excellent','Good','Fair')),
			max_price           numeric CHECK (max_price IS NULL OR max_price > 0),
			quantity            integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
			quantity_fulfilled  integer NOT NULL DEFAULT 0 CHECK (quantity_fulfilled >= 0),
			status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','fulfilled','cancelled')),
			created_at          timestamptz NOT NULL DEFAULT now()
		)`,

		// ── agent_decisions ─────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS agent_decisions (
			id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			agent_id      uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
			goal_id       uuid REFERENCES agent_goals(id) ON DELETE SET NULL,
			livestock_id  uuid REFERENCES livestock_items(id) ON DELETE SET NULL,
			decision      text NOT NULL,
			reasoning     text NOT NULL,
			confidence    numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
			metadata      jsonb NOT NULL DEFAULT '{}',
			created_at    timestamptz NOT NULL DEFAULT now()
		)`,

		// ── agent_bids ──────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS agent_bids (
			id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			agent_id      uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
			goal_id       uuid REFERENCES agent_goals(id) ON DELETE SET NULL,
			livestock_id  uuid NOT NULL REFERENCES livestock_items(id),
			bid_id        uuid REFERENCES bids(id) ON DELETE SET NULL,
			amount        numeric NOT NULL CHECK (amount > 0),
			strategy      text NOT NULL,
			status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','placed','won','lost','cancelled')),
			created_at    timestamptz NOT NULL DEFAULT now()
		)`,

		// ── agent_activity_log ──────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS agent_activity_log (
			id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			agent_id    uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
			event_type  text NOT NULL,
			message     text NOT NULL,
			metadata    jsonb NOT NULL DEFAULT '{}',
			created_at  timestamptz NOT NULL DEFAULT now()
		)`,

		// ── agent_payment_orders ────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS agent_payment_orders (
			id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			agent_id          uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
			agent_bid_id      uuid REFERENCES agent_bids(id) ON DELETE SET NULL,
			livestock_id      uuid NOT NULL REFERENCES livestock_items(id),
			user_id           uuid NOT NULL REFERENCES profiles(id),
			amount            numeric NOT NULL CHECK (amount > 0),
			method            text NOT NULL CHECK (method IN ('EcoCash','OneMoney','Card')),
			status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','cancelled')),
			attempt_count     integer NOT NULL DEFAULT 0,
			max_attempts      integer NOT NULL DEFAULT 3,
			last_error        text,
			paynow_reference  text,
			created_at        timestamptz NOT NULL DEFAULT now(),
			paid_at           timestamptz,
			updated_at        timestamptz NOT NULL DEFAULT now()
		)`,

		// ── settlement_ledger ───────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS settlement_ledger (
			id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			payment_order_id  uuid NOT NULL REFERENCES agent_payment_orders(id) ON DELETE CASCADE,
			event             text NOT NULL,
			method            text NOT NULL,
			attempt_number    integer NOT NULL DEFAULT 1,
			details           jsonb NOT NULL DEFAULT '{}',
			created_at        timestamptz NOT NULL DEFAULT now()
		)`,

		// ── indexes ─────────────────────────────────────────────────
		// livestock
		`CREATE INDEX IF NOT EXISTS idx_livestock_category ON livestock_items(category)`,
		`CREATE INDEX IF NOT EXISTS idx_livestock_status ON livestock_items(status)`,
		`CREATE INDEX IF NOT EXISTS idx_livestock_seller ON livestock_items(seller_id)`,
		`CREATE INDEX IF NOT EXISTS idx_livestock_end_time ON livestock_items(end_time)`,
		`CREATE INDEX IF NOT EXISTS idx_livestock_status_category ON livestock_items(status, category)`,
		`CREATE INDEX IF NOT EXISTS idx_livestock_status_created ON livestock_items(status, created_at DESC)`,

		// bids
		`CREATE INDEX IF NOT EXISTS idx_bids_livestock ON bids(livestock_id)`,
		`CREATE INDEX IF NOT EXISTS idx_bids_user ON bids(user_id)`,

		// payments
		`CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference)`,
		`CREATE INDEX IF NOT EXISTS idx_payments_livestock ON payments(livestock_id)`,

		// notifications
		`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,

		// agents
		`CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_agent_goals_agent ON agent_goals(agent_id)`,
		`CREATE INDEX IF NOT EXISTS idx_agent_decisions_agent ON agent_decisions(agent_id)`,
		`CREATE INDEX IF NOT EXISTS idx_agent_bids_agent ON agent_bids(agent_id)`,
		`CREATE INDEX IF NOT EXISTS idx_agent_bids_livestock ON agent_bids(livestock_id)`,
		`CREATE INDEX IF NOT EXISTS idx_agent_activity_log_agent ON agent_activity_log(agent_id)`,
		`CREATE INDEX IF NOT EXISTS idx_agent_payment_orders_agent ON agent_payment_orders(agent_id)`,
		`CREATE INDEX IF NOT EXISTS idx_settlement_ledger_order ON settlement_ledger(payment_order_id)`,
	}

	for i, stmt := range statements {
		if _, err := db.Pool.Exec(ctx, stmt); err != nil {
			return fmt.Errorf("migration statement %d: %w", i, err)
		}
	}

	return nil
}
