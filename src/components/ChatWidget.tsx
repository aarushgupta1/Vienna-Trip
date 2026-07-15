'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setError(null);
    setInput('');
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setIsStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });
      if (!res.ok || !res.body) {
        throw new Error(await res.text());
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: assistantText };
          return next;
        });
      }
    } catch {
      setError("Couldn't reach the trip assistant — try again in a moment.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[70] print:hidden">
      {open ? (
        <div className="w-80 sm:w-96 h-[28rem] max-h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white shrink-0">
            <span className="font-semibold text-sm">Vienna Trip Assistant</span>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-8 px-4">
                Ask me anything about the trip — &quot;What&apos;s on day 3?&quot; or &quot;Any free time for shopping?&quot;
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={['flex', m.role === 'user' ? 'justify-end' : 'justify-start'].join(' ')}>
                <div
                  className={[
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100',
                  ].join(' ')}
                >
                  {m.content || (isStreaming && i === messages.length - 1 ? '…' : '')}
                </div>
              </div>
            ))}
            {error && <p className="text-xs text-red-500 dark:text-red-400 text-center">{error}</p>}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 p-2 shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about the trip..."
              className="flex-1 min-w-0 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
            />
            <button
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
              className="shrink-0 p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl transition-colors"
          title="Ask the trip assistant"
        >
          <MessageCircle size={22} />
        </button>
      )}
    </div>
  );
}
