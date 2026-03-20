package auth

import (
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const testSecret = "test-secret-key-for-zimlivestock"

func TestGenerateToken(t *testing.T) {
	t.Run("returns a signed JWT", func(t *testing.T) {
		token, err := GenerateToken("user-123", "test@example.com", testSecret)
		if err != nil {
			t.Fatalf("GenerateToken() error: %v", err)
		}
		if token == "" {
			t.Fatal("GenerateToken() returned empty token")
		}
		// JWT has 3 parts separated by dots
		parts := strings.Split(token, ".")
		if len(parts) != 3 {
			t.Fatalf("expected 3 JWT parts, got %d", len(parts))
		}
	})

	t.Run("different users get different tokens", func(t *testing.T) {
		t1, _ := GenerateToken("user-1", "a@test.com", testSecret)
		t2, _ := GenerateToken("user-2", "b@test.com", testSecret)
		if t1 == t2 {
			t.Fatal("different users should get different tokens")
		}
	})
}

func TestValidateToken(t *testing.T) {
	t.Run("valid token returns correct claims", func(t *testing.T) {
		token, err := GenerateToken("user-456", "hello@zim.co", testSecret)
		if err != nil {
			t.Fatalf("GenerateToken() error: %v", err)
		}

		claims, err := ValidateToken(token, testSecret)
		if err != nil {
			t.Fatalf("ValidateToken() error: %v", err)
		}
		if claims.UserID != "user-456" {
			t.Errorf("UserID = %q, want %q", claims.UserID, "user-456")
		}
		if claims.Email != "hello@zim.co" {
			t.Errorf("Email = %q, want %q", claims.Email, "hello@zim.co")
		}
		if claims.Issuer != "zimlivestock" {
			t.Errorf("Issuer = %q, want %q", claims.Issuer, "zimlivestock")
		}
	})

	t.Run("rejects token signed with wrong secret", func(t *testing.T) {
		token, _ := GenerateToken("user-1", "a@test.com", "secret-A")
		_, err := ValidateToken(token, "secret-B")
		if err == nil {
			t.Fatal("expected error for wrong secret, got nil")
		}
	})

	t.Run("rejects tampered token", func(t *testing.T) {
		token, _ := GenerateToken("user-1", "a@test.com", testSecret)
		// Flip a character in the signature
		tampered := token[:len(token)-2] + "XX"
		_, err := ValidateToken(tampered, testSecret)
		if err == nil {
			t.Fatal("expected error for tampered token, got nil")
		}
	})

	t.Run("rejects expired token", func(t *testing.T) {
		// Manually create an expired token
		now := time.Now().Add(-48 * time.Hour) // 48 hours ago
		claims := Claims{
			UserID: "expired-user",
			Email:  "old@test.com",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)), // expired 24h ago
				IssuedAt:  jwt.NewNumericDate(now),
				NotBefore: jwt.NewNumericDate(now),
				Issuer:    "zimlivestock",
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		signed, _ := token.SignedString([]byte(testSecret))

		_, err := ValidateToken(signed, testSecret)
		if err == nil {
			t.Fatal("expected error for expired token, got nil")
		}
	})

	t.Run("rejects empty token", func(t *testing.T) {
		_, err := ValidateToken("", testSecret)
		if err == nil {
			t.Fatal("expected error for empty token, got nil")
		}
	})

	t.Run("rejects garbage string", func(t *testing.T) {
		_, err := ValidateToken("not.a.jwt", testSecret)
		if err == nil {
			t.Fatal("expected error for garbage token, got nil")
		}
	})
}

func TestHashPassword(t *testing.T) {
	t.Run("returns a hash different from input", func(t *testing.T) {
		hash, err := HashPassword("mypassword123")
		if err != nil {
			t.Fatalf("HashPassword() error: %v", err)
		}
		if hash == "mypassword123" {
			t.Fatal("hash should not equal plaintext")
		}
		if hash == "" {
			t.Fatal("hash should not be empty")
		}
	})

	t.Run("same password produces different hashes (salt)", func(t *testing.T) {
		h1, _ := HashPassword("samepassword")
		h2, _ := HashPassword("samepassword")
		if h1 == h2 {
			t.Fatal("bcrypt should produce different hashes due to random salt")
		}
	})
}

func TestCheckPassword(t *testing.T) {
	t.Run("correct password returns true", func(t *testing.T) {
		hash, _ := HashPassword("correcthorse")
		if !CheckPassword("correcthorse", hash) {
			t.Fatal("CheckPassword should return true for correct password")
		}
	})

	t.Run("wrong password returns false", func(t *testing.T) {
		hash, _ := HashPassword("correcthorse")
		if CheckPassword("wrongpassword", hash) {
			t.Fatal("CheckPassword should return false for wrong password")
		}
	})

	t.Run("empty password returns false against real hash", func(t *testing.T) {
		hash, _ := HashPassword("realpassword")
		if CheckPassword("", hash) {
			t.Fatal("CheckPassword should return false for empty password")
		}
	})
}
