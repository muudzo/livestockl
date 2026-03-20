// Go Backend API Client for ZimLivestock
// Reads GO_API_URL from env (VITE_GO_API_URL) or defaults to http://localhost:8080

const GO_API_URL = import.meta.env.VITE_GO_API_URL || 'http://localhost:8080';

export const isGoBackendConfigured = Boolean(import.meta.env.VITE_GO_API_URL);

// ── Token Management ────────────────────────────────────────────────

let authToken: string | null = null;
export function setAuthToken(token: string | null) { authToken = token; }
export function getAuthToken() { return authToken; }

// ── Types ───────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  verified: boolean;
  rating: number;
  sales_count: number;
  created_at: string;
}

export interface LivestockItem {
  id: string;
  title: string;
  category: string;
  breed: string;
  age: string;
  weight: string;
  description: string;
  location: string;
  health: string;
  starting_price: number;
  current_bid: number;
  bid_count: number;
  view_count: number;
  image_urls: string[];
  seller_id: string;
  status: string;
  duration_days: number;
  end_time: string;
  created_at: string;
  seller?: Profile;
}

export interface Bid {
  id: string;
  livestock_id: string;
  user_id: string;
  amount: number;
  is_winner: boolean;
  created_at: string;
  profiles?: { first_name: string; last_name: string };
}

