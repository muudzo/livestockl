package realtime

// Broadcaster wraps the Hub and provides domain-specific broadcast methods.
// Use this from HTTP handlers to push events after DB mutations.
type Broadcaster struct {
	hub *Hub
}

// NewBroadcaster creates a new Broadcaster backed by the given Hub.
func NewBroadcaster(hub *Hub) *Broadcaster {
	return &Broadcaster{hub: hub}
}

// BroadcastBidPlaced notifies all subscribers of bids:{livestockId} channel.
func (b *Broadcaster) BroadcastBidPlaced(livestockID string, data any) {
	b.hub.Broadcast("bids:"+livestockID, map[string]any{
		"type":    "event",
		"channel": "bids:" + livestockID,
		"event":   "bid_placed",
		"data":    data,
	})
}

// BroadcastNotification notifies a user's notification channel.
func (b *Broadcaster) BroadcastNotification(userID string, data any) {
	b.hub.Broadcast("notifications:"+userID, map[string]any{
		"type":    "event",
		"channel": "notifications:" + userID,
		"event":   "new_notification",
		"data":    data,
	})
}

// BroadcastMessage notifies a conversation's message channel.
func (b *Broadcaster) BroadcastMessage(conversationID string, data any) {
	b.hub.Broadcast("messages:"+conversationID, map[string]any{
		"type":    "event",
		"channel": "messages:" + conversationID,
		"event":   "new_message",
		"data":    data,
	})
}

// BroadcastAgentActivity notifies an agent's activity channel.
func (b *Broadcaster) BroadcastAgentActivity(agentID string, data any) {
	b.hub.Broadcast("agents:"+agentID, map[string]any{
		"type":    "event",
		"channel": "agents:" + agentID,
		"event":   "agent_activity",
		"data":    data,
	})
}

// BroadcastAuctionUpdate notifies all subscribers watching a livestock item.
func (b *Broadcaster) BroadcastAuctionUpdate(livestockID string, event string, data any) {
	b.hub.Broadcast("livestock:"+livestockID, map[string]any{
		"type":    "event",
		"channel": "livestock:" + livestockID,
		"event":   event,
		"data":    data,
	})
}
