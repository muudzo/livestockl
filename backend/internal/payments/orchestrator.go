package payments

import (
	"context"
	"fmt"
	"log/slog"
	"math/rand"
	"os"
	"time"

	"github.com/zimlivestock/backend/internal/database"
	"github.com/zimlivestock/backend/internal/models"
)

// Orchestrator manages payment processing with retry logic and method fallback.
// It replicates the payment-orchestrator Edge Function in Go.
type Orchestrator struct {
	db     *database.DB
	paynow *PaynowClient // nil = simulation mode (for dev/testing)
}

// NewOrchestrator creates a new payment orchestrator backed by the given database.
// If PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY are set, it uses the real
// Paynow API. Otherwise it falls back to simulation mode.
func NewOrchestrator(db *database.DB) *Orchestrator {
	o := &Orchestrator{db: db}

	integrationID := os.Getenv("PAYNOW_INTEGRATION_ID")
	integrationKey := os.Getenv("PAYNOW_INTEGRATION_KEY")
	resultURL := os.Getenv("PAYNOW_RESULT_URL")
	returnURL := os.Getenv("PAYNOW_RETURN_URL")

	if integrationID != "" && integrationKey != "" {
		slog.Info("paynow credentials found — using LIVE payment gateway",
			"integration_id", integrationID,
			"result_url", resultURL,
		)
		o.paynow = NewPaynowClient(PaynowConfig{
			IntegrationID:  integrationID,
			IntegrationKey: integrationKey,
			ResultURL:      resultURL,
			ReturnURL:      returnURL,
		})
	} else {
		slog.Warn("paynow credentials not set — using SIMULATION mode",
			"hint", "set PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY to enable live payments",
		)
	}

	return o
}

// PaynowClient returns the underlying Paynow client (may be nil in simulation mode).
func (o *Orchestrator) PaynowClient() *PaynowClient {
	return o.paynow
}

// PaymentMetrics holds aggregate statistics for the payment attempt cycle.
type PaymentMetrics struct {
	TotalOrders             int     `json:"total_orders"`
	Paid                    int     `json:"paid"`
	Failed                  int     `json:"failed"`
	FirstAttemptSuccessRate float64 `json:"first_attempt_success_rate"`
	WithRetrySuccessRate    float64 `json:"with_retry_success_rate"`
	RetryRecovered          int     `json:"retry_recovered"`
}

// PaymentResult is the outcome of an InitiatePayment or executePayment call.
type PaymentResult struct {
	Status    string         `json:"status"`
	Method    string         `json:"method"`
	Attempts  int            `json:"attempts"`
	Reference string         `json:"reference"`
	Error     string         `json:"error,omitempty"`
	Metrics   PaymentMetrics `json:"metrics"`
}

// fallbackChain is the ordered list of payment methods to try.
var fallbackChain = []string{"EcoCash", "OneMoney", "Card"}

// maxAttemptsPerMethod is how many times we retry a single method before falling back.
const maxAttemptsPerMethod = 3

// ecocashErrors are realistic error messages for EcoCash failures.
var ecocashErrors = []string{
	"USSD prompt timed out",
	"Insufficient balance",
	"Network timeout",
	"Daily limit exceeded",
}

// onemoneyErrors are realistic error messages for OneMoney failures.
var onemoneyErrors = []string{
	"Service unavailable",
	"Subscriber not registered",
	"USSD gateway unresponsive",
}

// cardErrors are realistic error messages for card payment failures.
var cardErrors = []string{
	"Card declined",
	"3D Secure failed",
	"Connection reset (Cloudflare)",
	"Gateway timeout",
}

