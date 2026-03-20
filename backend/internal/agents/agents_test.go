package agents

import (
	"testing"
	"time"

	"github.com/zimlivestock/backend/internal/models"
)

// ── Struct Creation Tests ───────────────────────────────────────────
// These verify that exported types compile and can be instantiated.

func TestBuyerAgentStruct(t *testing.T) {
	t.Run("buyer agent struct creation", func(t *testing.T) {
		_ = BuyerAgent{}
	})
}

func TestSniperAgentStruct(t *testing.T) {
	t.Run("sniper agent struct creation", func(t *testing.T) {
		_ = SniperAgent{}
	})
}

func TestBidExecutorStruct(t *testing.T) {
	t.Run("bid executor struct creation", func(t *testing.T) {
		_ = BidExecutor{}
	})
}

func TestWinDetectorStruct(t *testing.T) {
	t.Run("win detector struct creation", func(t *testing.T) {
		_ = WinDetector{}
	})
}

func TestSchedulerStruct(t *testing.T) {
	t.Run("scheduler struct creation", func(t *testing.T) {
		_ = Scheduler{}
	})
}

// ── Result Type Tests ───────────────────────────────────────────────

func TestBidResult(t *testing.T) {
	t.Run("bid result fields", func(t *testing.T) {
		r := BidResult{
			BidID:    "test-bid-id",
			Amount:   150.00,
			Strategy: "market_price",
		}
		if r.BidID != "test-bid-id" {
			t.Errorf("BidID = %q, want %q", r.BidID, "test-bid-id")
		}
		if r.Amount != 150.00 {
			t.Errorf("Amount = %f, want 150.00", r.Amount)
		}
		if r.Strategy != "market_price" {
			t.Errorf("Strategy = %q, want %q", r.Strategy, "market_price")
		}
	})
}

func TestCycleResult(t *testing.T) {
	t.Run("cycle result fields", func(t *testing.T) {
		r := CycleResult{Decisions: 5, Bids: 2, Wins: 1}
		if r.Decisions != 5 {
			t.Errorf("Decisions = %d, want 5", r.Decisions)
		}
		if r.Bids != 2 {
			t.Errorf("Bids = %d, want 2", r.Bids)
		}
		if r.Wins != 1 {
			t.Errorf("Wins = %d, want 1", r.Wins)
		}
	})
}

func TestSnipeResult(t *testing.T) {
	t.Run("snipe result fields", func(t *testing.T) {
		r := SnipeResult{Scanned: 10, Sniped: 3, Skipped: 7}
		if r.Scanned != 10 {
			t.Errorf("Scanned = %d, want 10", r.Scanned)
		}
		if r.Sniped != 3 {
			t.Errorf("Sniped = %d, want 3", r.Sniped)
		}
		if r.Skipped != 7 {
			t.Errorf("Skipped = %d, want 7", r.Skipped)
		}
	})
}

func TestWinResult(t *testing.T) {
	t.Run("win result fields", func(t *testing.T) {
		r := WinResult{Checked: 4, Won: 1, Lost: 3}
		if r.Checked != 4 {
			t.Errorf("Checked = %d, want 4", r.Checked)
		}
		if r.Won != 1 {
			t.Errorf("Won = %d, want 1", r.Won)
		}
		if r.Lost != 3 {
			t.Errorf("Lost = %d, want 3", r.Lost)
		}
	})
}

// ── Constants ───────────────────────────────────────────────────────

func TestSnipeWindow(t *testing.T) {
	t.Run("snipe window is 5 minutes", func(t *testing.T) {
		if snipeWindow != 5*time.Minute {
			t.Errorf("snipeWindow = %v, want 5m", snipeWindow)
		}
	})
}

// ── Pure Function Tests: scoreListing ───────────────────────────────

