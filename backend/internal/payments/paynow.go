package payments

import (
	"context"
	"crypto/sha512"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// PaynowConfig holds the credentials and URLs needed to talk to the Paynow API.
type PaynowConfig struct {
	IntegrationID  string
	IntegrationKey string
	ResultURL      string // Server-to-server callback URL (your webhook endpoint)
	ReturnURL      string // Browser redirect after payment
	BaseURL        string // Defaults to https://www.paynow.co.zw
}

// PaynowClient is a low-level HTTP client for the Paynow payment gateway.
// There is no official Go SDK — this is built from the raw API spec.
type PaynowClient struct {
	cfg        PaynowConfig
	httpClient *http.Client
}

// PaynowInitResponse is the parsed response from initiating a transaction.
type PaynowInitResponse struct {
	Status           string // "Ok" or "Error"
	BrowserURL       string // URL to redirect buyer to (web checkout only)
	PollURL          string // URL to poll for transaction status
	Hash             string
	Error            string // Error message if status is "Error"
	PaynowReference  string // Paynow's reference (mobile only)
	Instructions     string // USSD instructions (mobile only)
}

// PaynowPollResponse is the parsed response from polling transaction status.
type PaynowPollResponse struct {
	Reference       string // Merchant's original reference
	Amount          string
	PaynowReference string
	PollURL         string
	Status          string // Created, Sent, Paid, Cancelled, Disputed, Refunded, etc.
	Hash            string
	Error           string
}

// MobileMethod represents the mobile money providers Paynow supports.
type MobileMethod string

const (
	MobileEcoCash  MobileMethod = "ecocash"
	MobileOneMoney MobileMethod = "onemoney"
	MobileTeleCash MobileMethod = "telecash"
	MobileInnBucks MobileMethod = "innbucks"
)

const defaultPaynowBaseURL = "https://www.paynow.co.zw"

// NewPaynowClient creates a Paynow client with sensible HTTP timeouts.
//
// PITFALL #1: Paynow's server (196.44.182.165) is notoriously slow and
// sometimes completely unresponsive. We use a 30s timeout to avoid hanging
// goroutines, but even this may not be enough during outages.
func NewPaynowClient(cfg PaynowConfig) *PaynowClient {
	if cfg.BaseURL == "" {
		cfg.BaseURL = defaultPaynowBaseURL
	}
	return &PaynowClient{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// InitWebTransaction initiates a web (redirect) checkout.
// The buyer is redirected to Paynow's hosted payment page via the returned BrowserURL.
//
// PITFALL #2: The request body must be application/x-www-form-urlencoded, NOT JSON.
// Paynow will silently return an error or garbage if you send JSON.
//
// PITFALL #3: The "status" field in the REQUEST body must always be the literal
// string "Message". This is NOT the transaction status — it's a protocol field.
// Every SDK does this, but it's completely undocumented in the API docs.
func (c *PaynowClient) InitWebTransaction(ctx context.Context, reference, amount, additionalInfo, authEmail string) (*PaynowInitResponse, error) {
	// Build values in the exact order expected for hash computation.
	// PITFALL #4: Field order matters for the hash. The hash is computed by
	// concatenating VALUES in insertion order. If you use Go's map (random order),
	// your hash will be wrong ~99% of the time. We use url.Values carefully and
	// also compute the hash from a separate ordered slice.
	values := []fieldPair{
		{"resulturl", c.cfg.ResultURL},
		{"returnurl", c.cfg.ReturnURL},
		{"reference", reference},
		{"amount", amount},
		{"id", c.cfg.IntegrationID},
		{"additionalinfo", additionalInfo},
		{"authemail", authEmail},
		{"status", "Message"},
	}

	hash := c.computeHash(values)

	form := url.Values{}
	for _, f := range values {
		form.Set(f.key, f.value)
	}
	form.Set("hash", hash)

	endpoint := c.cfg.BaseURL + "/interface/initiatetransaction"
	return c.doInitRequest(ctx, endpoint, form)
}

// InitMobileTransaction initiates a mobile money (express) checkout.
// A USSD push is sent to the buyer's phone — they confirm with their PIN.
//
// PITFALL #5: The "authemail" field is REQUIRED for mobile transactions even
// though it's optional for web transactions. If you omit it, you get a cryptic
// hash mismatch error, not a helpful "email required" message.
//
// PITFALL #6: The "phone" field must be a valid Zimbabwean mobile number.
// Format: "0771234567" (no country code, no spaces, no dashes).
// If you send "+263771234567" Paynow may reject it silently.
//
// PITFALL #7: The "method" field is case-sensitive in some SDK implementations
// but the API itself appears to accept lowercase. We send lowercase to be safe
// (matching the NodeJS SDK behavior).
func (c *PaynowClient) InitMobileTransaction(ctx context.Context, reference, amount, additionalInfo, authEmail, phone string, method MobileMethod) (*PaynowInitResponse, error) {
	values := []fieldPair{
		{"resulturl", c.cfg.ResultURL},
		{"returnurl", c.cfg.ReturnURL},
		{"reference", reference},
		{"amount", amount},
		{"id", c.cfg.IntegrationID},
		{"additionalinfo", additionalInfo},
		{"authemail", authEmail},
		{"phone", phone},
		{"method", string(method)},
		{"status", "Message"},
	}

	hash := c.computeHash(values)

	form := url.Values{}
	for _, f := range values {
		form.Set(f.key, f.value)
	}
	form.Set("hash", hash)

	endpoint := c.cfg.BaseURL + "/interface/remotetransaction"
	return c.doInitRequest(ctx, endpoint, form)
}

// PollTransaction checks the current status of a transaction.
//
// PITFALL #8: The poll endpoint uses POST with an EMPTY body, not GET.
// If you send a GET request, you'll get an HTML page back instead of the
// status response. This is counter-intuitive and undocumented.
//
// PITFALL #9: The poll URL returned by Paynow is fully qualified (includes
// https://www.paynow.co.zw/...). Do NOT prepend the base URL again.
func (c *PaynowClient) PollTransaction(ctx context.Context, pollURL string) (*PaynowPollResponse, error) {
	slog.Info("polling paynow transaction", "poll_url", pollURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, pollURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create poll request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("poll request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read poll response: %w", err)
	}

	// PITFALL #10: Responses are URL-encoded query strings, NOT JSON.
	// e.g. "status=Paid&reference=INV123&amount=25.50&hash=ABC..."
	// If you try json.Unmarshal on this, you'll get a confusing error.
	parsed, err := url.ParseQuery(string(body))
	if err != nil {
		return nil, fmt.Errorf("parse poll response (got: %q): %w", string(body), err)
	}

	result := &PaynowPollResponse{
		Reference:       parsed.Get("reference"),
		Amount:          parsed.Get("amount"),
		PaynowReference: parsed.Get("paynowreference"),
		PollURL:         parsed.Get("pollurl"),
		Status:          parsed.Get("status"),
		Hash:            parsed.Get("hash"),
		Error:           parsed.Get("error"),
	}

	// Verify hash on non-error responses.
	// PITFALL #11: Error responses may not include a valid hash. If you try to
	// verify the hash on an error response, you'll reject legitimate error
	// messages and never know what went wrong.
	if result.Status != "Error" && result.Status != "" {
		if err := c.verifyResponseHash(parsed); err != nil {
			return nil, fmt.Errorf("poll response hash verification failed: %w", err)
		}
	}

	slog.Info("poll result", "status", result.Status, "paynow_ref", result.PaynowReference)
	return result, nil
}

// ParseCallbackRequest parses the result URL (webhook) POST body from Paynow.
// This is called when Paynow POSTs to your resulturl after payment status changes.
//
// PITFALL #12: The webhook body is application/x-www-form-urlencoded, same as
// the poll response. It is NOT JSON. Your webhook handler must use
// r.ParseForm() or read the body and url.ParseQuery(), not json.Decode().
//
// PITFALL #13: You MUST verify the hash on webhook callbacks. Without this,
// anyone can POST fake "Paid" statuses to your webhook and steal goods.
func (c *PaynowClient) ParseCallbackRequest(body []byte) (*PaynowPollResponse, error) {
	parsed, err := url.ParseQuery(string(body))
	if err != nil {
		return nil, fmt.Errorf("parse callback body: %w", err)
	}

	result := &PaynowPollResponse{
		Reference:       parsed.Get("reference"),
		Amount:          parsed.Get("amount"),
		PaynowReference: parsed.Get("paynowreference"),
		PollURL:         parsed.Get("pollurl"),
		Status:          parsed.Get("status"),
		Hash:            parsed.Get("hash"),
		Error:           parsed.Get("error"),
	}

	// Always verify hash on callbacks (except errors).
	if result.Status != "Error" {
		if err := c.verifyResponseHash(parsed); err != nil {
			return nil, fmt.Errorf("callback hash verification failed (possible tampering): %w", err)
		}
	}

	return result, nil
}

// fieldPair is an ordered key-value pair for deterministic hash computation.
type fieldPair struct {
	key   string
	value string
}

// computeHash builds the SHA-512 hash required by Paynow.
//
// Algorithm:
//  1. Concatenate all field VALUES (not keys) in order
//  2. Append the integration key
//  3. SHA-512 hash the result
//  4. Convert to UPPERCASE hex
//
// PITFALL #14: The NodeJS SDK lowercases the integration key before hashing.
// The Java SDK does NOT. We do NOT lowercase — matching the Java SDK, which is
// the original/authoritative implementation. If your hashes don't match,
// try lowercasing the key as a fallback.
//
// PITFALL #15: The hash is over the raw field values, NOT the URL-encoded values.
// The NodeJS SDK confusingly URL-encodes before hashing in some code paths,
// but the Java SDK (and the actual API) expects raw values. If you hash the
// encoded values (e.g., "US%24" instead of "US$"), you'll get a mismatch.
func (c *PaynowClient) computeHash(fields []fieldPair) string {
	var concat string
	for _, f := range fields {
		concat += f.value
	}
	concat += c.cfg.IntegrationKey

	h := sha512.Sum512([]byte(concat))
	return fmt.Sprintf("%X", h)
}

// verifyResponseHash verifies the SHA-512 hash in a Paynow response/callback.
func (c *PaynowClient) verifyResponseHash(parsed url.Values) error {
	receivedHash := parsed.Get("hash")
	if receivedHash == "" {
		return fmt.Errorf("no hash in response")
	}

	// Rebuild hash from response values in the order they appear.
	// PITFALL #16: The field order for RESPONSE hash verification is different
	// from the REQUEST hash. You must iterate the response fields in the order
	// Paynow sends them, excluding "hash" itself. The known response fields are:
	// reference, amount, paynowreference, pollurl, status (and error if present).
	responseFields := []string{
		"reference", "amount", "paynowreference", "pollurl", "status",
	}

	var concat string
	for _, key := range responseFields {
		if val := parsed.Get(key); val != "" {
			concat += val
		}
	}
	concat += c.cfg.IntegrationKey

	h := sha512.Sum512([]byte(concat))
	expected := fmt.Sprintf("%X", h)

	if !strings.EqualFold(expected, receivedHash) {
		return fmt.Errorf("hash mismatch: expected %s, got %s", expected, receivedHash)
	}

	return nil
}

// doInitRequest sends the form POST and parses the init response.
func (c *PaynowClient) doInitRequest(ctx context.Context, endpoint string, form url.Values) (*PaynowInitResponse, error) {
	slog.Info("initiating paynow transaction",
		"endpoint", endpoint,
		"reference", form.Get("reference"),
		"amount", form.Get("amount"),
		"method", form.Get("method"),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	// PITFALL #17: You MUST set Content-Type to application/x-www-form-urlencoded.
	// Without this header, Paynow returns a 200 OK with an HTML error page
	// instead of the expected query-string response. No error code, no message —
	// just HTML. This is one of the most common integration failures.
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		// PITFALL #18: Paynow's server (www.paynow.co.zw) sits behind Cloudflare
		// bot protection. Programmatic requests from non-Zimbabwean IPs (and even
		// some Zimbabwean IPs) may get blocked with "Connection reset by peer",
		// ETIMEDOUT, or a Cloudflare challenge page. There is NO workaround except
		// retrying or running your server in Zimbabwe.
		return nil, fmt.Errorf("paynow request failed (server may be down or blocked by Cloudflare): %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response body: %w", err)
	}

	// PITFALL #19: Paynow sometimes returns HTTP 200 with an HTML body when
	// the server is overloaded or Cloudflare intercepts. Check Content-Type
	// or look for "<html" in the body before parsing as query string.
	bodyStr := string(body)
	if strings.Contains(bodyStr, "<html") || strings.Contains(bodyStr, "<!DOCTYPE") {
		return nil, fmt.Errorf("paynow returned HTML instead of query string (Cloudflare block or server error), body prefix: %.200s", bodyStr)
	}

	parsed, err := url.ParseQuery(bodyStr)
	if err != nil {
		return nil, fmt.Errorf("parse init response (got: %q): %w", bodyStr, err)
	}

	result := &PaynowInitResponse{
		Status:          parsed.Get("status"),
		BrowserURL:      parsed.Get("browserurl"),
		PollURL:         parsed.Get("pollurl"),
		Hash:            parsed.Get("hash"),
		Error:           parsed.Get("error"),
		PaynowReference: parsed.Get("paynowreference"),
		Instructions:    parsed.Get("instructions"),
	}

	if result.Status == "Error" {
		// PITFALL #20: The error field often says "Invalid id." (with the period)
		// for wrong integration IDs, or gives a generic hash mismatch message
		// with zero debugging info. Log everything you sent for debugging.
		slog.Error("paynow init error",
			"error", result.Error,
			"reference", form.Get("reference"),
			"amount", form.Get("amount"),
			"id", form.Get("id"),
		)
		return result, fmt.Errorf("paynow error: %s", result.Error)
	}

	// Verify response hash.
	if err := c.verifyResponseHash(parsed); err != nil {
		slog.Warn("paynow response hash verification failed", "error", err)
		// Don't fail hard — some Paynow responses have hash issues.
		// Log and continue.
	}

	slog.Info("paynow init success",
		"status", result.Status,
		"browser_url", result.BrowserURL,
		"poll_url", result.PollURL,
		"paynow_ref", result.PaynowReference,
	)

	return result, nil
}

// IsTerminalStatus returns true if the transaction status is final (no more polling needed).
func IsTerminalStatus(status string) bool {
	switch status {
	case "Paid", "Cancelled", "Refunded", "Error", "Invalid id.":
		return true
	default:
		return false
	}
}

// IsPaid returns true if the transaction was successfully paid.
func IsPaid(status string) bool {
	return status == "Paid"
}

// MethodToMobile maps our internal payment method names to Paynow's mobile method codes.
//
// PITFALL #21: Our internal system uses "EcoCash" and "OneMoney" (PascalCase)
// but Paynow's API expects "ecocash" and "onemoney" (lowercase). Forgetting
// this mapping causes "unsupported method" errors with no useful context.
func MethodToMobile(method string) (MobileMethod, bool) {
	switch strings.ToLower(method) {
	case "ecocash":
		return MobileEcoCash, true
	case "onemoney":
		return MobileOneMoney, true
	case "telecash":
		return MobileTeleCash, true
	case "innbucks":
		return MobileInnBucks, true
	default:
		return "", false
	}
}
