package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/zimlivestock/backend/internal/agents"
	"github.com/zimlivestock/backend/internal/database"
	"github.com/zimlivestock/backend/internal/handlers"
	"github.com/zimlivestock/backend/internal/payments"
	"github.com/zimlivestock/backend/internal/realtime"
)

func main() {
	// Config from environment
	port := envOr("PORT", "8080")
	dbURL := envOr("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/zimlivestock?sslmode=disable")
	jwtSecret := envOr("JWT_SECRET", "zimlivestock-dev-secret-change-in-production")
	agentInterval := envOr("AGENT_INTERVAL", "15s")

	// Structured logging
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	// Database
	db, err := database.New(dbURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	slog.Info("connected to database")

	// Run migrations
	if err := database.RunMigrations(db); err != nil {
		slog.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}
	slog.Info("migrations complete")

	// Realtime hub
	hub := realtime.NewHub()
	go hub.Run()
	slog.Info("realtime hub started")

	// Payment orchestrator
	paymentOrchestrator := payments.NewOrchestrator(db)

	// Agent scheduler
	interval, err := time.ParseDuration(agentInterval)
	if err != nil {
		interval = 15 * time.Second
	}
	scheduler := agents.NewScheduler(db, paymentOrchestrator, interval)

	// Upload directory
	uploadDir := "./uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		slog.Error("failed to create upload directory", "error", err)
		os.Exit(1)
	}

	// Router (pass Paynow client for payment endpoints — may be nil in simulation mode)
	router := handlers.NewRouter(db, jwtSecret, paymentOrchestrator.PaynowClient(), uploadDir)

	// Add WebSocket route
	mux := http.NewServeMux()
	mux.Handle("/", router)
	mux.HandleFunc("GET /ws", hub.HandleWebSocket)

	// Server
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start agent scheduler
	scheduler.Start(ctx)
	slog.Info("agent scheduler started", "interval", interval)

	// Start server in goroutine
	go func() {
		slog.Info("server starting", "port", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down...")

	// Stop agent scheduler
	scheduler.Stop()

	// Stop realtime hub
	hub.Shutdown()

	// Shutdown HTTP server with 10s timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("server shutdown error", "error", err)
	}

	slog.Info("server stopped")
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