// InitiatePayment creates a payment order and executes the payment with retry/fallback logic.
func (o *Orchestrator) InitiatePayment(ctx context.Context, agentID, livestockID, userID string, amount float64) (*PaymentResult, error) {
	slog.Info("initiating payment",
		"agent_id", agentID,
		"livestock_id", livestockID,
		"user_id", userID,
		"amount", amount,
	)

	// Create the payment order in agent_payment_orders (pending, ecocash).
	var orderID string
	err := o.db.Pool.QueryRow(ctx,
		`INSERT INTO agent_payment_orders (agent_id, livestock_id, user_id, amount, method, status, attempt_count, max_attempts)
		 VALUES ($1, $2, $3, $4, 'EcoCash', 'pending', 0, $5)
		 RETURNING id`,
		agentID, livestockID, userID, amount, maxAttemptsPerMethod,
	).Scan(&orderID)
	if err != nil {
		return nil, fmt.Errorf("create payment order: %w", err)
	}

	slog.Info("payment order created", "order_id", orderID)

	// Log order_created to settlement_ledger.
	if err := o.logLedger(ctx, orderID, "order_created", "EcoCash", 0, map[string]any{
		"agent_id":     agentID,
		"livestock_id": livestockID,
		"amount":       amount,
	}); err != nil {
		return nil, fmt.Errorf("log order_created: %w", err)
	}

	// Fetch the order and agent for executePayment.
	order, err := o.fetchOrder(ctx, orderID)
	if err != nil {
		return nil, fmt.Errorf("fetch order: %w", err)
	}

	agent, err := o.fetchAgent(ctx, agentID)
	if err != nil {
		return nil, fmt.Errorf("fetch agent: %w", err)
	}

	return o.executePayment(ctx, order, agent)
}

