'use client';
import { useState, useEffect, useRef } from 'react';
import { aiAPI } from '@/lib/api';

const SUGGESTIONS = [
  "Create a 7-day study plan for JEE",
  "How do I improve my focus score?",
  "What's the best way to study Mathematics?",
  "Give me tips to maintain a study streak",
  "How many hours should I study daily?",
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${isUser ? 'bg-indigo-600' : 'bg-gradient-to-br from-indigo-600 to-purple-600'}`}>
        {isUser ? '👤' : '✦'}
      </div>
      <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser ? 'bg-indigo-600/20 border border-indigo-500/20 text-slate-200 rounded-tr-sm' : 'glass-card text-slate-300 rounded-tl-sm'}`}>
        {msg.content.split('\n').map((line, i) => {
          if (line.startsWith('• ') || line.startsWith('- ')) return <p key={i} className="flex gap-2 mt-1"><span className="text-indigo-400 flex-shrink-0">•</span><span>{line.slice(2)}</span></p>;
          if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-slate-100 mt-2">{line.slice(2,-2)}</p>;
          return line ? <p key={i} className={i > 0 ? 'mt-1.5' : ''}>{line}</p> : <br key={i} />;
        })}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [histLoading, setHistLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    aiAPI.getChatHistory().then(r => {
      if (r.data.data.length > 0) setMessages(r.data.data);
      else setMessages([{ role:'assistant', content:`Hey! 👋 I'm your StudyAI Coach. I can help you with study plans, strategies, subject tips, and motivation.\n\nWhat would you like to work on today?` }]);
    }).catch(() => {
      setMessages([{ role:'assistant', content:`Hey! 👋 I'm your StudyAI Coach. I can help you with study plans, strategies, subject tips, and motivation.\n\nWhat would you like to work on today?` }]);
    }).finally(() => setHistLoading(false));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    const userMsg = { role:'user', content: msg };
    const history = messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-8);
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const r = await aiAPI.chat({ message: msg, history });
      setMessages(prev => [...prev, { role:'assistant', content: r.data.data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role:'assistant', content:"Sorry, I'm having trouble connecting. Please try again!" }]);
    } finally { setLoading(false); inputRef.current?.focus(); }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="glass-card p-4 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
          <span className="text-lg">✦</span>
        </div>
        <div>
          <p className="font-bold text-white text-sm">StudyAI Coach</p>
          <div className="flex items-center gap-1.5"><div className="dot-pulse" /><span className="text-xs text-slate-500">Powered by AI · Always available</span></div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {histLoading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /></div>
        ) : (
          <>
            {messages.map((m, i) => <Message key={i} msg={m} />)}
            {loading && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-sm flex-shrink-0">✦</div>
                <div className="glass-card px-4 py-3 flex items-center gap-1">
                  {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay:`${i*0.15}s` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Suggestions (show if empty) */}
      {messages.length <= 1 && !loading && (
        <div className="mb-3">
          <p className="text-xs text-slate-600 mb-2">Quick suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/50 text-slate-300 px-3 py-1.5 rounded-lg transition-all duration-200">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="glass-card p-3 flex items-end gap-3">
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Ask your AI study coach anything..." rows={1}
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none max-h-24 leading-relaxed" />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          className="btn-gradient flex-shrink-0 px-4 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed">
          Send ↑
        </button>
      </div>
      <p className="text-xs text-slate-700 text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
    </div>
  );
}
