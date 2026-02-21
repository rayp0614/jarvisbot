import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send, Bot, User, Sparkles, TrendingUp } from 'lucide-react';
import { apiFetch } from '../lib/api';

function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-blue-600' : 'bg-purple-600'
      }`}>
        {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
        isUser
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-900'
      }`}>
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
      </div>
    </div>
  );
}

function SuggestionChip({ text, onClick }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="px-3 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
    >
      {text}
    </button>
  );
}

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const { data: status } = useQuery({
    queryKey: ['sales-status'],
    queryFn: () => apiFetch('/api/sales/status'),
  });

  const chatMutation = useMutation({
    mutationFn: async (message) => {
      const response = await apiFetch('/api/chat/sales', {
        method: 'POST',
        body: JSON.stringify({ message, history: messages }),
      });
      return response;
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    },
    onError: (error) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${error.message}` }]);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    chatMutation.mutate(userMessage);
  };

  const handleSuggestion = (text) => {
    setInput(text);
  };

  const suggestions = [
    "Who are my top 3 sales reps?",
    "What's our total revenue?",
    "Which lead source performs best?",
    "How is Team A doing?",
    "Show me sales trends",
  ];

  if (!status?.enabled) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Sales Chat</h1>
          <p className="text-gray-500">Ask questions about your sales data</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="text-yellow-800 font-medium mb-2">Sales Integration Not Configured</h3>
          <p className="text-yellow-700 text-sm">
            Configure Google Sheets integration to enable sales analytics chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-purple-600" size={24} />
          <h1 className="text-2xl font-bold text-gray-900">Sales Chat</h1>
        </div>
        <p className="text-gray-500">Ask questions about your sales data in natural language</p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="text-purple-600" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sales Analytics Assistant</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                Ask me anything about your sales data. I can analyze trends, compare reps,
                break down sources, and more.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {suggestions.map((suggestion) => (
                  <SuggestionChip
                    key={suggestion}
                    text={suggestion}
                    onClick={handleSuggestion}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, idx) => (
                <ChatMessage key={idx} message={message} />
              ))}
              {chatMutation.isPending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your sales data..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={chatMutation.isPending}
            />
            <button
              type="submit"
              disabled={!input.trim() || chatMutation.isPending}
              className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Chat;
