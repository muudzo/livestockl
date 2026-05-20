import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ussd-handler`;
const SESSION_ID = () => `sim-${Date.now()}`;

interface ScreenEntry {
  type: 'sent' | 'received';
  text: string;
}

export default function UssdSimulator() {
  const [phone, setPhone] = useState('+263771111111');
  const [sessionId, setSessionId] = useState(SESSION_ID);
  const [inputText, setInputText] = useState('');
  const [history, setHistory] = useState<ScreenEntry[]>([]);
  const [currentMenu, setCurrentMenu] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullText, setFullText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  async function dial() {
    setHistory([]);
    setFullText('');
    setSessionEnded(false);
    setError(null);
    setCurrentMenu(null);
    const newId = SESSION_ID();
    setSessionId(newId);
    await send(newId, '');
  }

  async function submit() {
    if (!inputText.trim() || sessionEnded) return;
    const next = fullText ? `${fullText}*${inputText.trim()}` : inputText.trim();
    setHistory(h => [...h, { type: 'sent', text: inputText.trim() }]);
    setInputText('');
    setFullText(next);
    await send(sessionId, next);
  }

  async function send(sid: string, text: string) {
    setLoading(true);
    setError(null);
    try {
      const body = new URLSearchParams({
        sessionId: sid,
        serviceCode: '*151*ZL#',
        phoneNumber: phone,
        text,
      });
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const raw = await res.text();
      const isCon = raw.startsWith('CON ');
      const isEnd = raw.startsWith('END ');
      const display = isCon ? raw.slice(4) : isEnd ? raw.slice(4) : raw;
      setCurrentMenu(display);
      setHistory(h => [...h, { type: 'received', text: display }]);
      if (isEnd) setSessionEnded(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto p-4">
      <h1 className="text-lg font-bold mb-4">USSD Simulator</h1>

      {/* Config */}
      <div className="flex gap-2 mb-4">
        <Input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+263771111111"
          className="font-mono text-sm"
        />
        <Button onClick={dial} disabled={loading} variant="outline">
          Dial
        </Button>
      </div>

      {/* Phone screen */}
      {history.length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-4 mb-4 min-h-[220px] font-mono text-sm text-green-400 flex flex-col justify-between">
          <div className="space-y-3 overflow-y-auto max-h-52">
            {history.map((e, i) => (
              <div key={i} className={e.type === 'sent' ? 'text-white text-right' : 'text-green-400 whitespace-pre-wrap'}>
                {e.type === 'sent' ? `> ${e.text}` : e.text}
              </div>
            ))}
            {loading && <div className="text-slate-500 animate-pulse">…</div>}
            <div ref={scrollRef} />
          </div>

          {sessionEnded && (
            <p className="text-slate-500 text-xs text-center mt-2">Session ended</p>
          )}
        </div>
      )}

      {/* Input */}
      {currentMenu && !sessionEnded && (
        <div className="flex gap-2">
          <Input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Enter option..."
            className="font-mono"
            autoFocus
            disabled={loading}
          />
          <Button onClick={submit} disabled={loading || !inputText.trim()}>
            Send
          </Button>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-3">Error: {error}</p>
      )}

      {!history.length && (
        <p className="text-slate-400 text-sm text-center mt-8">
          Enter a phone number and click Dial to start a session.<br />
          Test numbers: 0771111111 (success), 0772222222 (delayed)
        </p>
      )}
    </div>
  );
}
