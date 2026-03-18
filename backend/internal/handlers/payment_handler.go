package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/zimlivestock/backend/internal/database"
	"github.com/zimlivestock/backend/internal/payments"
)

// PaymentHandler handles payment-related HTTP endpoints.
type PaymentHandler struct {
	db     *database.DB
	paynow *payments.PaynowClient
}

// NewPaymentHandler creates a new payment handler.
func NewPaymentHandler(db *database.DB, paynow *payments.PaynowClient) *PaymentHandler {
	return &PaymentHandler{db: db, paynow: paynow}
}

// InitiateWebPayment starts a web (redirect) checkout flow.
// The client receives a browserurl to redirect the buyer to Paynow's payment page.
//
// POST /api/payments/initiate-web
// Body: { "livestock_id": "...", "amount": 850.00, "email": "buyer@example.com" }
func (h *PaymentHandler) InitiateWebPayment(w http.ResponseWriter, r *http.Request) {
	var req struct {
		LivestockID string  `json:"livestock_id"`
		Amount      float64 `json:"amount"`
		Email       string  `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorBody("invalid request body"))
		return
	}

	if req.LivestockID == "" || req.Amount <= 0 {
		writeJSON(w, http.StatusBadRequest, errorBody("livestock_id and amount are required"))
		return
	}

	// Generate a unique merchant reference.
	reference := fmt.Sprintf("ZL-WEB-%d", time.Now().UnixMilli())
	amount := fmt.Sprintf("%.2f", req.Amount)
	info := fmt.Sprintf("ZimLivestock auction payment for item %s", req.LivestockID)

	// Store pending payment in DB before calling Paynow.
	var paymentID string
	err := h.db.Pool.QueryRow(r.Context(),
		`INSERT INTO payments (user_id, livestock_id, reference, amount, method, status, phone)
		 VALUES ($1, $2, $3, $4, 'Web', 'pending', NULL)
		 RETURNING id`,
		r.Header.Get("X-User-ID"), req.LivestockID, reference, req.Amount,
	).Scan(&paymentID)
	if err != nil {
		slog.Error("failed to create payment record", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("failed to create payment"))
		return
	}

	// Call Paynow web checkout.
	result, err := h.paynow.InitWebTransaction(r.Context(), reference, amount, info, req.Email)
	if err != nil {
		slog.Error("paynow web init failed", "error", err, "reference", reference)

		// Update payment record with error.
		h.db.Pool.Exec(r.Context(),
			`UPDATE payments SET status = 'failed', updated_at = now() WHERE id = $1`, paymentID)

		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error":   "payment gateway error",
			"details": err.Error(),
		})
		return
	}

	// Store the poll URL for later status checks.
	h.db.Pool.Exec(r.Context(),
		`UPDATE payments SET paynow_reference = $1, updated_at = now() WHERE id = $2`,
		result.PollURL, paymentID)

	writeJSON(w, http.StatusOK, map[string]any{
		"payment_id":  paymentID,
		"reference":   reference,
		"browser_url": result.BrowserURL,
		"poll_url":    result.PollURL,
		"status":      "redirect",
	})
}

// InitiateMobilePayment starts a mobile money (express) checkout flow.
// A USSD push is sent to the buyer's phone.
//
// POST /api/payments/initiate-mobile
// Body: { "livestock_id": "...", "amount": 850.00, "email": "...", "phone": "0771234567", "method": "ecocash" }
func (h *PaymentHandler) InitiateMobilePayment(w http.ResponseWriter, r *http.Request) {
	var req struct {
		LivestockID string  `json:"livestock_id"`
		Amount      float64 `json:"amount"`
		Email       string  `json:"email"`
		Phone       string  `json:"phone"`
		Method      string  `json:"method"` // "ecocash", "onemoney", "telecash", "innbucks"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorBody("invalid request body"))
		return
	}

	if req.LivestockID == "" || req.Amount <= 0 || req.Phone == "" || req.Method == "" {
		writeJSON(w, http.StatusBadRequest, errorBody("livestock_id, amount, phone, and method are required"))
		return
	}

	if req.Email == "" {
		writeJSON(w, http.StatusBadRequest, errorBody("email is required for mobile payments"))
		return
	}

	mobileMethod, ok := payments.MethodToMobile(req.Method)
	if !ok {
		writeJSON(w, http.StatusBadRequest, errorBody("unsupported method: use ecocash, onemoney, telecash, or innbucks"))
		return
	}

	reference := fmt.Sprintf("ZL-MOB-%d", time.Now().UnixMilli())
	amount := fmt.Sprintf("%.2f", req.Amount)
	info := fmt.Sprintf("ZimLivestock auction payment for item %s", req.LivestockID)

	// Map internal method name for DB storage.
	dbMethod := "EcoCash"
	switch mobileMethod {
	case payments.MobileOneMoney:
		dbMethod = "OneMoney"
	case payments.MobileTeleCash:
		dbMethod = "TeleCash"
	case payments.MobileInnBucks:
		dbMethod = "InnBucks"
	}

	var paymentID string
	err := h.db.Pool.QueryRow(r.Context(),
		`INSERT INTO payments (user_id, livestock_id, reference, amount, method, status, phone)
		 VALUES ($1, $2, $3, $4, $5, 'pending', $6)
		 RETURNING id`,
		r.Header.Get("X-User-ID"), req.LivestockID, reference, req.Amount, dbMethod, req.Phone,
	).Scan(&paymentID)
	if err != nil {
		slog.Error("failed to create payment record", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorBody("failed to create payment"))
		return
	}

	result, err := h.paynow.InitMobileTransaction(r.Context(), reference, amount, info, req.Email, req.Phone, mobileMethod)
	if err != nil {
		slog.Error("paynow mobile init failed", "error", err, "reference", reference)

		h.db.Pool.Exec(r.Context(),
			`UPDATE payments SET status = 'failed', updated_at = now() WHERE id = $1`, paymentID)

		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error":   "payment gateway error",
			"details": err.Error(),
		})
		return
	}

	// Store poll URL and Paynow reference.
	h.db.Pool.Exec(r.Context(),
		`UPDATE payments SET paynow_reference = $1, updated_at = now() WHERE id = $2`,
		result.PaynowReference, paymentID)

	writeJSON(w, http.StatusOK, map[string]any{
		"payment_id":       paymentID,
		"reference":        reference,
		"paynow_reference": result.PaynowReference,
		"poll_url":         result.PollURL,
		"instructions":     result.Instructions,
		"status":           "awaiting_payment",
	})
}

// PaymentWebhook handles the server-to-server callback from Paynow (resulturl).
// Paynow POSTs here when a transaction status changes.
//
// POST /api/payments/webhook
func (h *PaymentHandler) PaymentWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		slog.Error("failed to read webhook body", "error", err)
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	slog.Info("paynow webhook received", "body", string(body))

	result, err := h.paynow.ParseCallbackRequest(body)
	if err != nil {
		slog.Error("webhook parse/verify failed", "error", err, "body", string(body))
		http.Error(w, "invalid callback", http.StatusBadRequest)
		return
	}

	slog.Info("webhook parsed",
		"reference", result.Reference,
		"status", result.Status,
		"paynow_ref", result.PaynowReference,
		"amount", result.Amount,
	)

	// Map Paynow status to our internal status.
	var internalStatus string
	switch result.Status {
	case "Paid":
		internalStatus = "paid"
	case "Cancelled":
		internalStatus = "cancelled"
	case "Sent", "Created", "Awaiting Delivery":
		internalStatus = "processing"
	case "Disputed":
		internalStatus = "disputed"
	case "Refunded":
		internalStatus = "refunded"
	default:
		internalStatus = "pending"
	}

	// Update payment by merchant reference.
	tag, err := h.db.Pool.Exec(r.Context(),
		`UPDATE payments
		 SET status = $1, paynow_reference = $2, updated_at = now()
		 WHERE reference = $3`,
		internalStatus, result.PaynowReference, result.Reference,
	)
	if err != nil {
		slog.Error("failed to update payment from webhook", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	if tag.RowsAffected() == 0 {
		slog.Warn("webhook for unknown reference", "reference", result.Reference)
	}

	// If paid, mark the livestock as sold.
	if internalStatus == "paid" {
		h.db.Pool.Exec(r.Context(),
			`UPDATE livestock_items SET status = 'sold'
			 WHERE id = (SELECT livestock_id FROM payments WHERE reference = $1)`,
			result.Reference,
		)
		slog.Info("livestock marked as sold via webhook", "reference", result.Reference)
	}

	// Paynow expects a 200 OK response. Any non-200 causes retries.
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
}

// PollPaymentStatus polls Paynow for the latest status of a payment.
//
// POST /api/payments/poll
// Body: { "poll_url": "https://www.paynow.co.zw/..." }
func (h *PaymentHandler) PollPaymentStatus(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PollURL string `json:"poll_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PollURL == "" {
		writeJSON(w, http.StatusBadRequest, errorBody("poll_url is required"))
		return
	}

	result, err := h.paynow.PollTransaction(r.Context(), req.PollURL)
	if err != nil {
		slog.Error("poll failed", "error", err)
		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error":   "failed to poll payment status",
			"details": err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"reference":        result.Reference,
		"paynow_reference": result.PaynowReference,
		"status":           result.Status,
		"amount":           result.Amount,
		"is_paid":          payments.IsPaid(result.Status),
		"is_terminal":      payments.IsTerminalStatus(result.Status),
	})
}

// GetPaymentByReference looks up a payment by its merchant reference.
//
// GET /api/payments/ref/{reference}
func (h *PaymentHandler) GetPaymentByReference(w http.ResponseWriter, r *http.Request) {
	ref := r.PathValue("reference")
	if ref == "" {
		writeJSON(w, http.StatusBadRequest, errorBody("reference is required"))
		return
	}

	var p struct {
		ID              string  `json:"id"`
		Reference       string  `json:"reference"`
		Amount          float64 `json:"amount"`
		Method          string  `json:"method"`
		Status          string  `json:"status"`
		PaynowReference *string `json:"paynow_reference"`
	}

	err := h.db.Pool.QueryRow(r.Context(),
		`SELECT id, reference, amount, method, status, paynow_reference
		 FROM payments WHERE reference = $1`,
		ref,
	).Scan(&p.ID, &p.Reference, &p.Amount, &p.Method, &p.Status, &p.PaynowReference)
	if err != nil {
		writeJSON(w, http.StatusNotFound, errorBody("payment not found"))
		return
	}

	writeJSON(w, http.StatusOK, p)
}
