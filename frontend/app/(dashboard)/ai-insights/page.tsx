'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  Sparkles,
  Heart,
  ShoppingCart,
  Trash2,
  Send,
  Bot,
  User,
  AlertTriangle,
  AlertCircle,
  Coins,
  RefreshCw
} from 'lucide-react';

export default function AIInsightsPage() {
  const [activeTab, setActiveTab] = useState<'health' | 'reorder' | 'waste'>('health');
  
  // Chat state
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    { sender: 'bot', text: "Hello! I am your KitchenIQ Copilot. Ask me anything about your current inventory, stock levels, or batches expiring soon!" }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');

  // Fetch AI Insights
  const { data: insights, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: async () => {
      const res = await apiClient.get('/ai/insights');
      return res.data;
    }
  });

  // Copilot Mutation
  const copilotMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await apiClient.post('/ai/copilot', { question });
      return res.data.answer;
    },
    onSuccess: (answer) => {
      setMessages((prev) => [...prev, { sender: 'bot', text: answer }]);
    },
    onError: () => {
      setMessages((prev) => [...prev, { sender: 'bot', text: "Sorry, I had trouble analyzing your kitchen logs. Please try again." }]);
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuestion.trim() || copilotMutation.isPending) return;

    const question = inputQuestion.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: question }]);
    setInputQuestion('');
    
    copilotMutation.mutate(question);
  };

  const getHealthStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'CRITICAL':
        return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'WARNING':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    return priority?.toUpperCase() === 'HIGH' 
      ? 'text-rose-400 bg-rose-500/15 border-rose-500/25'
      : 'text-amber-400 bg-amber-500/15 border-amber-500/25';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-900 animate-pulse rounded-lg"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-[#0f1626] animate-pulse rounded-2xl border border-slate-900"></div>
          <div className="h-96 bg-[#0f1626] animate-pulse rounded-2xl border border-slate-900"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
        <h3 className="font-bold">Failed to load AI Intelligence data</h3>
        <p className="text-sm mt-1">Check database tables or verify your credentials.</p>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs cursor-pointer">
          Retry Analysis
        </button>
      </div>
    );
  }

  const { health_summary, reorder_suggestions, waste_analysis } = insights;

  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="text-indigo-400 animate-pulse" /> AI Intelligence Hub
          </h1>
          <p className="text-sm text-slate-400 mt-1">AI-driven reorder points, food wastage projection logs, and natural language copilot.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
          {isRefetching ? 'Re-analyzing...' : 'Refresh AI'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT / MAIN TABBED PANEL --- */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tab triggers */}
          <div className="flex p-1 bg-slate-950/40 border border-slate-900 rounded-2xl max-w-md">
            <button
              onClick={() => setActiveTab('health')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'health'
                  ? 'bg-slate-900 text-white border border-slate-800'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Heart size={14} /> Health Summary
            </button>
            <button
              onClick={() => setActiveTab('reorder')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'reorder'
                  ? 'bg-slate-900 text-white border border-slate-800'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <ShoppingCart size={14} /> Reorders
            </button>
            <button
              onClick={() => setActiveTab('waste')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'waste'
                  ? 'bg-slate-900 text-white border border-slate-800'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Trash2 size={14} /> Waste Analysis
            </button>
          </div>

          {/* --- TAB CONTENT: HEALTH SUMMARY --- */}
          {activeTab === 'health' && (
            <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl -z-10"></div>
              
              <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                <h3 className="text-base font-bold text-white">Inventory Health Summary</h3>
                <span className={`text-xs font-bold px-3 py-1 border rounded-full ${getHealthStatusColor(health_summary.status)}`}>
                  {health_summary.status} Status
                </span>
              </div>

              <div className="p-4 bg-slate-950/20 border border-slate-900/60 rounded-xl">
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  {health_summary.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Coins size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Waste Financial Risk</span>
                    <span className="text-base font-black text-white font-mono">${health_summary.waste_risk_value.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">AI Operational Recommendations</span>
                <div className="space-y-2">
                  {health_summary.recommendations.map((rec: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/20 border border-slate-900/60 rounded-xl text-xs">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-slate-300 font-medium leading-normal mt-0.5">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- TAB CONTENT: REORDER SUGGESTIONS --- */}
          {activeTab === 'reorder' && (
            <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">AI-Suggested Purchase Replenishments</h3>
                <p className="text-xs text-slate-400 mt-1">Intelligent calculations computed from category reorder points and current stock levels.</p>
              </div>

              {reorder_suggestions.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  Excellent! No products are currently below safety reorder points.
                </div>
              ) : (
                <div className="space-y-4">
                  {reorder_suggestions.map((suggestion: any, index: number) => (
                    <div
                      key={index}
                      className="bg-slate-950/20 border border-slate-900 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{suggestion.product_name}</h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-full ${getPriorityColor(suggestion.priority)}`}>
                            {suggestion.priority} Priority
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">{suggestion.reason}</p>
                      </div>

                      <div className="flex items-center gap-6 shrink-0 bg-slate-950 border border-slate-900 p-3 rounded-xl min-w-48 justify-between">
                        <div className="text-left">
                          <span className="text-[9px] font-bold text-slate-500 uppercase block">Suggest Buy</span>
                          <span className="text-sm font-bold text-white font-mono">
                            {suggestion.suggested_quantity} {suggestion.unit}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-slate-500 uppercase block">Est. Cost</span>
                          <span className="text-sm font-bold text-emerald-400 font-mono">
                            ${suggestion.estimated_cost.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- TAB CONTENT: WASTE ANALYSIS --- */}
          {activeTab === 'waste' && (
            <div className="bg-[#0f1626] border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Food Spoilage & Financial Loss Analysis</h3>
                <p className="text-xs text-slate-400 mt-1">Audit active batch logs to track expired items and products expiring within 30 days.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Expired Batch Valuation</span>
                    <span className="text-sm font-black text-rose-400 font-mono">${waste_analysis.expired_batches_value.toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Expiring within 30 Days</span>
                    <span className="text-sm font-black text-amber-400 font-mono">${waste_analysis.expiring_30_days_value.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Dead stock list */}
              {waste_analysis.dead_stock_recommendations.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Slow-Moving Overstock Warning</span>
                  <div className="space-y-2">
                    {waste_analysis.dead_stock_recommendations.map((item: any, i: number) => (
                      <div key={i} className="bg-slate-950/20 border border-slate-900 p-3 rounded-xl flex items-center justify-between gap-4 text-xs">
                        <div>
                          <span className="font-bold text-white block">{item.product_name}</span>
                          <span className="text-slate-400 mt-1 block">{item.reason}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 block uppercase font-bold text-[9px]">Sunk Cost</span>
                          <span className="font-bold text-slate-300 font-mono">${item.value.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* --- RIGHT / COPILOT CHAT PANEL --- */}
        <div className="bg-[#0f1626] border border-slate-900 rounded-2xl flex flex-col h-[560px] shadow-xl relative overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-900 bg-slate-950/20 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Bot size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">KitchenIQ Copilot</h3>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live Agent
              </p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 flex items-center justify-center ${
                  msg.sender === 'user' 
                    ? 'bg-slate-900 text-indigo-400' 
                    : 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400'
                }`}>
                  {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-950/70 border border-slate-900 text-slate-300 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {copilotMutation.isPending && (
              <div className="flex gap-2.5 max-w-[80%]">
                <div className="p-2 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                  <Bot size={14} />
                </div>
                <div className="p-3 bg-slate-950/70 border border-slate-900 rounded-2xl rounded-tl-none flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce delay-75"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce delay-150"></span>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-900 bg-slate-950/40 flex gap-2">
            <input
              type="text"
              required
              disabled={copilotMutation.isPending}
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              placeholder="Ask: 'What should I reorder?'"
            />
            <button
              type="submit"
              disabled={copilotMutation.isPending || !inputQuestion.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shrink-0 flex items-center justify-center"
            >
              <Send size={14} />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
