package models

import (
	"time"
)

type Profile struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Phone        string    `json:"phone"`
	PasswordHash string    `json:"-"`
	Verified     bool      `json:"verified"`
	Rating       float64   `json:"rating"`
	SalesCount   int       `json:"sales_count"`
	CreatedAt    time.Time `json:"created_at"`
}

type LivestockItem struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	Category      string    `json:"category"`
	Breed         string    `json:"breed"`
	Age           string    `json:"age"`
	Weight        string    `json:"weight"`
	Description   string    `json:"description"`
	Location      string    `json:"location"`
	Health        string    `json:"health"`
	StartingPrice float64   `json:"starting_price"`
	CurrentBid    float64   `json:"current_bid"`
	BidCount      int       `json:"bid_count"`
	ViewCount     int       `json:"view_count"`
	ImageURLs     []string  `json:"image_urls"`
	SellerID      string    `json:"seller_id"`
	Status        string    `json:"status"`
	DurationDays  int       `json:"duration_days"`
	EndTime       time.Time `json:"end_time"`
	CreatedAt     time.Time `json:"created_at"`
}

type Bid struct {
	ID          string    `json:"id"`
	LivestockID string    `json:"livestock_id"`
	UserID      string    `json:"user_id"`
	Amount      float64   `json:"amount"`
	IsWinner    bool      `json:"is_winner"`
	CreatedAt   time.Time `json:"created_at"`
}

type Payment struct {
	ID               string    `json:"id"`
	UserID           string    `json:"user_id"`
	LivestockID      string    `json:"livestock_id"`
	Reference        string    `json:"reference"`
	Amount           float64   `json:"amount"`
	Method           string    `json:"method"`
	Status           string    `json:"status"`
	PaynowReference  *string   `json:"paynow_reference"`
	Phone            *string   `json:"phone"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type Notification struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Type      string    `json:"type"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Read      bool      `json:"read"`
	Priority  string    `json:"priority"`
	CreatedAt time.Time `json:"created_at"`
}

type Agent struct {
	ID        string         `json:"id"`
	UserID    string         `json:"user_id"`
	AgentType string         `json:"agent_type"`
	Name      string         `json:"name"`
	Status    string         `json:"status"`
	Config    map[string]any `json:"config"`
	Stats     map[string]any `json:"stats"`
	LastRunAt *time.Time     `json:"last_run_at"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

type AgentGoal struct {
	ID                string   `json:"id"`
	AgentID           string   `json:"agent_id"`
	Category          string   `json:"category"`
	PreferredBreed    *string  `json:"preferred_breed"`
	PreferredLocation *string  `json:"preferred_location"`
	MinHealth         *string  `json:"min_health"`
	MaxPrice          *float64 `json:"max_price"`
	Quantity          int      `json:"quantity"`
	QuantityFulfilled int      `json:"quantity_fulfilled"`
	Status            string   `json:"status"`
	CreatedAt         time.Time `json:"created_at"`
}

type AgentDecision struct {
	ID          string         `json:"id"`
	AgentID     string         `json:"agent_id"`
	GoalID      *string        `json:"goal_id"`
	LivestockID *string        `json:"livestock_id"`
	Decision    string         `json:"decision"`
	Reasoning   string         `json:"reasoning"`
	Confidence  float64        `json:"confidence"`
	Metadata    map[string]any `json:"metadata"`
	CreatedAt   time.Time      `json:"created_at"`
}

type AgentBid struct {
	ID          string    `json:"id"`
	AgentID     string    `json:"agent_id"`
	GoalID      *string   `json:"goal_id"`
	LivestockID string    `json:"livestock_id"`
	BidID       *string   `json:"bid_id"`
	Amount      float64   `json:"amount"`
	Strategy    string    `json:"strategy"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type AgentActivityLog struct {
	ID        string         `json:"id"`
	AgentID   string         `json:"agent_id"`
	EventType string         `json:"event_type"`
	Message   string         `json:"message"`
	Metadata  map[string]any `json:"metadata"`
	CreatedAt time.Time      `json:"created_at"`
}

type AgentPaymentOrder struct {
	ID               string     `json:"id"`
	AgentID          string     `json:"agent_id"`
	AgentBidID       *string    `json:"agent_bid_id"`
	LivestockID      string     `json:"livestock_id"`
	UserID           string     `json:"user_id"`
	Amount           float64    `json:"amount"`
	Method           string     `json:"method"`
	Status           string     `json:"status"`
	AttemptCount     int        `json:"attempt_count"`
	MaxAttempts      int        `json:"max_attempts"`
	LastError        *string    `json:"last_error"`
	PaynowReference  *string    `json:"paynow_reference"`
	CreatedAt        time.Time  `json:"created_at"`
	PaidAt           *time.Time `json:"paid_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type SettlementLedger struct {
	ID             string         `json:"id"`
	PaymentOrderID string         `json:"payment_order_id"`
	Event          string         `json:"event"`
	Method         string         `json:"method"`
	AttemptNumber  int            `json:"attempt_number"`
	Details        map[string]any `json:"details"`
	CreatedAt      time.Time      `json:"created_at"`
}

type Favorite struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	LivestockID string    `json:"livestock_id"`
	CreatedAt   time.Time `json:"created_at"`
}

type Conversation struct {
	ID               string    `json:"id"`
	Participant1     string    `json:"participant_1"`
	Participant2     string    `json:"participant_2"`
	LivestockID      *string   `json:"livestock_id"`
	LastMessageAt    time.Time `json:"last_message_at"`
	CreatedAt        time.Time `json:"created_at"`
	OtherParticipant *Profile  `json:"other_participant,omitempty"`
	LivestockTitle   *string   `json:"livestock_title,omitempty"`
	LastMessage      string    `json:"last_message,omitempty"`
}

type Message struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversation_id"`
	SenderID       string    `json:"sender_id"`
	Content        string    `json:"content"`
	Read           bool      `json:"read"`
	CreatedAt      time.Time `json:"created_at"`
}