export interface Payment {
  id: string;
  user_id: string;
  livestock_id: string;
  reference: string;
  amount: number;
  method: string;
  status: string;
  paynow_reference: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  livestock_items?: { title: string };
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  priority: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  livestock_id: string | null;
  last_message_at: string;
  created_at: string;
  other_participant?: Profile;
  livestock_title?: string;
  last_message?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface Agent {
  id: string;
  user_id: string;
  agent_type: string;
  name: string;
  status: string;
  config: Record<string, any>;
  stats: { total_actions: number; total_spent: number; total_bids: number; wins: number };
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentGoal {
  id: string;
  agent_id: string;
  category: string;
  preferred_breed: string | null;
  preferred_location: string | null;
  min_health: string;
  max_price: number;
  quantity: number;
  quantity_fulfilled: number;
  status: string;
  created_at: string;
}

export interface AgentDecision {
  id: string;
  agent_id: string;
  goal_id: string | null;
  livestock_id: string | null;
  decision: string;
  reasoning: string;
  confidence: number | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AgentActivity {
  id: string;
  agent_id: string;
  event_type: string;
  message: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AgentPaymentOrder {
  id: string;
  agent_id: string;
  agent_bid_id: string | null;
  livestock_id: string;
  user_id: string;
  amount: number;
  method: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  last_error: string | null;
  paynow_reference: string | null;
  created_at: string;
  paid_at: string | null;
  updated_at: string;
  settlement_ledger?: any[];
}

export interface CreateListingInput {
  title: string;
  category: string;
  breed: string;
  age: string;
  weight: string;
  description: string;
  location: string;
  health: string;
  starting_price: number;
  duration_days: number;
  image_urls: string[];
}

export interface UpdateListingInput {
  title?: string;
  breed?: string;
  age?: string;
  weight?: string;
  description?: string;
  location?: string;
  health?: string;
  starting_price?: number;
  image_urls?: string[];
}

// ── Fetch Wrapper ───────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${GO_API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${GO_API_URL}${path}`, { method: 'POST', headers, body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Upload error: ${res.status}`);
  }
  return res.json();
}

// ── API Methods ─────────────────────────────────────────────────────

export const goApi = {
  auth: {
    signup: (data: { email: string; password: string; first_name: string; last_name: string; phone: string }) =>
      apiFetch<{ token: string; user: Profile }>('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      apiFetch<{ token: string; user: Profile }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => apiFetch<Profile>('/api/auth/me'),
  },

  livestock: {
    list: (category?: string, location?: string) => {
      const params = new URLSearchParams();
      if (category && category !== 'All') params.set('category', category);
      if (location) params.set('location', location);
      const qs = params.toString();
      return apiFetch<LivestockItem[]>(`/api/livestock${qs ? '?' + qs : ''}`);
    },
    get: (id: string) => apiFetch<LivestockItem>(`/api/livestock/${id}`),
    create: (data: CreateListingInput) =>
      apiFetch<LivestockItem>('/api/livestock', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateListingInput) =>
      apiFetch<LivestockItem>(`/api/livestock/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiFetch<{ message: string }>(`/api/livestock/${id}`, { method: 'DELETE' }),
    mine: () => apiFetch<LivestockItem[]>('/api/livestock/mine'),
    won: () => apiFetch<LivestockItem[]>('/api/livestock/won'),
    incrementView: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/livestock/${id}/view`, { method: 'POST' }),
  },

  bids: {
    list: (livestockId: string) => apiFetch<Bid[]>(`/api/bids/${livestockId}`),
    place: (data: { livestock_id: string; amount: number }) =>
      apiFetch<Bid>('/api/bids', { method: 'POST', body: JSON.stringify(data) }),
  },

  payments: {
    list: () => apiFetch<Payment[]>('/api/payments'),
    getByReference: (reference: string) => apiFetch<Payment>(`/api/payments/ref/${reference}`),
    initiateWeb: (data: { livestock_id: string; amount: number; method: string; phone?: string }) =>
      apiFetch<{ reference: string; redirect_url?: string }>('/api/payments/initiate-web', { method: 'POST', body: JSON.stringify(data) }),
    initiateMobile: (data: { livestock_id: string; amount: number; method: string; phone: string }) =>
      apiFetch<{ reference: string; instructions: string }>('/api/payments/initiate-mobile', { method: 'POST', body: JSON.stringify(data) }),
    poll: (reference: string) =>
      apiFetch<Payment>('/api/payments/poll', { method: 'POST', body: JSON.stringify({ reference }) }),
  },

  notifications: {
    list: () => apiFetch<Notification[]>('/api/notifications'),
    unreadCount: () => apiFetch<{ count: number }>('/api/notifications/unread-count'),
    markAllRead: () => apiFetch<{ success: boolean }>('/api/notifications/read-all', { method: 'PUT' }),
    delete: (id: string) => apiFetch<{ success: boolean }>(`/api/notifications/${id}`, { method: 'DELETE' }),
  },

  favorites: {
    list: () => apiFetch<string[]>('/api/favorites'),
    toggle: (livestockId: string) =>
      apiFetch<{ added: boolean }>(`/api/favorites/${livestockId}`, { method: 'POST' }),
  },

  conversations: {
    list: () => apiFetch<Conversation[]>('/api/conversations'),
    start: (data: { seller_id: string; livestock_id?: string }) =>
      apiFetch<Conversation>('/api/conversations', { method: 'POST', body: JSON.stringify(data) }),
  },

  messages: {
    list: (conversationId: string) => apiFetch<Message[]>(`/api/messages/${conversationId}`),
    send: (data: { conversation_id: string; content: string }) =>
      apiFetch<Message>('/api/messages', { method: 'POST', body: JSON.stringify(data) }),
  },

  agents: {
    list: () => apiFetch<Agent[]>('/api/agents'),
    create: (data: { agent_type: string; name: string; config?: Record<string, any> }) =>
      apiFetch<Agent>('/api/agents', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      apiFetch<Agent>(`/api/agents/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    addGoal: (id: string, goal: Omit<AgentGoal, 'id' | 'quantity_fulfilled' | 'status' | 'created_at'>) =>
      apiFetch<AgentGoal>(`/api/agents/${id}/goals`, { method: 'POST', body: JSON.stringify(goal) }),
    getGoals: (id: string) => apiFetch<AgentGoal[]>(`/api/agents/${id}/goals`),
    getActivity: (id: string) => apiFetch<AgentActivity[]>(`/api/agents/${id}/activity`),
    getDecisions: (id: string) => apiFetch<AgentDecision[]>(`/api/agents/${id}/decisions`),
    getPayments: (id: string) => apiFetch<AgentPaymentOrder[]>(`/api/agents/${id}/payments`),
    run: (id: string, action: string) =>
      apiFetch<any>(`/api/agents/${id}/run`, { method: 'POST', body: JSON.stringify({ action }) }),
    marketIntel: () => apiFetch<any[]>('/api/market-intel'),
  },

  upload: {
    image: (file: File, userId: string) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', userId);
      return apiUpload<{ url: string }>('/api/upload', formData);
    },
  },
};