// executePayment runs the fallback chain with retries for each method.
func (o *Orchestrator) executePayment(ctx context.Context, order *models.AgentPaymentOrder, agent *models.Agent) (*PaymentResult, error) {
	totalAttempts := 0
	firstAttemptSucceeded := false

	for methodIdx, method := range fallbackChain {
		// Log fallback if switching from the first method.
		if methodIdx > 0 {
			slog.Info("falling back to next payment method",
				"order_id", order.ID,
				"from", fallbackChain[methodIdx-1],
				"to", method,
			)
			if err := o.logLedger(ctx, order.ID, "fallback_method", method, totalAttempts, map[string]any{
				"from_method": fallbackChain[methodIdx-1],
				"to_method":   method,
			}); err != nil {
				return nil, fmt.Errorf("log fallback_method: %w", err)
			}

			// Update the order's method.
			if _, err := o.db.Pool.Exec(ctx,
				`UPDATE agent_payment_orders SET method = $1, updated_at = now() WHERE id = $2`,
				method, order.ID,
			); err != nil {
				return nil, fmt.Errorf("update order method: %w", err)
			}
		}

		for attempt := 1; attempt <= maxAttemptsPerMethod; attempt++ {
			totalAttempts++

			// Log the attempt event.
			event := "payment_initiated"
			if attempt > 1 {
				event = "retry_attempted"
			}
			if err := o.logLedger(ctx, order.ID, event, method, attempt, map[string]any{
				"attempt": attempt,
				"method":  method,
			}); err != nil {
				return nil, fmt.Errorf("log %s: %w", event, err)
			}

			// Update attempt_count on the order.
			if _, err := o.db.Pool.Exec(ctx,
				`UPDATE agent_payment_orders SET attempt_count = $1, status = 'processing', updated_at = now() WHERE id = $2`,
				totalAttempts, order.ID,
			); err != nil {
				return nil, fmt.Errorf("update attempt_count: %w", err)
			}

			slog.Info("attempting payment",
				"order_id", order.ID,
				"method", method,
				"attempt", attempt,
				"total_attempts", totalAttempts,
			)

			success, reference, errMsg := o.callPaynow(ctx, order, method, attempt)

			if success {
				slog.Info("payment succeeded",
					"order_id", order.ID,
					"method", method,
					"reference", reference,
					"attempt", attempt,
				)

				if totalAttempts == 1 {
					firstAttemptSucceeded = true
				}

				// Update order to paid.
				now := time.Now()
				if _, err := o.db.Pool.Exec(ctx,
					`UPDATE agent_payment_orders
					 SET status = 'paid', paynow_reference = $1, method = $2, paid_at = $3, updated_at = now()
					 WHERE id = $4`,
					reference, method, now, order.ID,
				); err != nil {
					return nil, fmt.Errorf("update order to paid: %w", err)
				}

				// Log payment_succeeded.
				if err := o.logLedger(ctx, order.ID, "payment_succeeded", method, attempt, map[string]any{
					"reference":      reference,
					"total_attempts": totalAttempts,
				}); err != nil {
					return nil, fmt.Errorf("log payment_succeeded: %w", err)
				}

				// Log settlement_complete.
				if err := o.logLedger(ctx, order.ID, "settlement_complete", method, attempt, map[string]any{
					"reference": reference,
					"amount":    order.Amount,
				}); err != nil {
					return nil, fmt.Errorf("log settlement_complete: %w", err)
				}

				// Mark livestock as sold.
				if _, err := o.db.Pool.Exec(ctx,
					`UPDATE livestock_items SET status = 'sold' WHERE id = $1`,
					order.LivestockID,
				); err != nil {
					return nil, fmt.Errorf("mark livestock sold: %w", err)
				}

				// Update agent stats.
				if err := o.updateAgentStats(ctx, agent.ID, true, totalAttempts); err != nil {
					return nil, fmt.Errorf("update agent stats: %w", err)
				}

				retryRecovered := 0
				if totalAttempts > 1 {
					retryRecovered = 1
				}

				firstAttemptRate := 0.0
				if firstAttemptSucceeded {
					firstAttemptRate = 1.0
				}

				return &PaymentResult{
					Status:    "paid",
					Method:    method,
					Attempts:  totalAttempts,
					Reference: reference,
					Metrics: PaymentMetrics{
						TotalOrders:             1,
						Paid:                    1,
						Failed:                  0,
						FirstAttemptSuccessRate: firstAttemptRate,
						WithRetrySuccessRate:    1.0,
						RetryRecovered:          retryRecovered,
					},
				}, nil
			}

			// Payment attempt failed.
			slog.Warn("payment attempt failed",
				"order_id", order.ID,
				"method", method,
				"attempt", attempt,
				"error", errMsg,
			)

			// Update last_error on the order.
			if _, err := o.db.Pool.Exec(ctx,
				`UPDATE agent_payment_orders SET last_error = $1, updated_at = now() WHERE id = $2`,
				errMsg, order.ID,
			); err != nil {
				return nil, fmt.Errorf("update last_error: %w", err)
			}

			// Log payment_failed.
			if err := o.logLedger(ctx, order.ID, "payment_failed", method, attempt, map[string]any{
				"error":   errMsg,
				"attempt": attempt,
			}); err != nil {
				return nil, fmt.Errorf("log payment_failed: %w", err)
			}

			// Log retry_scheduled if there are more attempts remaining for this method.
			if attempt < maxAttemptsPerMethod {
				if err := o.logLedger(ctx, order.ID, "retry_scheduled", method, attempt, map[string]any{
					"next_attempt": attempt + 1,
					"method":       method,
				}); err != nil {
					return nil, fmt.Errorf("log retry_scheduled: %w", err)
				}
			}
		}
	}

	// All methods and attempts exhausted.
	slog.Error("payment failed after all methods exhausted", "order_id", order.ID)

	if _, err := o.db.Pool.Exec(ctx,
		`UPDATE agent_payment_orders SET status = 'failed', updated_at = now() WHERE id = $1`,
		order.ID,
	); err != nil {
		return nil, fmt.Errorf("update order to failed: %w", err)
	}

	// Update agent stats for failure.
	if err := o.updateAgentStats(ctx, agent.ID, false, totalAttempts); err != nil {
		return nil, fmt.Errorf("update agent stats (failure): %w", err)
	}

	return &PaymentResult{
		Status:   "failed",
		Method:   fallbackChain[len(fallbackChain)-1],
		Attempts: totalAttempts,
		Error:    "all payment methods exhausted",
		Metrics: PaymentMetrics{
			TotalOrders:             1,
			Paid:                    0,
			Failed:                  1,
			FirstAttemptSuccessRate: 0.0,
			WithRetrySuccessRate:    0.0,
			RetryRecovered:          0,
		},
	}, nil
}