func TestScoreListing(t *testing.T) {
	maxPrice := 500.0
	preferredLocation := "Harare"
	preferredBreed := "Brahman"
	minHealth := "Good"

	baseGoal := models.AgentGoal{
		ID:                "goal-1",
		AgentID:           "agent-1",
		Category:          "Cattle",
		MaxPrice:          &maxPrice,
		PreferredLocation: &preferredLocation,
		PreferredBreed:    &preferredBreed,
		MinHealth:         &minHealth,
		Quantity:          5,
	}

	t.Run("high score for ideal listing", func(t *testing.T) {
		listing := models.LivestockItem{
			ID:            "listing-1",
			Title:         "Prime Brahman Bull",
			Category:      "Cattle",
			Breed:         "Brahman",
			Location:      "Harare",
			Health:        "Excellent",
			StartingPrice: 200,
			CurrentBid:    0,
			BidCount:      0,
			EndTime:       time.Now().Add(30 * time.Minute), // ending in <1 hour
		}

		score, reasoning := scoreListing(listing, baseGoal)

		// Price 200 vs budget 500 -> ratio 0.4 -> 30pts
		// Location match -> 15pts
		// Breed match -> 10pts
		// Health Excellent >= Good -> 10pts
		// No competing bids -> 15pts
		// Ending in <1 hour -> 15pts
		// Total: 95
		if score < 80 {
			t.Errorf("score = %d, want >= 80 for ideal listing (reasoning: %s)", score, reasoning)
		}
		if reasoning == "" {
			t.Error("reasoning should not be empty")
		}
	})

	t.Run("low score for expensive listing with competition", func(t *testing.T) {
		listing := models.LivestockItem{
			ID:            "listing-2",
			Title:         "Expensive Bull",
			Category:      "Cattle",
			Breed:         "Hereford",
			Location:      "Bulawayo",
			Health:        "Fair",
			StartingPrice: 400,
			CurrentBid:    550,
			BidCount:      15,
			EndTime:       time.Now().Add(48 * time.Hour),
		}

		score, reasoning := scoreListing(listing, baseGoal)

		// Price 550 vs budget 500 -> ratio > 1.0 -> 0pts
		// Location mismatch -> 0pts
		// Breed mismatch -> 3pts
		// Health Fair < Good -> 0pts
		// 15 bids -> 0pts
		// Ending in 48h -> 2pts
		// Total: ~5
		if score > 30 {
			t.Errorf("score = %d, want <= 30 for poor listing (reasoning: %s)", score, reasoning)
		}
		if reasoning == "" {
			t.Error("reasoning should not be empty")
		}
	})

	t.Run("no budget constraint gives partial score", func(t *testing.T) {
		goalNoBudget := baseGoal
		goalNoBudget.MaxPrice = nil

		listing := models.LivestockItem{
			ID:            "listing-3",
			Title:         "Any Bull",
			Category:      "Cattle",
			Breed:         "Brahman",
			Location:      "Harare",
			Health:        "Good",
			StartingPrice: 1000,
			CurrentBid:    0,
			BidCount:      0,
			EndTime:       time.Now().Add(5 * time.Minute),
		}

		score, _ := scoreListing(listing, goalNoBudget)
		// No budget -> 15pts (partial)
		if score < 50 {
			t.Errorf("score = %d, want >= 50 for no-budget matching listing", score)
		}
	})

	t.Run("score is capped at 100", func(t *testing.T) {
		listing := models.LivestockItem{
			ID:            "listing-4",
			Title:         "Perfect Listing",
			Category:      "Cattle",
			Breed:         "Brahman",
			Location:      "Harare",
			Health:        "Excellent",
			StartingPrice: 50,
			CurrentBid:    0,
			BidCount:      0,
			EndTime:       time.Now().Add(5 * time.Minute),
		}

		score, _ := scoreListing(listing, baseGoal)
		if score > 100 {
			t.Errorf("score = %d, must not exceed 100", score)
		}
	})
}

// ── Pure Function Tests: healthToRank ───────────────────────────────

func TestHealthToRank(t *testing.T) {
	tests := []struct {
		health string
		want   int
	}{
		{"Excellent", 3},
		{"Good", 2},
		{"Fair", 1},
		{"Poor", 0},
		{"Unknown", 0},
		{"", 0},
	}

	for _, tt := range tests {
		t.Run(tt.health, func(t *testing.T) {
			got := healthToRank(tt.health)
			if got != tt.want {
				t.Errorf("healthToRank(%q) = %d, want %d", tt.health, got, tt.want)
			}
		})
	}
}

// ── Pure Function Tests: calculateBidAmount ─────────────────────────

func TestCalculateBidAmount(t *testing.T) {
	maxPrice := 500.0

	t.Run("bids 5% above current bid", func(t *testing.T) {
		listing := models.LivestockItem{CurrentBid: 200, StartingPrice: 100}
		goal := models.AgentGoal{MaxPrice: &maxPrice}

		amount := calculateBidAmount(listing, goal)
		// 200 * 1.05 = 210
		if amount != 210.0 {
			t.Errorf("amount = %.2f, want 210.00", amount)
		}
	})

	t.Run("uses starting price when no current bid", func(t *testing.T) {
		listing := models.LivestockItem{CurrentBid: 0, StartingPrice: 100}
		goal := models.AgentGoal{MaxPrice: &maxPrice}

		amount := calculateBidAmount(listing, goal)
		// 100 * 1.05 = 105
		if amount != 105.0 {
			t.Errorf("amount = %.2f, want 105.00", amount)
		}
	})

	t.Run("minimum increment is US$5", func(t *testing.T) {
		listing := models.LivestockItem{CurrentBid: 50, StartingPrice: 50}
		goal := models.AgentGoal{MaxPrice: &maxPrice}

		amount := calculateBidAmount(listing, goal)
		// 50 * 0.05 = 2.50 < 5, so increment = 5 -> 55
		if amount != 55.0 {
			t.Errorf("amount = %.2f, want 55.00", amount)
		}
	})

	t.Run("never exceeds budget", func(t *testing.T) {
		budget := 205.0
		listing := models.LivestockItem{CurrentBid: 200, StartingPrice: 100}
		goal := models.AgentGoal{MaxPrice: &budget}

		amount := calculateBidAmount(listing, goal)
		// 200 * 1.05 = 210 > 205, capped to 205
		if amount != 205.0 {
			t.Errorf("amount = %.2f, want 205.00 (budget cap)", amount)
		}
	})

	t.Run("no budget constraint", func(t *testing.T) {
		listing := models.LivestockItem{CurrentBid: 1000, StartingPrice: 500}
		goal := models.AgentGoal{MaxPrice: nil}

		amount := calculateBidAmount(listing, goal)
		// 1000 * 1.05 = 1050, no cap
		if amount != 1050.0 {
			t.Errorf("amount = %.2f, want 1050.00", amount)
		}
	})
}
