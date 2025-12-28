import React, { useState, useRef, useEffect } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import { useApp } from '../context/AppContext';
import { chatWithAgent, transcribeAudio } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Send, Mic, Bot, User, Globe, Map, StopCircle, Loader2, Sparkles, ExternalLink, Settings, ChevronDown, ChevronUp, X, MessageSquare, Maximize2, Minimize2, Check, ArrowRight, AlertTriangle, TrendingDown, DollarSign, Activity, BarChart3 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

// --- Dead Stock Logic & Types ---

interface DeadStockItem {
    id: string;
    name: string;
    sku: string;
    value: number;
    lastSaleDate: string | null;
    daysDormant: number;
    riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    turnoverRatio: number;
    holdingCost: number;
    recommendation: string;
}

const performDeadStockAnalysis = (products: any[], sales: any[]): { items: DeadStockItem[], totalValue: number, potentialRecovery: number } => {
    const now = new Date();
    const analyzeItems: DeadStockItem[] = [];
    let totalValue = 0;

    products.forEach(p => {
        // 1. Calculate Days Dormant
        let lastSale = p.lastSaleDate ? new Date(p.lastSaleDate) : null;

        // Fallback: Check sales history if lastSaleDate not on product
        if (!lastSale) {
            const productSales = sales
                .filter(s => s.items.some((i: any) => i.id === p.id))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            if (productSales.length > 0) {
                lastSale = new Date(productSales[0].date);
            }
        }

        const daysDormant = lastSale
            ? Math.floor((now.getTime() - lastSale.getTime()) / (1000 * 3600 * 24))
            : 365; // Default to 365 if never sold (effectively dead)

        // 2. Turnover & Financials
        const totalStock = Object.values(p.stock).reduce((a: number, b: number) => a + b, 0);
        const stockValue = totalStock * Number(p.cost);

        if (totalStock === 0) return; // Skip out of stock items

        // Estimate Annualized Sales Cost (COGS) based on recent sales (simple proxy)
        // For accurate turnover, we need historical COGS. Here we estimate risk based on dormancy primarily as per prompt focus.

        // 3. Risk Classification
        let riskLevel: DeadStockItem['riskLevel'] = 'LOW';
        let recommendation = 'Keep';

        if (daysDormant > 365) {
            riskLevel = 'CRITICAL';
            recommendation = 'Liquidation / Write-off';
        } else if (daysDormant > 180) {
            riskLevel = 'HIGH';
            recommendation = 'Clearance Sale (50% Off)';
        } else if (daysDormant > 90) {
            riskLevel = 'MEDIUM';
            recommendation = 'Bundle / Promotion';
        }

        // 4. Holding Cost (Est. 20% of value annually)
        const holdingCost = stockValue * 0.20 * (daysDormant / 365);

        if (riskLevel !== 'LOW') {
            analyzeItems.push({
                id: p.id,
                name: p.name,
                sku: p.sku || 'N/A',
                value: stockValue,
                lastSaleDate: lastSale ? lastSale.toISOString().split('T')[0] : 'Never',
                daysDormant,
                riskLevel,
                turnoverRatio: 0, // Placeholder
                holdingCost,
                recommendation
            });
            totalValue += stockValue;
        }
    });

    return {
        items: analyzeItems.sort((a, b) => b.daysDormant - a.daysDormant),
        totalValue,
        potentialRecovery: totalValue * 0.4 // Est 40% recovery on dead stock
    };
};