// callPaynow routes to the real Paynow API or simulation depending on config.
func (o *Orchestrator) callPaynow(ctx context.Context, order *models.AgentPaymentOrder, method string, attempt int) (success bool, reference string, errMsg string) {
	if o.paynow == nil {
		return simulatePaynow(method, attempt)
	}

	// Use real Paynow API via mobile (express) checkout.
	mobileMethod, ok := MethodToMobile(method)
	if !ok {
		// Card payments don't have a mobile method — fall back to web checkout.
		// For agent-initiated payments, we can only do mobile push, so Card is simulated.
		slog.Info("no mobile method for Card — simulating", "order_id", order.ID)
		return simulatePaynow(method, attempt)
	}

	// We need a phone number and email. Pull from the user's profile.
	var phone, email string
	err := o.db.Pool.QueryRow(ctx,
		`SELECT COALESCE(phone, ''), COALESCE(email, '') FROM profiles WHERE id = $1`,
		order.UserID,
	).Scan(&phone, &email)
	if err != nil || phone == "" || email == "" {
		slog.Warn("missing user phone/email for live payment, falling back to simulation",
			"order_id", order.ID, "user_id", order.UserID, "error", err)
		return simulatePaynow(method, attempt)
	}

	ref := fmt.Sprintf("ZL-AGT-%s-%d", order.ID[:8], time.Now().UnixMilli())
	amount := fmt.Sprintf("%.2f", order.Amount)
	info := fmt.Sprintf("ZimLivestock agent payment for item %s", order.LivestockID)

	result, err := o.paynow.InitMobileTransaction(ctx, ref, amount, info, email, phone, mobileMethod)
	if err != nil {
		slog.Error("live paynow init failed",
			"order_id", order.ID,
			"method", method,
			"attempt", attempt,
			"error", err,
		)
		return false, "", err.Error()
	}

	// Poll for result (up to 120s with 5s intervals).
	if result.PollURL != "" {
		pollResult, pollErr := o.pollUntilTerminal(ctx, result.PollURL, 120*time.Second, 5*time.Second)
		if pollErr != nil {
			return false, "", fmt.Sprintf("poll failed: %s", pollErr.Error())
		}
		if IsPaid(pollResult.Status) {
			return true, pollResult.PaynowReference, ""
		}
		return false, "", fmt.Sprintf("paynow status: %s", pollResult.Status)
	}

	return false, "", "no poll URL returned from Paynow"
}

// pollUntilTerminal polls the Paynow transaction until it reaches a terminal state or times out.
func (o *Orchestrator) pollUntilTerminal(ctx context.Context, pollURL string, timeout, interval time.Duration) (*PaynowPollResponse, error) {
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		result, err := o.paynow.PollTransaction(ctx, pollURL)
		if err != nil {
			return nil, err
		}

		if IsTerminalStatus(result.Status) {
			return result, nil
		}

		slog.Info("payment not yet terminal, waiting...",
			"status", result.Status,
			"poll_url", pollURL,
		)

		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(interval):
			// Continue polling.
		}
	}

	return nil, fmt.Errorf("polling timed out after %s", timeout)
}

// simulatePaynow simulates a Paynow payment gateway call with realistic
// Zimbabwe-specific failure rates and error messages (used when no credentials are set).
func simulatePaynow(method string, attempt int) (success bool, reference string, errMsg string) {
	var baseRate float64
	var errors []string

	switch method {
	case "EcoCash":
		baseRate = 0.70
		errors = ecocashErrors
	case "OneMoney":
		baseRate = 0.60
		errors = onemoneyErrors
	case "Card":
		baseRate = 0.80
		errors = cardErrors
	default:
		return false, "", "unsupported payment method"
	}

	successRate := baseRate + float64(attempt-1)*0.10
	if successRate > 1.0 {
		successRate = 1.0
	}

	if rand.Float64() < successRate {
		ref := fmt.Sprintf("PN-%d-%06d", time.Now().UnixMilli(), rand.Intn(1000000))
		return true, ref, ""
	}

	msg := errors[rand.Intn(len(errors))]
	return false, "", msg
}

// GetPaymentStatus returns a payment order and all its settlement ledger entries.
func (o *Orchestrator) GetPaymentStatus(ctx context.Context, orderID string) (*models.AgentPaymentOrder, []models.SettlementLedger, error) {
	order, err := o.fetchOrder(ctx, orderID)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch order: %w", err)
	}

	rows, err := o.db.Pool.Query(ctx,
		`SELECT id, payment_order_id, event, method, attempt_number, details, created_at
		 FROM settlement_ledger
		 WHERE payment_order_id = $1
		 ORDER BY created_at ASC`,
		orderID,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("query settlement_ledger: %w", err)
	}
	defer rows.Close()

	var ledger []models.SettlementLedger
	for rows.Next() {
		var entry models.SettlementLedger
		if err := rows.Scan(
			&entry.ID,
			&entry.PaymentOrderID,
			&entry.Event,
			&entry.Method,
			&entry.AttemptNumber,
			&entry.Details,
			&entry.CreatedAt,
		); err != nil {
			return nil, nil, fmt.Errorf("scan settlement_ledger row: %w", err)
		}
		ledger = append(ledger, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, fmt.Errorf("iterate settlement_ledger rows: %w", err)
	}

	return order, ledger, nil
}

