import { Bot, ShoppingCart, TrendingUp, Target, Crosshair, Activity, Brain, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { AgentType } from '../../../hooks/useAgents';

export const AGENT_ICONS: Record<AgentType, typeof Bot> = {
  buyer: ShoppingCart,
  seller: TrendingUp,
  market_intel: Target,
  sniper: Crosshair,
};

export const AGENT_COLORS: Record<AgentType, string> = {
  buyer: 'bg-blue-500',
  seller: 'bg-green-500',
  market_intel: 'bg-purple-500',
  sniper: 'bg-red-500',
};

export const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  stopped: 'bg-gray-100 text-gray-700',
};

export const EVENT_ICONS: Record<string, typeof Activity> = {
  scan_started: Activity,
  scan_completed: CheckCircle2,
  listing_found: Target,
  listing_evaluated: Brain,
  bid_placed: Zap,
  bid_won: CheckCircle2,
  bid_lost: AlertTriangle,
  snipe_executed: Crosshair,
  snipe_missed: AlertTriangle,
  reprice_suggested: TrendingUp,
  market_report: Target,
  anomaly_detected: AlertTriangle,
  error: AlertTriangle,
};

export const ACTION_MAP: Record<AgentType, string> = {
  buyer: 'run_cycle',
  seller: 'analyze_listings',
  market_intel: 'generate_report',
  sniper: 'scan_ending_soon',
};
