package realtime

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/zimlivestock/backend/internal/auth"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 54 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer (512 bytes for incoming).
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// In production, restrict this to your domain(s).
		return true
	},
}

// Message represents a real-time event pushed to subscribed clients.
type Message struct {
	Channel string `json:"channel"`
	Event   string `json:"event"`
	Payload any    `json:"payload"`
}

// clientAction is a subscription/unsubscription request read from the client.
type clientAction struct {
	Action  string `json:"action"`
	Channel string `json:"channel"`
}

// Client is a middleman between the WebSocket connection and the Hub.
type Client struct {
	hub           *Hub
	conn          *websocket.Conn
	send          chan []byte
	userID        string
	subscriptions []string
	mu            sync.Mutex // protects subscriptions
}

// Hub maintains the set of active clients and broadcasts messages to them.
type Hub struct {
	clients    map[*Client]bool
	channels   map[string]map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan *Message
	stop       chan struct{}
	mu         sync.RWMutex // protects clients and channels maps
}

// NewHub creates and returns a new Hub.
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		channels:   make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *Message, 256),
		stop:       make(chan struct{}),
	}
}

// Shutdown gracefully stops the hub's Run loop.
func (h *Hub) Shutdown() {
	close(h.stop)
}

// Run processes register, unregister, and broadcast operations. Intended to be
// launched as a goroutine: go hub.Run()
func (h *Hub) Run() {
	for {
		select {
		case <-h.stop:
			// Graceful shutdown: close all client connections
			h.mu.Lock()
			for client := range h.clients {
				close(client.send)
			}
			h.clients = make(map[*Client]bool)
			h.channels = make(map[string]map[*Client]bool)
			h.mu.Unlock()
			return

		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				// Remove from all channel subscriptions.
				client.mu.Lock()
				for _, ch := range client.subscriptions {
					if subs, exists := h.channels[ch]; exists {
						delete(subs, client)
						if len(subs) == 0 {
							delete(h.channels, ch)
						}
					}
				}
				client.subscriptions = nil
				client.mu.Unlock()

				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()

		case msg := <-h.broadcast:
			data, err := json.Marshal(msg)
			if err != nil {
				log.Printf("realtime: failed to marshal broadcast message: %v", err)
				continue
			}

			h.mu.RLock()
			subs, exists := h.channels[msg.Channel]
			if !exists {
				h.mu.RUnlock()
				continue
			}
			// Copy subscriber set so we can release the read-lock quickly.
			targets := make([]*Client, 0, len(subs))
			for c := range subs {
				targets = append(targets, c)
			}
			h.mu.RUnlock()

			for _, c := range targets {
				select {
				case c.send <- data:
				default:
					// Send buffer full — drop the client.
					h.unregister <- c
				}
			}
		}
	}
}

// subscribe adds a client to a channel.
func (h *Hub) subscribe(client *Client, channel string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.channels[channel] == nil {
		h.channels[channel] = make(map[*Client]bool)
	}
	h.channels[channel][client] = true

	client.mu.Lock()
	client.subscriptions = append(client.subscriptions, channel)
	client.mu.Unlock()
}

// unsubscribe removes a client from a channel.
func (h *Hub) unsubscribe(client *Client, channel string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if subs, exists := h.channels[channel]; exists {
		delete(subs, client)
		if len(subs) == 0 {
			delete(h.channels, channel)
		}
	}

	client.mu.Lock()
	for i, ch := range client.subscriptions {
		if ch == channel {
			client.subscriptions = append(client.subscriptions[:i], client.subscriptions[i+1:]...)
			break
		}
	}
	client.mu.Unlock()
}

// Publish sends a message to every client subscribed to the given channel.
// Call this from your HTTP handlers after DB mutations, e.g.:
//
//	hub.Publish("bids:"+livestockID, "INSERT", bidPayload)
func (h *Hub) Publish(channel, event string, payload any) {
	h.broadcast <- &Message{
		Channel: channel,
		Event:   event,
		Payload: payload,
	}
}

// PublishToUser sends a message to every WebSocket connection belonging to a
// specific user. Useful for personal notifications.
func (h *Hub) PublishToUser(userID, event string, payload any) {
	data, err := json.Marshal(&Message{
		Channel: "notifications:" + userID,
		Event:   event,
		Payload: payload,
	})
	if err != nil {
		log.Printf("realtime: failed to marshal user message: %v", err)
		return
	}

	h.mu.RLock()
	targets := make([]*Client, 0)
	for c := range h.clients {
		if c.userID == userID {
			targets = append(targets, c)
		}
	}
	h.mu.RUnlock()

	for _, c := range targets {
		select {
		case c.send <- data:
		default:
			h.unregister <- c
		}
	}
}

// HandleWebSocket upgrades an HTTP request to a WebSocket connection.
// It extracts the user identity from a "token" query parameter (JWT) or falls
// back to a plain "user_id" query parameter for unauthenticated preview.
func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	userID := ""

	// Authenticate via JWT token in query param
	if tokenStr := r.URL.Query().Get("token"); tokenStr != "" {
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "zimlivestock-dev-secret-change-in-production"
		}
		claims, err := auth.ValidateToken(tokenStr, secret)
		if err != nil {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}
		userID = claims.UserID
	}
	// No user_id fallback — removed to prevent impersonation (security fix)

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("realtime: upgrade failed: %v", err)
		return
	}

	client := &Client{
		hub:    h,
		conn:   conn,
		send:   make(chan []byte, 256),
		userID: userID,
	}
	h.register <- client

	// Start read and write pumps in separate goroutines.
	go client.writePump()
	go client.readPump()
}

// readPump reads messages from the WebSocket connection. It handles subscribe
// and unsubscribe actions and enforces read deadlines for keepalive.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("realtime: read error: %v", err)
			}
			break
		}

		var action clientAction
		if err := json.Unmarshal(message, &action); err != nil {
			log.Printf("realtime: invalid client message: %v", err)
			continue
		}

		switch action.Action {
		case "subscribe":
			if action.Channel != "" {
				c.hub.subscribe(c, action.Channel)
			}
		case "unsubscribe":
			if action.Channel != "" {
				c.hub.unsubscribe(c, action.Channel)
			}
		default:
			log.Printf("realtime: unknown action %q from client %s", action.Action, c.userID)
		}
	}
}

// writePump pumps messages from the send channel to the WebSocket connection.
// It also sends periodic pings to detect dead connections.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel — send a close frame.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			// Send each message as its own WebSocket frame (valid JSON per frame)
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

			// Drain any queued messages — each as a separate frame
			n := len(c.send)
			for i := 0; i < n; i++ {
				if err := c.conn.WriteMessage(websocket.TextMessage, <-c.send); err != nil {
					return
				}
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
