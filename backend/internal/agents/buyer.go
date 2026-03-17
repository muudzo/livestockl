package agents

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"strings"
	"time"

	"github.com/zimlivestock/backend/internal/database"
	"github.com/zimlivestock/backend/internal/models"
)

// CycleResult summarises one buyer agent run cycle.
type CycleResult struct {
	Decisions int
	Bids      int
	Wins      int
}

// BuyerAgent scans and evaluates listings for a buyer-type agent.
type BuyerAgent struct {
	db       *database.DB
	executor *BidExecutor
}

// NewBuyerAgent creates a BuyerAgent with a shared BidExecutor.
func NewBuyerAgent(db *database.DB, executor *BidExecutor) *BuyerAgent {
	return &BuyerAgent{db: db, executor: executor}
}

// RunCycle executes one full scan-evaluate-bid cycle for the given agent.
func (b *BuyerAgent) RunCycle(ctx context.Context, agentID string) (*CycleResult, error) {
	agent, err := b.db.GetAgentByID(ctx, agentID)
	if err != nil {
		return nil, fmt.Errorf("get agent: %w", err)
	}
	if agent.AgentType != "buyer" {
		return nil, fmt.Errorf("agent %s is type %q, expected buyer", agentID, agent.AgentType)
	}

	slog.Info("buyer cycle started", "agent_id", agentID, "name", agent.Name)

	goals, err := b.db.GetActiveGoals(ctx, agentID)
	if err != nil {
		return nil, fmt.Errorf("get active goals: %w", err)
	}

	if len(goals) == 0 {
		slog.Info("buyer has no active goals, skipping", "agent_id", agentID)
		return &CycleResult{}, nil
	}

	result := &CycleResult{}

	for _, goal := range goals {
		// Skip fulfilled goals.
		if goal.QuantityFulfilled >= goal.Quantity {
			continue
		}

		listings, err := b.db.SearchLivestockForGoal(ctx, goal)
		if err != nil {
			slog.Error("search livestock failed", "agent_id", agentID, "goal_id", goal.ID, "error", err)
			continue
		}

		slog.Info("listings found for goal",
			"agent_id", agentID,
			"goal_id", goal.ID,
			"category", goal.Category,
			"count", len(listings),
		)

		for _, listing := range listings {
			// Skip if we already have a bid on this listing.
			hasBid, err := b.db.HasAgentBidOnListing(ctx, agentID, listing.ID)
			if err != nil {
				slog.Error("check existing bid failed", "agent_id", agentID, "listing_id", listing.ID, "error", err)
				continue
			}
			if hasBid {
				continue
			}

			score, reasoning := scoreListing(listing, goal)
			confidence := float64(score) / 100.0

			decision := "skip"
			if score >= 75 {
				decision = "bid"
			}

			// Record the decision.
			goalID := goal.ID
			listingID := listing.ID
			dec := &models.AgentDecision{
				AgentID:     agentID,
				GoalID:      &goalID,
				LivestockID: &listingID,
				Decision:    decision,
				Reasoning:   reasoning,
				Confidence:  confidence,
				Metadata: map[string]any{
					"score":          score,
					"current_bid":    listing.CurrentBid,
					"starting_price": listing.StartingPrice,
					"bid_count":      listing.BidCount,
				},
			}
			if err := b.db.RecordAgentDecision(ctx, dec); err != nil {
				slog.Error("record decision failed", "agent_id", agentID, "error", err)
				continue
			}
			result.Decisions++

			_ = b.db.LogAgentActivity(ctx, agentID, "listing_evaluated", fmt.Sprintf(
				"Evaluated %s (score: %d, decision: %s)", listing.Title, score, decision,
			), map[string]any{
				"listing_id": listing.ID,
				"score":      score,
				"decision":   decision,
			})

			if decision == "bid" {
				bidAmount := calculateBidAmount(listing, goal)
				bidResult, err := b.executor.PlaceBid(ctx, agentID, goal.ID, listing.ID, bidAmount, "value_buy")
				if err != nil {
					slog.Error("place bid failed",
						"agent_id", agentID,
						"listing_id", listing.ID,
						"amount", bidAmount,
						"error", err,
					)
					continue
				}
				result.Bids++

				slog.Info("bid placed",
					"agent_id", agentID,
					"bid_id", bidResult.BidID,
					"listing_id", listing.ID,
					"amount", bidResult.Amount,
				)
			}
		}
	}

	// Update last run timestamp.
	_ = b.db.UpdateAgentLastRun(ctx, agentID, "idle")

	slog.Info("buyer cycle complete",
		"agent_id", agentID,
		"decisions", result.Decisions,
		"bids", result.Bids,
	)

	return result, nil
}

