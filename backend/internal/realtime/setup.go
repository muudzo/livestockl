package realtime

import (
	"net/http"
)

// Setup bundles all realtime components needed by the application.
type Setup struct {
	Hub         *Hub
	Broadcaster *Broadcaster
	WSHandler   http.HandlerFunc
}

// NewSetup creates, starts, and returns all realtime components.
// The Hub's Run loop is started in a background goroutine.
func NewSetup() *Setup {
	hub := NewHub()
	go hub.Run()

	return &Setup{
		Hub:         hub,
		Broadcaster: NewBroadcaster(hub),
		WSHandler:   hub.HandleWebSocket,
	}
}
