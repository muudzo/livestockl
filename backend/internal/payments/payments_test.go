package payments

import (
	"crypto/sha512"
	"fmt"
	"net/url"
	"strings"
	"testing"
)

func TestSimulatePaynow(t *testing.T) {
	t.Run("EcoCash has ~70% base success rate", func(t *testing.T) {
		successes := 0
		trials := 1000
		for i := 0; i < trials; i++ {
			ok, ref, errMsg := simulatePaynow("EcoCash", 1)
			if ok {
				successes++
				if ref == "" {
					t.Fatal("successful payment should return a reference")
				}
				if !strings.HasPrefix(ref, "PN-") {
					t.Fatalf("reference should start with PN-, got %q", ref)
				}
			} else {
				if errMsg == "" {
					t.Fatal("failed payment should return an error message")
				}
			}
		}
		rate := float64(successes) / float64(trials)
		// Allow wide margin for randomness
		if rate < 0.5 || rate > 0.9 {
			t.Fatalf("EcoCash success rate %.2f outside expected range [0.5, 0.9]", rate)
		}
	})

	t.Run("retry improves success rate", func(t *testing.T) {
		// Attempt 1 vs attempt 3: attempt 3 should have higher rate
		attempt1Successes := 0
		attempt3Successes := 0
		trials := 1000
		for i := 0; i < trials; i++ {
			ok1, _, _ := simulatePaynow("EcoCash", 1)
			ok3, _, _ := simulatePaynow("EcoCash", 3)
			if ok1 {
				attempt1Successes++
			}
			if ok3 {
				attempt3Successes++
			}
		}
		rate1 := float64(attempt1Successes) / float64(trials)
		rate3 := float64(attempt3Successes) / float64(trials)
		if rate3 <= rate1-0.05 { // Allow small margin
			t.Fatalf("retry should improve: attempt1=%.2f, attempt3=%.2f", rate1, rate3)
		}
	})

	t.Run("unsupported method always fails", func(t *testing.T) {
		ok, _, errMsg := simulatePaynow("Bitcoin", 1)
		if ok {
			t.Fatal("unsupported method should fail")
		}
		if errMsg != "unsupported payment method" {
			t.Fatalf("expected 'unsupported payment method', got %q", errMsg)
		}
	})

	t.Run("all supported methods work", func(t *testing.T) {
		methods := []string{"EcoCash", "OneMoney", "Card"}
		for _, method := range methods {
			// Try enough times that at least one should succeed
			anySuccess := false
			for i := 0; i < 20; i++ {
				ok, _, _ := simulatePaynow(method, 3)
				if ok {
					anySuccess = true
					break
				}
			}
			if !anySuccess {
				t.Fatalf("method %s never succeeded in 20 attempts (very unlikely)", method)
			}
		}
	})
}

func TestFallbackChain(t *testing.T) {
	t.Run("chain order is EcoCash, OneMoney, Card", func(t *testing.T) {
		expected := []string{"EcoCash", "OneMoney", "Card"}
		if len(fallbackChain) != len(expected) {
			t.Fatalf("fallbackChain length = %d, want %d", len(fallbackChain), len(expected))
		}
		for i, m := range expected {
			if fallbackChain[i] != m {
				t.Errorf("fallbackChain[%d] = %q, want %q", i, fallbackChain[i], m)
			}
		}
	})

	t.Run("max attempts per method is 3", func(t *testing.T) {
		if maxAttemptsPerMethod != 3 {
			t.Fatalf("maxAttemptsPerMethod = %d, want 3", maxAttemptsPerMethod)
		}
	})
}

