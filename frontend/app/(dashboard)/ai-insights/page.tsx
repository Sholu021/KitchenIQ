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
  const { data: insights, isLoading, isError, error, refetch, isRefetching } = useQuery({
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
        return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'WARNING':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      default:
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    return priority?.toUpperCase() === 'HIGH' 
      ? 'text-rose-600 bg-rose-50 border-rose-200'
      : 'text-amber-600 bg-amber-50 border-amber-200';
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-sm font-medium text-slate-500">
          Loading AI Insights...
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-9 w-64 bg-slate-200 rounded-xl"></div>
          <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-white rounded-2xl border border-slate-200 shadow-sm"></div>
          <div className="h-96 bg-white rounded-2xl border border-slate-200 shadow-sm"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    const isProRequired = (error as { response?: { status?: number } })?.response?.status === 403;
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600">
        <h3 className="font-bold text-base">{isProRequired ? 'AI Insights is a Pro feature' : 'Failed to load AI Intelligence data'}</h3>
        <p className="text-sm mt-1">{isProRequired ? 'Upgrade to Pro in Settings to access AI-powered inventory intelligence.' : 'Please try again. If the problem persists, contact your administrator.'}</p>
        <button 
          onClick={() => refetch()} 
          className="mt-4 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs cursor-pointer transition-colors"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  const {
    health_summary = {
      status: "Loading",
      summary: "",
      recommendations: [],
      waste_risk_value: 0,
    },
    reorder_suggestions = [],
    waste_analysis = {
      expired_batches_value: 0,
      expiring_7_days_value: 0,
      expired_items_list: [],
      dead_stock_recommendations: [],
    },
  } = insights ?? {};

  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Sparkles className="text-emerald-500 shrink-0" /> AI Intelligence Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">AI-driven reorder points, food wastage projection logs, and natural language copilot.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="py-2.5 px-3.5 bg-white border border-slate-200/80 hover:border-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
        >
          <RefreshCw size={14} className={isRefetching ? 'animate-spin text-slate-400' : 'text-slate-400'} />
          {isRefetching ? 'Re-analyzing...' : 'Refresh AI'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT / MAIN TABBED PANEL --- */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tab triggers */}
          <div className="flex p-1.5 bg-slate-100 rounded-2xl max-w-md border border-slate-200/60 shadow-inner">
            <button
              onClick={() => setActiveTab('health')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'health'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Heart size={14} /> Health Summary
            </button>
            <button
              onClick={() => setActiveTab('reorder')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'reorder'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShoppingCart size={14} /> Reorders
            </button>
            <button
              onClick={() => setActiveTab('waste')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'waste'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Trash2 size={14} /> Waste Analysis
            </button>
          </div>

          {/* --- TAB CONTENT: HEALTH SUMMARY --- */}
          {activeTab === 'health' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900">Inventory Health Summary</h3>
                <span className={`text-xs font-bold px-3 py-1 border rounded-full ${getHealthStatusColor(health_summary.status)}`}>
                  {health_summary.status} Status
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
                <p className="text-sm text-slate-700 leading-relaxed font-semibold">
                  {health_summary.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-500 shrink-0">
                    <Coins size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Waste Financial Risk</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono">₹{Number(health_summary.waste_risk_value ?? 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">AI Operational Recommendations</span>
                <div className="space-y-2">
                  {health_summary.recommendations.map((rec: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3.5 bg-slate-50/50 border border-slate-200/60 rounded-xl text-xs font-semibold">
                      <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0 text-[10px]">
                        {i + 1}
                      </span>
                      <p className="text-slate-600 leading-relaxed mt-0.5">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- TAB CONTENT: REORDER SUGGESTIONS --- */}
          {activeTab === 'reorder' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">AI-Suggested Purchase Replenishments</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Intelligent calculations computed from category reorder points and current stock levels.</p>
              </div>

              {reorder_suggestions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-medium text-sm">
                  Excellent! No products are currently below safety reorder points.
                </div>
              ) : (
                <div className="space-y-4">
                  {reorder_suggestions.map((suggestion: any, index: number) => (
                    <div
                      key={index}
                      className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-semibold text-slate-700"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{suggestion.product_name}</h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-full ${getPriorityColor(suggestion.priority)}`}>
                            {suggestion.priority} Priority
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal font-medium">{suggestion.reason}</p>
                      </div>

                      <div className="flex items-center gap-6 shrink-0 bg-white border border-slate-200 p-3 rounded-xl min-w-48 justify-between shadow-sm">
                        <div className="text-left">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Suggest Buy</span>
                          <span className="text-sm font-bold text-slate-800 font-mono">
                            {suggestion.suggested_quantity} {suggestion.unit}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Est. Cost</span>
                          <span className="text-sm font-bold text-emerald-600 font-mono">
                            ₹{Number(suggestion.estimated_cost ?? 0).toFixed(2)}
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
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Food Spoilage & Financial Loss Analysis</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Audit active batch logs to track expired items and products expiring within 30 days.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-500">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Expired Batch Valuation</span>
                    <span className="text-sm font-extrabold text-rose-500 font-mono">₹{Number(waste_analysis.expired_batches_value ?? 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100 text-amber-500">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Expiring within 7 Days</span>
                    <span className="text-sm font-extrabold text-amber-600 font-mono">₹{Number(waste_analysis.expiring_7_days_value ?? 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Dead stock list */}
              {waste_analysis.dead_stock_recommendations.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Slow-Moving Overstock Warning</span>
                  <div className="space-y-2">
                    {waste_analysis.dead_stock_recommendations.map((item: any, i: number) => (
                      <div key={i} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between gap-4 text-xs font-semibold text-slate-700">
                        <div>
                          <span className="font-bold text-slate-900 block">{item.product_name}</span>
                          <span className="text-slate-400 mt-1 block font-medium">{item.reason}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Sunk Cost</span>
                          <span className="font-bold text-slate-800 font-mono">₹{Number(item.value ?? 0).toFixed(2)}</span>
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
        <div className="bg-white border border-slate-200/80 rounded-2xl flex flex-col h-[560px] shadow-sm relative overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-500 shrink-0 animate-pulse">
              <Bot size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">KitchenIQ Copilot</h3>
              <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live Agent
              </p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto font-semibold text-xs">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs shadow-sm border ${
                  msg.sender === 'user' 
                    ? 'bg-slate-100 border-slate-200 text-slate-600' 
                    : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                }`}>
                  {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`p-3 rounded-2xl leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-emerald-500 text-white rounded-tr-none'
                    : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {copilotMutation.isPending && (
              <div className="flex gap-2.5 max-w-[80%]">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 shrink-0 flex items-center justify-center shadow-sm">
                  <Bot size={14} />
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-75"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-150"></span>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-slate-50/50 flex gap-2">
            <input
              type="text"
              required
              disabled={copilotMutation.isPending}
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              placeholder="Ask: 'What should I reorder?'"
            />
            <button
              type="submit"
              disabled={copilotMutation.isPending || !inputQuestion.trim()}
              className="p-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shrink-0 flex items-center justify-center shadow-md shadow-emerald-500/10"
            >
              <Send size={14} />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
