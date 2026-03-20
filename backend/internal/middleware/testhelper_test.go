package middleware

import (
	"context"
	"testing"

	"github.com/zimlivestock/backend/internal/auth"
)

// TestGetUserFromContext_empty verifies nil is returned for empty context.
func TestGetUserFromContext_empty(t *testing.T) {
	claims, ok := GetUserFromContext(context.Background())
	if ok || claims != nil {
		t.Fatal("expected nil claims from empty context")
	}
}

// TestGetUserFromContext_withClaims verifies claims round-trip through context.
func TestGetUserFromContext_withClaims(t *testing.T) {
	claims := &auth.Claims{UserID: "user-abc", Email: "test@zim.co"}
	ctx := context.WithValue(context.Background(), claimsKey, claims)
	got, ok := GetUserFromContext(ctx)
	if !ok {
		t.Fatal("expected ok=true")
	}
	if got.UserID != "user-abc" {
		t.Errorf("UserID = %q, want %q", got.UserID, "user-abc")
	}
	if got.Email != "test@zim.co" {
		t.Errorf("Email = %q, want %q", got.Email, "test@zim.co")
	}
}