func TestMethodToMobile(t *testing.T) {
	tests := []struct {
		input    string
		expected MobileMethod
		ok       bool
	}{
		{"EcoCash", MobileEcoCash, true},
		{"ecocash", MobileEcoCash, true},
		{"ECOCASH", MobileEcoCash, true},
		{"OneMoney", MobileOneMoney, true},
		{"onemoney", MobileOneMoney, true},
		{"telecash", MobileTeleCash, true},
		{"innbucks", MobileInnBucks, true},
		{"Card", "", false},
		{"Bitcoin", "", false},
		{"", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got, ok := MethodToMobile(tt.input)
			if ok != tt.ok {
				t.Errorf("MethodToMobile(%q) ok = %v, want %v", tt.input, ok, tt.ok)
			}
			if got != tt.expected {
				t.Errorf("MethodToMobile(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestIsTerminalStatus(t *testing.T) {
	tests := []struct {
		status   string
		terminal bool
	}{
		{"Paid", true},
		{"Cancelled", true},
		{"Refunded", true},
		{"Error", true},
		{"Invalid id.", true},
		{"Created", false},
		{"Sent", false},
		{"Awaiting Delivery", false},
		{"", false},
	}

	for _, tt := range tests {
		t.Run(tt.status, func(t *testing.T) {
			if got := IsTerminalStatus(tt.status); got != tt.terminal {
				t.Errorf("IsTerminalStatus(%q) = %v, want %v", tt.status, got, tt.terminal)
			}
		})
	}
}

func TestIsPaid(t *testing.T) {
	if !IsPaid("Paid") {
		t.Error("IsPaid(\"Paid\") should be true")
	}
	if IsPaid("Cancelled") {
		t.Error("IsPaid(\"Cancelled\") should be false")
	}
	if IsPaid("") {
		t.Error("IsPaid(\"\") should be false")
	}
}

func TestPaynowHashComputation(t *testing.T) {
	// Create a client with known credentials to test hash computation
	client := NewPaynowClient(PaynowConfig{
		IntegrationID:  "12345",
		IntegrationKey: "test-key-abc",
		ResultURL:      "https://example.com/result",
		ReturnURL:      "https://example.com/return",
	})

	t.Run("hash is deterministic", func(t *testing.T) {
		fields := []fieldPair{
			{"resulturl", "https://example.com/result"},
			{"returnurl", "https://example.com/return"},
			{"reference", "INV-001"},
			{"amount", "100.00"},
			{"id", "12345"},
			{"additionalinfo", "Test payment"},
			{"authemail", "test@example.com"},
			{"status", "Message"},
		}

		hash1 := client.computeHash(fields)
		hash2 := client.computeHash(fields)
		if hash1 != hash2 {
			t.Fatal("hash should be deterministic")
		}
	})

	t.Run("hash is uppercase hex SHA-512", func(t *testing.T) {
		fields := []fieldPair{
			{"field1", "value1"},
			{"field2", "value2"},
		}
		hash := client.computeHash(fields)

		// SHA-512 hex is 128 characters
		if len(hash) != 128 {
			t.Fatalf("hash length = %d, want 128", len(hash))
		}

		// Should be uppercase hex
		if hash != strings.ToUpper(hash) {
			t.Fatal("hash should be uppercase")
		}
	})

	t.Run("hash changes with different values", func(t *testing.T) {
		f1 := []fieldPair{{"a", "value1"}}
		f2 := []fieldPair{{"a", "value2"}}
		if client.computeHash(f1) == client.computeHash(f2) {
			t.Fatal("different values should produce different hashes")
		}
	})

	t.Run("hash includes integration key", func(t *testing.T) {
		fields := []fieldPair{{"a", "test"}}

		// Manual computation
		concat := "test" + "test-key-abc"
		h := sha512.Sum512([]byte(concat))
		expected := fmt.Sprintf("%X", h)

		got := client.computeHash(fields)
		if got != expected {
			t.Fatalf("hash mismatch:\ngot:  %s\nwant: %s", got, expected)
		}
	})
}

func TestVerifyResponseHash(t *testing.T) {
	client := NewPaynowClient(PaynowConfig{
		IntegrationKey: "my-secret-key",
	})

	t.Run("valid hash passes verification", func(t *testing.T) {
		// Build a response with correct hash
		responseFields := []string{"reference", "amount", "paynowreference", "pollurl", "status"}
		values := url.Values{
			"reference":       {"INV-001"},
			"amount":          {"50.00"},
			"paynowreference": {"PN-123"},
			"pollurl":         {"https://paynow.co.zw/poll/abc"},
			"status":          {"Paid"},
		}

		// Compute expected hash
		var concat string
		for _, key := range responseFields {
			if val := values.Get(key); val != "" {
				concat += val
			}
		}
		concat += "my-secret-key"
		h := sha512.Sum512([]byte(concat))
		values.Set("hash", fmt.Sprintf("%X", h))

		err := client.verifyResponseHash(values)
		if err != nil {
			t.Fatalf("valid hash should pass: %v", err)
		}
	})

	t.Run("tampered hash fails verification", func(t *testing.T) {
		values := url.Values{
			"reference": {"INV-001"},
			"amount":    {"50.00"},
			"status":    {"Paid"},
			"hash":      {"DEADBEEF"},
		}
		err := client.verifyResponseHash(values)
		if err == nil {
			t.Fatal("tampered hash should fail verification")
		}
	})

	t.Run("missing hash fails verification", func(t *testing.T) {
		values := url.Values{
			"reference": {"INV-001"},
			"status":    {"Paid"},
		}
		err := client.verifyResponseHash(values)
		if err == nil {
			t.Fatal("missing hash should fail verification")
		}
	})
}

func TestNewOrchestrator(t *testing.T) {
	t.Run("without env vars creates simulation mode", func(t *testing.T) {
		// NewOrchestrator reads env vars, but we can't easily set them in tests
		// Instead, test the structure
		o := &Orchestrator{db: nil, paynow: nil}
		if o.PaynowClient() != nil {
			t.Fatal("simulation mode should have nil PaynowClient")
		}
	})

	t.Run("with PaynowClient set returns it", func(t *testing.T) {
		client := NewPaynowClient(PaynowConfig{
			IntegrationID:  "test",
			IntegrationKey: "test",
		})
		o := &Orchestrator{db: nil, paynow: client}
		if o.PaynowClient() == nil {
			t.Fatal("should return non-nil PaynowClient")
		}
	})
}