const DeadStockReport: React.FC<{ data: ReturnType<typeof performDeadStockAnalysis> }> = ({ data }) => {
    return (
        <div className="space-y-4 font-sans">
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <div className="text-xs text-red-600 font-bold uppercase flex items-center gap-1">
                        <AlertTriangle size={12} /> At Risk Value
                    </div>
                    <div className="text-lg font-bold text-red-700">₹{data.totalValue.toLocaleString()}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <div className="text-xs text-green-600 font-bold uppercase flex items-center gap-1">
                        <DollarSign size={12} /> Potential Recovery
                    </div>
                    <div className="text-lg font-bold text-green-700">₹{data.potentialRecovery.toLocaleString()}</div>
                </div>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 font-bold text-slate-500 sticky top-0">
                        <tr>
                            <th className="p-2">Product</th>
                            <th className="p-2 text-right">Dormant</th>
                            <th className="p-2 text-right">Value</th>
                            <th className="p-2">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.items.slice(0, 10).map(item => (
                            <tr key={item.id}>
                                <td className="p-2">
                                    <div className="font-medium text-slate-800 truncate max-w-[120px]" title={item.name}>{item.name}</div>
                                    <div className={`text-[10px] font-bold ${item.riskLevel === 'CRITICAL' ? 'text-red-600' :
                                        item.riskLevel === 'HIGH' ? 'text-orange-600' : 'text-amber-600'
                                        }`}>{item.riskLevel}</div>
                                </td>
                                <td className="p-2 text-right text-slate-600">{item.daysDormant} d</td>
                                <td className="p-2 text-right text-slate-600">₹{item.value.toLocaleString()}</td>
                                <td className="p-2 text-slate-500">{item.recommendation}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {data.items.length > 10 && <div className="text-center text-xs text-slate-400 italic">...and {data.items.length - 10} more items</div>}
        </div>
    );
};

export const AIAgent: React.FC = () => {
    const { products, sales, locations, salesTargets, customers } = useApp();
    const location = useLocation();

    // Floating State
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const [messages, setMessages] = useState<(ChatMessage & { component?: React.ReactNode })[]>([
        {
            id: '1',
            role: 'model',
            text: 'Hello! I am your smart inventory assistant. How can I help you today?',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    // Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [useSearch, setUseSearch] = useState(true);
    const [useMaps, setUseMaps] = useState(false);
    const [selectedModel, setSelectedModel] = useState<'gemini-2.5-flash' | 'gemini-3-pro-preview'>('gemini-2.5-flash');
    const [selectedTone, setSelectedTone] = useState<'Professional' | 'Casual' | 'Concise' | 'Detailed'>('Professional');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Settings Auto-Close
    const settingsRef = useRef<HTMLDivElement>(null);
    useClickOutside(settingsRef, () => setShowSettings(false));

    useEffect(() => {
        if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const runDeadStockAnalysis = () => {
        setIsLoading(true);
        setTimeout(() => {
            const analysis = performDeadStockAnalysis(products, sales);
            const reportMsg: ChatMessage & { component?: React.ReactNode } = {
                id: Date.now().toString(),
                role: 'model',
                text: `I've analyzed your inventory. I found **${analysis.items.length} items** that are potentially dead stock, tying up **₹${analysis.totalValue.toLocaleString()}** in capital. Here is the detailed breakdown:`,
                timestamp: new Date(),
                component: <DeadStockReport data={analysis} />
            };
            setMessages(prev => [...prev, reportMsg]);
            setIsLoading(false);
        }, 1500); // Simulate thinking
    };

    const handleSend = async (overrideInput?: string) => {
        const textToSend = overrideInput || input;
        if (!textToSend.trim()) return;

        if (textToSend.toLowerCase().includes('dead stock') || textToSend.toLowerCase().includes('analysis')) {
            const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: textToSend, timestamp: new Date() };
            setMessages(prev => [...prev, userMsg]);
            setInput('');
            runDeadStockAnalysis();
            return;
        }

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: textToSend,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Context Building
        const totalGST = sales.reduce((acc, s) => acc + s.totalTax, 0);
        const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
        const lowStockItems = products.filter(p => Object.values(p.stock).reduce((a: number, b: number) => a + b, 0) <= p.minStockLevel).map(p => p.name);

        const context = `
      User Page: ${location.pathname}
      Total Revenue: ₹${totalRevenue}, Total Products: ${products.length}, Low Stock: ${lowStockItems.length} items.
      GST Liability: ₹${totalGST}.
      Active Locations: ${locations.map(l => l.name).join(', ')}.
    `;

        try {
            const response = await chatWithAgent(textToSend, context, useSearch, useMaps, selectedModel, selectedTone);
            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response.text,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (e) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I'm having trouble connecting right now.", timestamp: new Date() }]);
        } finally {
            setIsLoading(false);
        }
    };

    // ... Placeholders for audio features ...
    const startRecording = async () => { };
    const stopRecording = () => { };

    // Improved Markdown Parser
    const renderMessageContent = (text: string) => {
        const lines = text.split('\n');
        return (
            <div className="space-y-1.5 text-sm leading-relaxed">
                {lines.map((line, idx) => {
                    let content = line.trim();
                    if (!content) return <div key={idx} className="h-1"></div>;

                    if (content.startsWith('##')) {
                        return (
                            <h4 key={idx} className="font-bold text-indigo-900 mt-3 mb-1 flex items-center">
                                <Sparkles size={14} className="mr-1.5 text-indigo-500 fill-indigo-100" />
                                {content.replace(/^##\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1')}
                            </h4>
                        );
                    }

                    if (content.startsWith('- ') || content.startsWith('* ')) {
                        const cleanLine = content.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        return (
                            <div key={idx} className="flex items-start ml-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 mr-2 flex-shrink-0"></div>
                                <span dangerouslySetInnerHTML={{ __html: cleanLine }} className="text-slate-700" />
                            </div>
                        );
                    }

                    const htmlContent = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
                    return <p key={idx} dangerouslySetInnerHTML={{ __html: htmlContent }} className="text-slate-600" />;
                })}
            </div>
        );
    };

    return (
        <>
            {/* Floating Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl z-50 transition-all hover:scale-110 animate-in zoom-in"
                >
                    <MessageSquare size={28} />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                    </span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col transition-all duration-300 animate-in slide-in-from-bottom-10 ${isExpanded ? 'w-[90vw] h-[80vh] md:w-[600px]' : 'w-[90vw] h-[500px] md:w-[380px]'}`}>

                    {/* Header */}
                    <div className="bg-indigo-600 p-4 rounded-t-2xl flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-lg"><Bot size={20} className="text-white" /></div>
                            <div>
                                <h3 className="font-bold text-sm">AI Assistant</h3>
                                <p className="text-[10px] text-indigo-200 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Online</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-white/10 rounded">{isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
                            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded"><X size={18} /></button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm text-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                                    }`}>
                                    {msg.role === 'user' ? msg.text : renderMessageContent(msg.text)}
                                </div>
                                {msg.component && (
                                    <div className="mt-2 w-full max-w-[95%] animate-in fade-in slide-in-from-top-2">
                                        {msg.component}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin text-indigo-600" />
                                    <span className="text-xs text-slate-500">Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-slate-100 rounded-b-2xl">
                        <div className="flex gap-2 overflow-x-auto pb-2 mb-1 scrollbar-hide">
                            <button onClick={() => handleSend("Analyze dead stock")} className="whitespace-nowrap px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs rounded-full border border-indigo-200 flex items-center gap-1 transition-colors">
                                <BarChart3 size={12} /> Analyze Stock
                            </button>
                            <button onClick={() => handleSend("Identify low stock items")} className="whitespace-nowrap px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs rounded-full border border-indigo-200 flex items-center gap-1 transition-colors">
                                <AlertTriangle size={12} /> Low Stock Check
                            </button>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 py-2">
                            <input
                                className="flex-1 bg-transparent outline-none text-sm"
                                placeholder="Type a message..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                disabled={isLoading}
                            />
                            <button onClick={() => handleSend()} disabled={!input.trim() || isLoading} className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50">
                                <Send size={18} />
                            </button>
                        </div>
                        <div className="flex justify-between items-center mt-2 px-2">
                            <button onClick={() => setShowSettings(!showSettings)} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                <Settings size={12} /> {selectedModel === 'gemini-2.5-flash' ? 'Fast' : 'Pro'}
                            </button>
                            <span className="text-[10px] text-slate-300">Powered by Gemini</span>
                        </div>
                    </div>

                    {/* Settings Overlay */}
                    {showSettings && (
                        <div className="absolute inset-x-4 bottom-16 bg-white border border-slate-200 shadow-xl rounded-xl p-4 animate-in slide-in-from-bottom-2 z-10" ref={settingsRef}>
                            <h4 className="font-bold text-xs text-slate-500 uppercase mb-3">Configuration</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1">Model</label>
                                    <select value={selectedModel} onChange={e => setSelectedModel(e.target.value as any)} className="w-full text-xs border p-2 rounded">
                                        <option value="gemini-2.5-flash">Gemini Flash (Fast)</option>
                                        <option value="gemini-3-pro-preview">Gemini Pro (Smart)</option>
                                    </select>
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center text-xs gap-1 cursor-pointer">
                                        <input type="checkbox" checked={useSearch} onChange={e => setUseSearch(e.target.checked)} /> Google Search
                                    </label>
                                    <label className="flex items-center text-xs gap-1 cursor-pointer">
                                        <input type="checkbox" checked={useMaps} onChange={e => setUseMaps(e.target.checked)} /> Maps
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};