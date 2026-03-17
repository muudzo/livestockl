import { useState } from 'react';
import { useAgents, useCreateAgent, useAddGoal, useUpdateAgentStatus, type AgentType } from '../../hooks/useAgents';
import { useNavigate } from 'react-router';
import { Bot, ShoppingCart, TrendingUp, Target, Crosshair, Plus, ArrowRight } from 'lucide-react';

const AGENT_TYPES: { type: AgentType; name: string; description: string; icon: typeof Bot; color: string }[] = [
  { type: 'buyer', name: 'Buyer Agent', description: 'Scans listings, evaluates against your criteria, and places bids automatically', icon: ShoppingCart, color: 'bg-blue-500' },
  { type: 'seller', name: 'Seller Agent', description: 'Monitors your listings, suggests repricing, and alerts on market changes', icon: TrendingUp, color: 'bg-green-500' },
  { type: 'market_intel', name: 'Market Intel', description: 'Tracks price trends, detects anomalies, and generates market reports', icon: Target, color: 'bg-purple-500' },
  { type: 'sniper', name: 'Auction Sniper', description: 'Places last-second bids on auctions ending within your budget', icon: Crosshair, color: 'bg-red-500' },
];

const CATEGORIES = ['Cattle', 'Goats', 'Sheep', 'Pigs', 'Chickens', 'Other'] as const;
const LOCATIONS = ['Harare', 'Bulawayo', 'Mutare', 'Masvingo', 'Gweru', 'Chinhoyi', 'Kadoma', 'Kwekwe'] as const;
const HEALTH_LEVELS = ['Fair', 'Good', 'Excellent'] as const;

export function AgentSetup() {
  const navigate = useNavigate();
  const { data: agents, isLoading } = useAgents();
  const createAgent = useCreateAgent();
  const addGoal = useAddGoal();
  const updateStatus = useUpdateAgentStatus();

  const [step, setStep] = useState<'select' | 'configure' | 'goal'>('select');
  const [selectedType, setSelectedType] = useState<AgentType | null>(null);
  const [agentName, setAgentName] = useState('');
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);

  // Goal form
  const [category, setCategory] = useState<string>('Cattle');
  const [breed, setBreed] = useState('');
  const [location, setLocation] = useState<string>('');
  const [minHealth, setMinHealth] = useState<string>('Fair');
  const [maxPrice, setMaxPrice] = useState('');
  const [quantity, setQuantity] = useState('1');

  const handleCreateAgent = async () => {
    if (!selectedType || !agentName.trim()) return;
    try {
      const agent = await createAgent.mutateAsync({
        agentType: selectedType,
        name: agentName.trim(),
      });
      setCreatedAgentId(agent.id);
      if (selectedType === 'buyer' || selectedType === 'sniper') {
        setStep('goal');
      } else {
        navigate('/agents');
      }
    } catch (err) {
      console.error('Failed to create agent:', err);
    }
  };

  const handleAddGoal = async () => {
    if (!createdAgentId || !maxPrice) return;
    try {
      await addGoal.mutateAsync({
        agent_id: createdAgentId,
        category,
        preferred_breed: breed || null,
        preferred_location: location || null,
        min_health: minHealth,
        max_price: parseFloat(maxPrice),
        quantity: parseInt(quantity) || 1,
      });
      // Activate the agent
      await updateStatus.mutateAsync({ agentId: createdAgentId, status: 'active' });
      navigate('/agents');
    } catch (err) {
      console.error('Failed to add goal:', err);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Bot className="w-8 h-8 animate-pulse" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Create Agent</h1>
          <p className="text-muted-foreground text-sm">Set up an autonomous agent to work the marketplace for you</p>
        </div>
      </div>

      {/* Step 1: Select type */}
      {step === 'select' && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Choose agent type</h2>
          <div className="grid gap-3">
            {AGENT_TYPES.map(({ type, name, description, icon: Icon, color }) => {
              const existing = agents?.find(a => a.agent_type === type);
              return (
                <button
                  key={type}
                  onClick={() => {
                    if (existing) {
                      navigate('/agents');
                    } else {
                      setSelectedType(type);
                      setAgentName(name);
                      setStep('configure');
                    }
                  }}
                  className={`flex items-start gap-4 p-4 rounded-lg border text-left transition-all ${
                    existing ? 'border-green-200 bg-green-50' : 'border-border hover:border-primary hover:shadow-md'
                  }`}
                >
                  <div className={`${color} p-2 rounded-lg text-white`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{name}</div>
                    <div className="text-sm text-muted-foreground">{description}</div>
                    {existing && (
                      <div className="text-xs text-green-600 mt-1 font-medium">
                        Already created — {existing.status}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 mt-1 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 'configure' && selectedType && (
        <div className="space-y-4">
          <button onClick={() => setStep('select')} className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Back
          </button>
          <h2 className="font-semibold text-lg">Name your agent</h2>
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="e.g., Harare Cattle Buyer"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
          />
          <button
            onClick={handleCreateAgent}
            disabled={!agentName.trim() || createAgent.isPending}
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {createAgent.isPending ? 'Creating...' : (selectedType === 'buyer' || selectedType === 'sniper') ? 'Next: Set Goal' : 'Create Agent'}
          </button>
        </div>
      )}

      {/* Step 3: Goal (for buyer/sniper) */}
      {step === 'goal' && createdAgentId && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Define buying goal</h2>
          <p className="text-sm text-muted-foreground">Tell the agent what to look for</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Max Price (US$)</label>
              <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="600" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Preferred Breed</label>
              <input type="text" value={breed} onChange={(e) => setBreed(e.target.value)}
                placeholder="Any" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Location</label>
              <select value={location} onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg">
                <option value="">Any location</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Min Health</label>
              <select value={minHealth} onChange={(e) => setMinHealth(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg">
                {HEALTH_LEVELS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Quantity</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                min="1" className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>

          <button
            onClick={handleAddGoal}
            disabled={!maxPrice || addGoal.isPending}
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {addGoal.isPending ? 'Setting up...' : 'Activate Agent'}
          </button>
        </div>
      )}
    </div>
  );
}