// scoreListing evaluates a listing against a goal and returns a score (0-100)
// plus a human-readable reasoning string.
func scoreListing(listing models.LivestockItem, goal models.AgentGoal) (int, string) {
	score := 0
	var reasons []string

	// Price vs budget (0-30 pts).
	effectivePrice := listing.CurrentBid
	if effectivePrice == 0 {
		effectivePrice = listing.StartingPrice
	}
	if goal.MaxPrice != nil && *goal.MaxPrice > 0 {
		ratio := effectivePrice / *goal.MaxPrice
		switch {
		case ratio <= 0.5:
			score += 30
			reasons = append(reasons, fmt.Sprintf("price US$%.0f is well under budget US$%.0f (+30)", effectivePrice, *goal.MaxPrice))
		case ratio <= 0.7:
			score += 25
			reasons = append(reasons, fmt.Sprintf("price US$%.0f is under budget US$%.0f (+25)", effectivePrice, *goal.MaxPrice))
		case ratio <= 0.85:
			score += 20
			reasons = append(reasons, fmt.Sprintf("price US$%.0f is reasonably under budget US$%.0f (+20)", effectivePrice, *goal.MaxPrice))
		case ratio <= 1.0:
			score += 10
			reasons = append(reasons, fmt.Sprintf("price US$%.0f is near budget limit US$%.0f (+10)", effectivePrice, *goal.MaxPrice))
		default:
			reasons = append(reasons, fmt.Sprintf("price US$%.0f exceeds budget US$%.0f (+0)", effectivePrice, *goal.MaxPrice))
		}
	} else {
		score += 15
		reasons = append(reasons, "no budget constraint (+15)")
	}

	// Location match (0-15 pts).
	if goal.PreferredLocation != nil && *goal.PreferredLocation != "" {
		if strings.EqualFold(listing.Location, *goal.PreferredLocation) {
			score += 15
			reasons = append(reasons, fmt.Sprintf("location %s matches preference (+15)", listing.Location))
		} else {
			reasons = append(reasons, fmt.Sprintf("location %s does not match preferred %s (+0)", listing.Location, *goal.PreferredLocation))
		}
	} else {
		score += 10
		reasons = append(reasons, "no location preference (+10)")
	}

	// Breed match (0-10 pts).
	if goal.PreferredBreed != nil && *goal.PreferredBreed != "" {
		if strings.EqualFold(listing.Breed, *goal.PreferredBreed) {
			score += 10
			reasons = append(reasons, fmt.Sprintf("breed %s matches preference (+10)", listing.Breed))
		} else {
			score += 3
			reasons = append(reasons, fmt.Sprintf("breed %s does not match preferred %s (+3)", listing.Breed, *goal.PreferredBreed))
		}
	} else {
		score += 7
		reasons = append(reasons, "no breed preference (+7)")
	}

	// Health score (0-10 pts).
	if goal.MinHealth != nil {
		healthRank := healthToRank(listing.Health)
		minRank := healthToRank(*goal.MinHealth)
		if healthRank >= minRank {
			score += 10
			reasons = append(reasons, fmt.Sprintf("health %s meets minimum %s (+10)", listing.Health, *goal.MinHealth))
		} else {
			reasons = append(reasons, fmt.Sprintf("health %s below minimum %s (+0)", listing.Health, *goal.MinHealth))
		}
	} else {
		switch listing.Health {
		case "Excellent":
			score += 10
			reasons = append(reasons, "health Excellent (+10)")
		case "Good":
			score += 7
			reasons = append(reasons, "health Good (+7)")
		default:
			score += 4
			reasons = append(reasons, fmt.Sprintf("health %s (+4)", listing.Health))
		}
	}

	// Competition / bid count (0-15 pts). Fewer bids = better opportunity.
	switch {
	case listing.BidCount == 0:
		score += 15
		reasons = append(reasons, "no competing bids (+15)")
	case listing.BidCount <= 2:
		score += 12
		reasons = append(reasons, fmt.Sprintf("%d competing bids, low competition (+12)", listing.BidCount))
	case listing.BidCount <= 5:
		score += 8
		reasons = append(reasons, fmt.Sprintf("%d competing bids, moderate competition (+8)", listing.BidCount))
	case listing.BidCount <= 10:
		score += 4
		reasons = append(reasons, fmt.Sprintf("%d competing bids, high competition (+4)", listing.BidCount))
	default:
		reasons = append(reasons, fmt.Sprintf("%d competing bids, very high competition (+0)", listing.BidCount))
	}

	// Time urgency (0-20 pts). Ending sooner = more urgent = higher score.
	remaining := time.Until(listing.EndTime)
	switch {
	case remaining <= 10*time.Minute:
		score += 20
		reasons = append(reasons, "ending in <10 min, very urgent (+20)")
	case remaining <= 1*time.Hour:
		score += 15
		reasons = append(reasons, "ending in <1 hour (+15)")
	case remaining <= 6*time.Hour:
		score += 10
		reasons = append(reasons, "ending in <6 hours (+10)")
	case remaining <= 24*time.Hour:
		score += 5
		reasons = append(reasons, "ending in <24 hours (+5)")
	default:
		score += 2
		reasons = append(reasons, fmt.Sprintf("ending in %.0f hours (+2)", remaining.Hours()))
	}

	// Cap at 100.
	if score > 100 {
		score = 100
	}

	reasoning := strings.Join(reasons, "; ")
	return score, reasoning
}

// healthToRank converts health string to a numeric rank for comparison.
func healthToRank(health string) int {
	switch health {
	case "Excellent":
		return 3
	case "Good":
		return 2
	case "Fair":
		return 1
	default:
		return 0
	}
}

// calculateBidAmount determines the bid amount based on listing state and goal budget.
func calculateBidAmount(listing models.LivestockItem, goal models.AgentGoal) float64 {
	currentPrice := listing.CurrentBid
	if currentPrice == 0 {
		currentPrice = listing.StartingPrice
	}

	// Bid 5% above current price, minimum US$5 increment.
	increment := currentPrice * 0.05
	if increment < 5.0 {
		increment = 5.0
	}
	bidAmount := currentPrice + increment

	// Never exceed the budget.
	if goal.MaxPrice != nil && bidAmount > *goal.MaxPrice {
		bidAmount = *goal.MaxPrice
	}

	// Round to 2 decimal places.
	bidAmount = math.Round(bidAmount*100) / 100

	return bidAmount
}