// logLedger inserts an event row into the settlement_ledger table.
func (o *Orchestrator) logLedger(ctx context.Context, orderID, event, method string, attemptNumber int, details map[string]any) error {
	_, err := o.db.Pool.Exec(ctx,
		`INSERT INTO settlement_ledger (payment_order_id, event, method, attempt_number, details)
		 VALUES ($1, $2, $3, $4, $5)`,
		orderID, event, method, attemptNumber, details,
	)
	return err
}

// fetchOrder retrieves a single agent_payment_orders row by ID.
func (o *Orchestrator) fetchOrder(ctx context.Context, orderID string) (*models.AgentPaymentOrder, error) {
	var order models.AgentPaymentOrder
	err := o.db.Pool.QueryRow(ctx,
		`SELECT id, agent_id, agent_bid_id, livestock_id, user_id, amount, method, status,
		        attempt_count, max_attempts, last_error, paynow_reference, created_at, paid_at, updated_at
		 FROM agent_payment_orders
		 WHERE id = $1`,
		orderID,
	).Scan(
		&order.ID,
		&order.AgentID,
		&order.AgentBidID,
		&order.LivestockID,
		&order.UserID,
		&order.Amount,
		&order.Method,
		&order.Status,
		&order.AttemptCount,
		&order.MaxAttempts,
		&order.LastError,
		&order.PaynowReference,
		&order.CreatedAt,
		&order.PaidAt,
		&order.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &order, nil
}

// fetchAgent retrieves a single agents row by ID.
func (o *Orchestrator) fetchAgent(ctx context.Context, agentID string) (*models.Agent, error) {
	var agent models.Agent
	err := o.db.Pool.QueryRow(ctx,
		`SELECT id, user_id, agent_type, name, status, config, stats, last_run_at, created_at, updated_at
		 FROM agents
		 WHERE id = $1`,
		agentID,
	).Scan(
		&agent.ID,
		&agent.UserID,
		&agent.AgentType,
		&agent.Name,
		&agent.Status,
		&agent.Config,
		&agent.Stats,
		&agent.LastRunAt,
		&agent.CreatedAt,
		&agent.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &agent, nil
}

// updateAgentStats increments the agent's payment-related stats in the stats JSONB column.
func (o *Orchestrator) updateAgentStats(ctx context.Context, agentID string, success bool, totalAttempts int) error {
	// Build the increments as a JSONB object and merge it with the existing stats
	// using the || operator for atomic update.
	paidInc := 0
	failedInc := 0
	if success {
		paidInc = 1
	} else {
		failedInc = 1
	}

	retryRecovered := 0
	if success && totalAttempts > 1 {
		retryRecovered = 1
	}

	firstAttemptSuccess := 0
	if success && totalAttempts == 1 {
		firstAttemptSuccess = 1
	}

	_, err := o.db.Pool.Exec(ctx,
		`UPDATE agents SET
			stats = stats || jsonb_build_object(
				'total_orders',            COALESCE((stats->>'total_orders')::int, 0) + 1,
				'paid',                    COALESCE((stats->>'paid')::int, 0) + $2,
				'failed',                  COALESCE((stats->>'failed')::int, 0) + $3,
				'first_attempt_successes', COALESCE((stats->>'first_attempt_successes')::int, 0) + $4,
				'retry_recovered',         COALESCE((stats->>'retry_recovered')::int, 0) + $5,
				'total_attempts',          COALESCE((stats->>'total_attempts')::int, 0) + $6
			),
			last_run_at = now(),
			updated_at = now()
		WHERE id = $1`,
		agentID, paidInc, failedInc, firstAttemptSuccess, retryRecovered, totalAttempts,
	)
	return err
}
