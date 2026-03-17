package agents

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"time"

	"github.com/zimlivestock/backend/internal/database"
)

// SnipeResult summarises a sniper agent scan.
type SnipeResult struct {
	Scanned  int
	Sniped   int
	Skipped  int
}

// SniperAgent watches for auctions ending soon and places last-moment bids.
type SniperAgent struct {
	db       *database.DB
	executor *BidExecutor
}

// NewSniperAgent creates a SniperAgent with a shared BidExecutor.
func NewSniperAgent(db *database.DB, executor *BidExecutor) *SniperAgent {
	return &SniperAgent{db: db, executor: executor}
}

// snipeWindow is the window before auction end in which the sniper acts.
const snipeWindow = 5 * time.Minute

// ScanEndingSoon finds auctions ending within 5 minutes that match the sniper's goals
// and places bids 3% above the current price (minimum US$5 increment).
func (s *SniperAgent) ScanEndingSoon(ctx context.Context, agentID string) (*SnipeResult, error) {
	agent, err := s.db.GetAgentByID(ctx, agentID)
	if err != nil {
		return nil, fmt.Errorf("get agent: %w", err)
	}
	if agent.AgentType != "sniper" {
		return nil, fmt.Errorf("agent %s is type %q, expected sniper", agentID, agent.AgentType)
	}

	slog.Info("sniper scan started", "agent_id", agentID, "name", agent.Name)

	goals, err := s.db.GetActiveGoals(ctx, agentID)
	if err != nil {
		return nil, fmt.Errorf("get active goals: %w", err)
	}

	if len(goals) == 0 {
		slog.Info("sniper has no active goals, skipping", "agent_id", agentID)
		return &SnipeResult{}, nil
	}

	result := &SnipeResult{}

	for _, goal := range goals {
		if goal.QuantityFulfilled >= goal.Quantity {
			continue
		}

		auctions, err := s.db.FindEndingSoonAuctions(
			ctx,
			snipeWindow,
			goal.Category,
			goal.PreferredLocation,
			goal.PreferredBreed,
			goal.MaxPrice,
		)
		if err != nil {
			slog.Error("find ending soon auctions failed",
				"agent_id", agentID,
				"goal_id", goal.ID,
				"error", err,
			)
			continue
		}

		slog.Info("ending soon auctions found",
			"agent_id", agentID,
			"goal_id", goal.ID,
			"count", len(auctions),
		)

		for _, auction := range auctions {
			result.Scanned++

			// Skip if already bid on this listing.
			hasBid, err := s.db.HasAgentBidOnListing(ctx, agentID, auction.ID)
			if err != nil {
				slog.Error("check existing bid failed", "agent_id", agentID, "listing_id", auction.ID, "error", err)
				continue
			}
			if hasBid {
				result.Skipped++
				continue
			}

			// Calculate snipe bid: 3% above current price, minimum US$5 increment.
			currentPrice := auction.CurrentBid
			if currentPrice == 0 {
				currentPrice = auction.StartingPrice
			}

			increment := currentPrice * 0.03
			if increment < 5.0 {
				increment = 5.0
			}
			snipeAmount := math.Round((currentPrice+increment)*100) / 100

			// Do not exceed budget.
			if goal.MaxPrice != nil && snipeAmount > *goal.MaxPrice {
				slog.Info("snipe amount exceeds budget, skipping",
					"agent_id", agentID,
					"listing_id", auction.ID,
					"snipe_amount", snipeAmount,
					"budget", *goal.MaxPrice,
				)
				result.Skipped++

				_ = s.db.LogAgentActivity(ctx, agentID, "snipe_skipped", fmt.Sprintf(
					"Skipped %s — snipe US$%.2f exceeds budget US$%.2f",
					auction.Title, snipeAmount, *goal.MaxPrice,
				), map[string]any{
					"listing_id":   auction.ID,
					"snipe_amount": snipeAmount,
					"budget":       *goal.MaxPrice,
				})
				continue
			}

			remaining := time.Until(auction.EndTime)

			bidResult, err := s.executor.PlaceBid(ctx, agentID, goal.ID, auction.ID, snipeAmount, "snipe")
			if err != nil {
				slog.Error("snipe bid failed",
					"agent_id", agentID,
					"listing_id", auction.ID,
					"amount", snipeAmount,
					"error", err,
				)

				_ = s.db.LogAgentActivity(ctx, agentID, "snipe_missed", fmt.Sprintf(
					"Failed to snipe %s at US$%.2f: %v", auction.Title, snipeAmount, err,
				), map[string]any{
					"listing_id": auction.ID,
					"amount":     snipeAmount,
					"remaining":  remaining.Seconds(),
					"error":      err.Error(),
				})
				continue
			}

			result.Sniped++

			slog.Info("snipe executed",
				"agent_id", agentID,
				"bid_id", bidResult.BidID,
				"listing_id", auction.ID,
				"amount", bidResult.Amount,
				"remaining_seconds", remaining.Seconds(),
			)

			_ = s.db.LogAgentActivity(ctx, agentID, "snipe_executed", fmt.Sprintf(
				"Sniped %s at US$%.2f with %.0fs remaining",
				auction.Title, bidResult.Amount, remaining.Seconds(),
			), map[string]any{
				"listing_id": auction.ID,
				"bid_id":     bidResult.BidID,
				"amount":     bidResult.Amount,
				"remaining":  remaining.Seconds(),
			})
		}
	}

	_ = s.db.UpdateAgentLastRun(ctx, agentID, "idle")

	slog.Info("sniper scan complete",
		"agent_id", agentID,
		"scanned", result.Scanned,
		"sniped", result.Sniped,
		"skipped", result.Skipped,
	)

	return result, nil
}
