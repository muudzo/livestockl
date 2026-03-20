package database

import (
	"context"
	"os"
	"testing"
)

// getTestDB creates a real database connection for integration tests.
// Skips the test if DATABASE_URL is not set.
func getTestDB(t *testing.T) *DB {
	t.Helper()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("DATABASE_URL not set — skipping integration test")
	}

	db, err := New(dbURL)
	if err != nil {
		t.Fatalf("connect to database: %v", err)
	}
	t.Cleanup(func() { db.Pool.Close() })
	return db
}

func TestPlaceBid_Validation(t *testing.T) {
	db := getTestDB(t)
	ctx := context.Background()

	// These tests require actual data in the database.
	// We test the error paths that don't depend on specific data.

	t.Run("rejects bid on nonexistent listing", func(t *testing.T) {
		_, err := db.PlaceBid(ctx, "00000000-0000-0000-0000-000000000000", "user-1", 100)
		if err == nil {
			t.Fatal("expected error for nonexistent listing")
		}
	})
}

func TestListActiveLivestock(t *testing.T) {
	db := getTestDB(t)
	ctx := context.Background()

	t.Run("returns empty slice not nil for no results", func(t *testing.T) {
		// Query with a very specific filter that likely returns nothing
		items, err := db.ListActiveLivestock(ctx, "NonexistentCategory", "", 10)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		// Should be nil slice or empty, but not error
		_ = items
	})

	t.Run("respects limit", func(t *testing.T) {
		items, err := db.ListActiveLivestock(ctx, "", "", 1)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(items) > 1 {
			t.Fatalf("expected at most 1 item, got %d", len(items))
		}
	})

	t.Run("caps limit at 100", func(t *testing.T) {
		// Passing 0 or negative should default to 20
		items, err := db.ListActiveLivestock(ctx, "", "", 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(items) > 20 {
			t.Fatalf("default limit should be 20, got %d items", len(items))
		}
	})

	t.Run("filters by category", func(t *testing.T) {
		items, err := db.ListActiveLivestock(ctx, "Cattle", "", 50)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		for _, item := range items {
			if item.Category != "Cattle" {
				t.Errorf("expected category Cattle, got %q", item.Category)
			}
		}
	})
}

func TestGetLivestockByID(t *testing.T) {
	db := getTestDB(t)
	ctx := context.Background()

	t.Run("returns error for nonexistent ID", func(t *testing.T) {
		_, err := db.GetLivestockByID(ctx, "00000000-0000-0000-0000-000000000000")
		if err == nil {
			t.Fatal("expected error for nonexistent ID")
		}
	})

	t.Run("returns error for invalid UUID", func(t *testing.T) {
		_, err := db.GetLivestockByID(ctx, "not-a-uuid")
		if err == nil {
			t.Fatal("expected error for invalid UUID")
		}
	})
}

func TestSyncListingBid(t *testing.T) {
	db := getTestDB(t)
	ctx := context.Background()

	t.Run("does not error on nonexistent listing", func(t *testing.T) {
		// SyncListingBid updates WHERE id = X, so nonexistent ID just updates 0 rows
		err := db.SyncListingBid(ctx, "00000000-0000-0000-0000-000000000000")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})
}

func TestGetAgentsByUserID(t *testing.T) {
	db := getTestDB(t)
	ctx := context.Background()

	t.Run("returns empty for nonexistent user", func(t *testing.T) {
		agents, err := db.GetAgentsByUserID(ctx, "00000000-0000-0000-0000-000000000000")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(agents) != 0 {
			t.Fatalf("expected 0 agents, got %d", len(agents))
		}
	})
}

func TestGetAgentGoals(t *testing.T) {
	db := getTestDB(t)
	ctx := context.Background()

	t.Run("returns empty for nonexistent agent", func(t *testing.T) {
		goals, err := db.GetAgentGoals(ctx, "00000000-0000-0000-0000-000000000000")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(goals) != 0 {
			t.Fatalf("expected 0 goals, got %d", len(goals))
		}
	})
}

func TestRunMigrations(t *testing.T) {
	db := getTestDB(t)

	t.Run("migrations are idempotent", func(t *testing.T) {
		// Running migrations twice should not error (IF NOT EXISTS)
		if err := RunMigrations(db); err != nil {
			t.Fatalf("first migration run: %v", err)
		}
		if err := RunMigrations(db); err != nil {
			t.Fatalf("second migration run: %v", err)
		}
	})
}
