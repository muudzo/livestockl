package agents

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/zimlivestock/backend/internal/database"
	"github.com/zimlivestock/backend/internal/payments"
)

// Scheduler runs buyer and sniper agents on a configurable interval.
type Scheduler struct {
	db           *database.DB
	buyer        *BuyerAgent
	sniper       *SniperAgent
	winDetector  *WinDetector
	interval     time.Duration
	cancel       context.CancelFunc
	wg           sync.WaitGroup
}

// NewScheduler creates a Scheduler that ticks at the given interval and
// processes all active agents each cycle.
func NewScheduler(db *database.DB, pay *payments.Orchestrator, interval time.Duration) *Scheduler {
	executor := NewBidExecutor(db)
	return &Scheduler{
		db:          db,
		buyer:       NewBuyerAgent(db, executor),
		sniper:      NewSniperAgent(db, executor),
		winDetector: NewWinDetector(db, pay),
		interval:    interval,
	}
}

// Start launches the scheduler loop in a background goroutine.
// It returns immediately. Call Stop to shut down gracefully.
func (s *Scheduler) Start(ctx context.Context) {
	ctx, s.cancel = context.WithCancel(ctx)
	s.wg.Add(1)

	go func() {
		defer s.wg.Done()

		slog.Info("agent scheduler started", "interval", s.interval.String())

		// Run one cycle immediately on start.
		s.runCycle(ctx)

		ticker := time.NewTicker(s.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				slog.Info("agent scheduler shutting down")
				return
			case <-ticker.C:
				s.runCycle(ctx)
			}
		}
	}()
}

// Stop cancels the scheduler context and waits for the goroutine to finish.
func (s *Scheduler) Stop() {
	if s.cancel != nil {
		s.cancel()
	}
	s.wg.Wait()
	slog.Info("agent scheduler stopped")
}

// runCycle fetches all active agents and processes each one.
func (s *Scheduler) runCycle(ctx context.Context) {
	cycleStart := time.Now()

	agents, err := s.db.GetActiveAgents(ctx)
	if err != nil {
		slog.Error("scheduler: failed to get active agents", "error", err)
		return
	}

	if len(agents) == 0 {
		return
	}

	slog.Info("scheduler cycle started", "active_agents", len(agents))

	for _, agent := range agents {
		// Check context before processing each agent.
		if ctx.Err() != nil {
			slog.Info("scheduler: context cancelled, stopping cycle")
			return
		}

		switch agent.AgentType {
		case "buyer":
			s.processBuyer(ctx, agent.ID)
		case "sniper":
			s.processSniper(ctx, agent.ID)
		default:
			slog.Warn("scheduler: unknown agent type", "agent_id", agent.ID, "type", agent.AgentType)
		}
	}

	elapsed := time.Since(cycleStart)
	slog.Info("scheduler cycle complete", "agents_processed", len(agents), "elapsed", elapsed.String())
}

// processBuyer runs the buyer cycle followed by win detection.
func (s *Scheduler) processBuyer(ctx context.Context, agentID string) {
	// Mark agent as running.
	_ = s.db.UpdateAgentLastRun(ctx, agentID, "running")

	cycleResult, err := s.buyer.RunCycle(ctx, agentID)
	if err != nil {
		slog.Error("scheduler: buyer cycle failed", "agent_id", agentID, "error", err)
		_ = s.db.UpdateAgentLastRun(ctx, agentID, "error")
		_ = s.db.LogAgentActivity(ctx, agentID, "cycle_error", err.Error(), map[string]any{
			"error": err.Error(),
		})
		return
	}

	winResult, err := s.winDetector.CheckWins(ctx, agentID)
	if err != nil {
		slog.Error("scheduler: win detection failed for buyer", "agent_id", agentID, "error", err)
	}

	wins := 0
	if winResult != nil {
		wins = winResult.Won
	}

	slog.Info("scheduler: buyer agent processed",
		"agent_id", agentID,
		"decisions", cycleResult.Decisions,
		"bids", cycleResult.Bids,
		"wins", wins,
	)
}

// processSniper runs the sniper scan followed by win detection.
func (s *Scheduler) processSniper(ctx context.Context, agentID string) {
	_ = s.db.UpdateAgentLastRun(ctx, agentID, "running")

	snipeResult, err := s.sniper.ScanEndingSoon(ctx, agentID)
	if err != nil {
		slog.Error("scheduler: sniper scan failed", "agent_id", agentID, "error", err)
		_ = s.db.UpdateAgentLastRun(ctx, agentID, "error")
		_ = s.db.LogAgentActivity(ctx, agentID, "cycle_error", err.Error(), map[string]any{
			"error": err.Error(),
		})
		return
	}

	winResult, err := s.winDetector.CheckWins(ctx, agentID)
	if err != nil {
		slog.Error("scheduler: win detection failed for sniper", "agent_id", agentID, "error", err)
	}

	wins := 0
	if winResult != nil {
		wins = winResult.Won
	}

	slog.Info("scheduler: sniper agent processed",
		"agent_id", agentID,
		"scanned", snipeResult.Scanned,
		"sniped", snipeResult.Sniped,
		"skipped", snipeResult.Skipped,
		"wins", wins,
	)
}
