package agents

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/zimlivestock/backend/internal/database"
	"github.com/zimlivestock/backend/internal/payments"
)

// WinResult summarises the outcome of a win detection pass.
type WinResult struct {
	Checked int
	Won     int
	Lost    int
}

// WinDetector checks ended auctions for wins and triggers payment.
type WinDetector struct {
	db       *database.DB
	payments *payments.Orchestrator
}

// NewWinDetector creates a WinDetector with access to the payment orchestrator.
func NewWinDetector(db *database.DB, payments *payments.Orchestrator) *WinDetector {
	return &WinDetector{db: db, payments: payments}
}

// CheckWins finds all "placed" agent bids for the given agent, filters for ended
// auctions, determines if the agent won, and triggers payment or marks as lost.
func (w *WinDetector) CheckWins(ctx context.Context, agentID string) (*WinResult, error) {
	agent, err := w.db.GetAgentByID(ctx, agentID)
	if err != nil {
		return nil, fmt.Errorf("get agent: %w", err)
	}

	placedBids, err := w.db.GetAgentBidsByStatus(ctx, agentID, "placed")
	if err != nil {
		return nil, fmt.Errorf("get placed bids: %w", err)
	}

	if len(placedBids) == 0 {
		return &WinResult{}, nil
	}

	result := &WinResult{}

	for _, agentBid := range placedBids {
		// Check if the auction has ended.
		listing, err := w.db.GetLivestockByID(ctx, agentBid.LivestockID)
		if err != nil {
			slog.Error("get listing for win check failed",
				"agent_id", agentID,
				"livestock_id", agentBid.LivestockID,
				"error", err,
			)
			continue
		}

		// Only process ended or sold auctions.
		if listing.Status != "ended" && listing.Status != "sold" {
			continue
		}

		result.Checked++

		// Get the highest bid for this listing.
		highestBid, err := w.db.GetHighestBidForListing(ctx, agentBid.LivestockID)
		if err != nil {
			slog.Error("get highest bid failed",
				"agent_id", agentID,
				"livestock_id", agentBid.LivestockID,
				"error", err,
			)
			continue
		}

		if highestBid == nil {
			// No bids at all — should not happen, but mark as lost.
			if err := w.db.UpdateAgentBidStatus(ctx, agentBid.ID, "lost"); err != nil {
				slog.Error("update bid status to lost failed", "agent_bid_id", agentBid.ID, "error", err)
			}
			result.Lost++
			continue
		}

		// Check if our user placed the highest bid.
		if highestBid.UserID == agent.UserID {
			// Won the auction.
			slog.Info("auction won",
				"agent_id", agentID,
				"livestock_id", agentBid.LivestockID,
				"amount", highestBid.Amount,
			)

			if err := w.db.UpdateAgentBidStatus(ctx, agentBid.ID, "won"); err != nil {
				slog.Error("update bid status to won failed", "agent_bid_id", agentBid.ID, "error", err)
				continue
			}

			// Trigger payment via the orchestrator.
			_, err := w.payments.InitiatePayment(
				ctx,
				agentID,
				agentBid.LivestockID,
				agent.UserID,
				highestBid.Amount,
			)
			if err != nil {
				slog.Error("initiate payment failed",
					"agent_id", agentID,
					"livestock_id", agentBid.LivestockID,
					"error", err,
				)
				// Payment failure is logged but does not roll back the win status.
				// The orchestrator handles retries internally.
			}

			_ = w.db.LogAgentActivity(ctx, agentID, "bid_won", fmt.Sprintf(
				"Won auction for listing %s at US$%.2f", agentBid.LivestockID, highestBid.Amount,
			), map[string]any{
				"livestock_id": agentBid.LivestockID,
				"amount":       highestBid.Amount,
				"bid_id":       highestBid.ID,
			})

			result.Won++
		} else {
			// Lost the auction.
			slog.Info("auction lost",
				"agent_id", agentID,
				"livestock_id", agentBid.LivestockID,
				"winning_amount", highestBid.Amount,
				"our_amount", agentBid.Amount,
			)

			if err := w.db.UpdateAgentBidStatus(ctx, agentBid.ID, "lost"); err != nil {
				slog.Error("update bid status to lost failed", "agent_bid_id", agentBid.ID, "error", err)
				continue
			}

			_ = w.db.LogAgentActivity(ctx, agentID, "bid_lost", fmt.Sprintf(
				"Lost auction for listing %s (winner bid US$%.2f, our bid US$%.2f)",
				agentBid.LivestockID, highestBid.Amount, agentBid.Amount,
			), map[string]any{
				"livestock_id":   agentBid.LivestockID,
				"winning_amount": highestBid.Amount,
				"our_amount":     agentBid.Amount,
			})

			result.Lost++
		}
	}

	slog.Info("win detection complete",
		"agent_id", agentID,
		"checked", result.Checked,
		"won", result.Won,
		"lost", result.Lost,
	)

	return result, nil
}
