import React, { useMemo, useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Package, AlertTriangle, Calendar, Activity, Zap, CreditCard, BarChart2, FileText, Info, X, Filter, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart } from 'recharts';
import { generateStrategicInsights, StrategicInsight, generateProductForecasts, ProductForecast, generateSystemAlerts } from '../services/AnalyticsEngine';

const Analytics: React.FC = () => {
    const { products, sales, customers, transfers, suppliers, salesTargets, locations, transferStock, updateProduct, addGoal, addNotification } = useApp();
    const [timeRange, setTimeRange] = useState<'7d' | '30d'>('30d');
    const [insights, setInsights] = useState<StrategicInsight[]>([]);

    // Forecasting State
    const [showForecasting, setShowForecasting] = useState(false);
    const [forecasts, setForecasts] = useState<ProductForecast[]>([]);
    const [trendFilter, setTrendFilter] = useState<'All' | 'High Growth' | 'Stable' | 'Declining'>('All');
    const [selectedProductForGraph, setSelectedProductForGraph] = useState<ProductForecast | null>(null);

    // Action Execution
    const [selectedInsight, setSelectedInsight] = useState<StrategicInsight | null>(null);
    const [actionInput, setActionInput] = useState('');
    const [marketPriceData, setMarketPriceData] = useState<{ price: number | null, loading: boolean }>({ price: null, loading: false });
    const [editableMarketPrice, setEditableMarketPrice] = useState<string>('');
    const [observations, setObservations] = useState<(StrategicInsight & { status: string, executedAt: number })[]>([]);
    const [activeTab, setActiveTab] = useState<'strategies' | 'observations'>('strategies');

    useEffect(() => {
        const fetchMarketPrice = async (productName: string) => {
            setMarketPriceData({ price: null, loading: true });
            try {
                const res = await fetch(`http://localhost:5000/api/market-price-v2?name=${encodeURIComponent(productName)}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await res.json();
                setMarketPriceData({ price: data.marketPrice, loading: false });
                setEditableMarketPrice(data.marketPrice ? data.marketPrice.toString() : '');
            } catch (e) {
                setMarketPriceData({ price: null, loading: false });
                setEditableMarketPrice('');
            }
        };

        if (selectedInsight?.metadata?.productId) {
            // Find product name
            const p = products.find(prod => prod.id === selectedInsight.metadata.productId);
            if (p) {
                fetchMarketPrice(p.name);
                if (selectedInsight.actionType === 'LIQUIDATE') {
                    setActionInput(Math.floor(p.price * 0.8).toString());
                }
            } else {
                setActionInput('');
            }
        } else {
            setActionInput('');
            setActionInput('');
            setMarketPriceData({ price: null, loading: false });
            setEditableMarketPrice('');
        }
    }, [selectedInsight, products]);

    const executeStrategy = async () => {
        if (!selectedInsight) return;
        const { actionType, metadata } = selectedInsight;
        const p = products.find(prod => prod.id === metadata.productId);

        if (!p) return;

        // Generic: If a price is input, apply it globally (Action Type independent)
        // This covers Liquidation and Profit Optimization
        if (actionInput && !isNaN(Number(actionInput))) {
            const newPrice = Number(actionInput);
            if (newPrice !== p.price) {
                await updateProduct({ ...p, price: newPrice });
                addNotification('SUCCESS', `Price Updated: ${p.name} set to ₹${newPrice}`);
            }
        }

        if (actionType === 'TRANSFER') {
            transferStock(metadata.productId, metadata.from, metadata.to, metadata.qty, "AI Optimization");
        } else if (actionType === 'REORDER') {
            addGoal(`Urgent: Restock ${metadata.reorderQty} units of ${p.name}`, new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]);
            addNotification('SUCCESS', `Goal Created: Restock ${p.name}`);
        }

        // Move to Observations (Global Inventory Monitor)
        const observedInsight = { ...selectedInsight, status: 'Monitoring', executedAt: Date.now(), acceptedPrice: editableMarketPrice };
        setObservations(prev => [observedInsight, ...prev]);
        setInsights(prev => prev.filter(i => i.id !== selectedInsight.id));

        setSelectedInsight(null);
        setActiveTab('observations');
    };


    // Generate Insights & Forecasts
    useEffect(() => {
        if (products.length > 0 && sales.length > 0) {
            const strategic = generateStrategicInsights(products, sales);
            // Deduplicate: Remove insights that are already in Observation Deck
            const activeInsights = strategic.filter(s => !observations.some(obs => obs.id === s.id));

            setInsights(activeInsights);
            const productForecasts = generateProductForecasts(products, sales);
            setForecasts(productForecasts);
            if (productForecasts.length > 0) setSelectedProductForGraph(productForecasts[0]);
        }
    }, [products, sales, observations]);


    const systemAlerts = useMemo(() => generateSystemAlerts(products), [products]);

    // --- Time Range Filtering (Main Dashboard) ---
    const filteredSales = useMemo(() => {
        const now = new Date();
        const days = timeRange === '7d' ? 7 : 30;
        const pastDate = new Date();
        pastDate.setDate(now.getDate() - days);

        return sales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate >= pastDate && saleDate <= now;
        });
    }, [sales, timeRange]);

    const metrics = useMemo(() => {
        const totalRevenue = filteredSales.reduce((acc: number, sale) => acc + (sale.totalAmount || 0), 0);

        const totalCOGS = filteredSales.reduce((acc: number, sale) => {
            return acc + sale.items.reduce((itemAcc: number, item) => {
                let cost = item.cost;
                if (cost === undefined || cost === null) {
                    const product = products.find(p => p.id === item.id);
                    cost = product?.cost || 0;
                }
                return itemAcc + (cost * item.quantity);
            }, 0);
        }, 0);

        const grossProfit = totalRevenue - totalCOGS;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        const currentInventoryValue = products.reduce((acc: number, p) => {
            const totalStock = Object.values(p.stock || {}).reduce((a: number, b) => a + Number(b || 0), 0);
            return acc + (totalStock * Number(p.cost || 0));
        }, 0);

        const inventoryTurnover = currentInventoryValue > 0 ? totalCOGS / currentInventoryValue : 0;

        return { grossMargin, currentInventoryValue, inventoryTurnover, grossProfit, totalRevenue };
    }, [filteredSales, products, timeRange]);

    const salesByLocation = useMemo(() => {
        const locationSales: Record<string, number> = {};
        filteredSales.forEach(sale => {
            const loc = locations.find(l => l.id === sale.locationId);
            const locName = loc ? loc.name : (sale.locationId || 'Unknown Location');
            locationSales[locName] = (locationSales[locName] || 0) + (sale.totalAmount || 0);
        });
        return Object.entries(locationSales)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredSales, locations]);

    const salesByCategory = useMemo(() => {
        const categorySales: Record<string, number> = {};
        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                let category = item.category;
                if (!category) {
                    const product = products.find(p => p.id === item.id);
                    category = product?.category;
                }
                const finalCategory = category || 'Uncategorized';
                categorySales[finalCategory] = (categorySales[finalCategory] || 0) + (item.price * item.quantity);
            });
        });
        return Object.entries(categorySales).map(([name, value]) => ({ name, value }));
    }, [filteredSales, products]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    const filteredForecasts = forecasts.filter(f => trendFilter === 'All' || f.trend === trendFilter);

    // Graph Data Preparation for Modal
    const graphData = useMemo(() => {
        if (!selectedProductForGraph) return [];
        // Combine history with future projection
        const history = selectedProductForGraph.history;

        // Generate future points (linear interpolation for simplicity)
        const lastDate = history.length > 0 ? new Date(history[history.length - 1].date) : new Date();
        const dailyRate = selectedProductForGraph.forecastedSales / 30;

        const future = Array.from({ length: 10 }, (_, i) => {
            const d = new Date(lastDate);
            d.setDate(d.getDate() + (i + 1) * 3); // Every 3 days
            return {
                date: d.toISOString().split('T')[0],
                actual: 0,
                forecast: Math.round(dailyRate * 3) // Approx 3-day volume
            };
        });

        // Normalize data structure
        return [
            ...history.map(h => ({ date: h.date, actual: h.value, forecast: 0 })),
            ...future
        ];

    }, [selectedProductForGraph]);


    // Critical Stock Analysis for Burn Rate Chart
    const criticalStockAnalysis = products
        .map(p => {
            const stock = Object.values(p.stock).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
            const dailyBurn = 2;
            const daysLeft = dailyBurn > 0 ? stock / dailyBurn : 999;
            return { name: p.name, stock, daysLeft };
        })
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 5);

    const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">

            {/* --- ADVANCED FORECASTING MODAL --- */}
            {showForecasting && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50 dark:bg-slate-800 rounded-t-xl shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <TrendingUp size={24} className="text-indigo-600" />
                                    AI Product Forecasting Engine
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">Predictive analysis based on historical velocity and seasonal trends.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600">
                                    <Filter size={14} className="text-slate-400" />
                                    <select
                                        className="bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                                        value={trendFilter}
                                        onChange={(e) => setTrendFilter(e.target.value as any)}
                                    >
                                        <option value="All">All Trends</option>
                                        <option value="High Growth">High Growth 🔥</option>
                                        <option value="Stable">Stable ⚖️</option>
                                        <option value="Declining">Declining 📉</option>
                                    </select>
                                </div>
                                <button onClick={() => setShowForecasting(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>
                        </div>

                        {/* Body - Split View */}
                        <div className="flex flex-1 overflow-hidden">
                            {/* Left: Product List */}
                            <div className="w-1/3 border-r border-slate-200 dark:border-slate-600 overflow-y-auto bg-slate-50 dark:bg-slate-800/50 p-4">
                                <div className="space-y-3">
                                    {filteredForecasts.map(product => (
                                        <div
                                            key={product.productId}
                                            onClick={() => setSelectedProductForGraph(product)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${selectedProductForGraph?.productId === product.productId ? 'bg-white dark:bg-slate-700 border-indigo-500 ring-1 ring-indigo-500 shadow-md' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-indigo-300'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{product.name}</h4>
                                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${product.trend === 'High Growth' ? 'bg-green-100 text-green-700' :
                                                    product.trend === 'Declining' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {product.trend}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <div className="text-xs text-slate-400">Growth Rate</div>
                                                    <div className={`font-semibold ${product.growthRate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {product.growthRate > 0 ? '+' : ''}{product.growthRate.toFixed(1)}%
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-slate-400">Next 30 Days</div>
                                                    <div className="font-bold text-indigo-600 dark:text-indigo-400">{product.forecastedSales} Units</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Visualization */}
                            <div className="w-2/3 p-6 overflow-y-auto">
                                {selectedProductForGraph ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Performance Analysis: {selectedProductForGraph.name}</h2>
                                                <div className="flex gap-4 text-sm mt-2">
                                                    <div className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-slate-600 dark:text-slate-300">
                                                        Current Vol: <strong>{selectedProductForGraph.currentMonthlySales}</strong>
                                                    </div>
                                                    <div className="bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full text-indigo-600 dark:text-indigo-300">
                                                        Forecast: <strong>{selectedProductForGraph.forecastedSales}</strong>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-slate-400">Confidence Score</div>
                                                <div className="font-bold text-xl text-emerald-500">{(selectedProductForGraph.confidence * 100).toFixed(0)}%</div>
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-[350px] shadow-sm">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ComposedChart data={graphData}>
                                                    <defs>
                                                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                    <XAxis dataKey="date" fontSize={10} stroke="#94a3b8" tickFormatter={(str) => {
                                                        const d = new Date(str);
                                                        return `${d.getDate()}/${d.getMonth() + 1}`;
                                                    }} />
                                                    <YAxis fontSize={10} stroke="#94a3b8" label={{ value: 'Units', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    <Legend />
                                                    {/* Actual History Bar */}
                                                    <Bar dataKey="actual" name="Historical Sales" fill="url(#colorActual)" barSize={20} radius={[4, 4, 0, 0]} animationDuration={1500} />
                                                    {/* Forecast Line */}
                                                    <Area type="monotone" dataKey="forecast" name="AI Projection" stroke="#10b981" strokeWidth={3} fill="url(#colorForecast)" animationDuration={2000} strokeDasharray="5 5" />
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                                <h5 className="font-bold text-orange-800 dark:text-orange-400 flex items-center gap-2 text-sm mb-2">
                                                    <AlertTriangle size={16} /> Risk Analysis
                                                </h5>
                                                <p className="text-xs text-orange-700 dark:text-orange-300">
                                                    {selectedProductForGraph.trend === 'Declining'
                                                        ? 'High Risk: Significant drop in demand detected compared to previous period. Consider marketing push or liquidation.'
                                                        : 'Low Risk: Demand remains stable or growing. Ensure stock levels are sufficient for forecasted increase.'}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                                <h5 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2 text-sm mb-2">
                                                    <Zap size={16} /> Strategic Move
                                                </h5>
                                                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                                    {selectedProductForGraph.growthRate > 10
                                                        ? 'Opportunity: Trending item. Increase inventory cover to 45 days to prevent stockouts.'
                                                        : 'Maintain: Keep standard replenishment cycle. Monitor for seasonal spikes.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400 flex-col gap-4">
                                        <BarChart2 size={48} className="opacity-20" />
                                        <p>Select a product to view AI Analysis</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Advanced Analytics</h1>
                <p className="text-slate-500 dark:text-slate-400">Business performance and strategic insights</p>
            </div>

            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setTimeRange('7d')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timeRange === '7d' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                    Last 7 Days
                </button>
                <button
                    onClick={() => setTimeRange('30d')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timeRange === '30d' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                    Last 30 Days
                </button>
                <button onClick={() => alert("Advanced Reporting Module: Coming in v2.0")} className="ml-auto flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700">
                    <FileText size={16} /> Advanced Reports
                </button>
                <button onClick={() => setShowForecasting(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 shadow-sm shadow-indigo-200">
                    <TrendingUp size={16} /> Forecasting
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 shadow-lg shadow-purple-200 animate-pulse">
                    <Zap size={16} /> Strategic Insights
                </button>
            </div>

            {/* Main Dashboard Key Metrics & Charts (Preserved) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gross Margin</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{metrics.grossMargin.toFixed(1)}%</p>
                        </div>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                            <Activity size={20} />
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-green-600 font-medium">
                        <ArrowUpRight size={14} className="mr-1" /> +2.4% <span className="text-slate-400 ml-1 font-normal">vs last month</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Inventory Value</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">₹{metrics.currentInventoryValue.toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-slate-500">
                        Stable
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm group relative">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-slate-800 text-white text-xs p-2 rounded shadow-lg w-48 z-10">
                            How many times you sold your total stock value this month.
                        </div>
                    </div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="flex items-center gap-1">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Stock Rotation</p>
                                <Info size={12} className="text-slate-400 cursor-help" />
                            </div>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{metrics.inventoryTurnover.toFixed(2)}x</p>
                        </div>
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-slate-500 font-medium">
                        {metrics.inventoryTurnover < 1 ? 'Slow moving stock' : 'Healthy flow'}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Est. Profit</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">₹{metrics.grossProfit.toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-green-600 font-medium">
                        <ArrowUpRight size={14} className="mr-1" /> +12% <span className="text-slate-400 ml-1 font-normal">projected</span>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-80">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Sales by Location</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={salesByLocation} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                            <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" tickFormatter={(val) => `₹${val / 1000}k`} />
                            <Tooltip
                                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{ fill: '#f8fafc' }}
                            />
                            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} label={{ position: 'top', formatter: (val: number) => `₹${(val / 1000).toFixed(1)}k`, fontSize: 10, fill: '#64748b' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-80">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Category Performance</h3>
                    <div className="w-full h-full pb-8">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={salesByCategory}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {salesByCategory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Strategic Insights Engine Output */}
            {/* 3. AI Insights Panel with Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex gap-4">
                        <h3 className={`cursor-pointer text-lg font-bold flex items-center gap-2 ${activeTab === 'strategies' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('strategies')}>
                            <Zap className={activeTab === 'strategies' ? "text-yellow-500" : "text-slate-400"} /> Strategic Recommendations
                        </h3>
                        <h3 className={`cursor-pointer text-lg font-bold flex items-center gap-2 ${activeTab === 'observations' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('observations')}>
                            <Activity className={activeTab === 'observations' ? "text-blue-500" : "text-slate-400"} /> Observation Deck
                        </h3>
                    </div>
                </div>

                <div className="p-0">
                    {activeTab === 'strategies' ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {insights.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                    <Zap className="mx-auto mb-3 opacity-20" size={40} />
                                    <p>No immediate strategic actions required.</p>
                                </div>
                            ) : (
                                insights.map(insight => (
                                    <div key={insight.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex gap-4">
                                            <div className={`mt-1 p-2 rounded-lg shrink-0 ${insight.type === 'Profit Optimization' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                insight.type === 'Risk Mitigation' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                                                    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}>
                                                {insight.type === 'Profit Optimization' ? <DollarSign size={20} /> :
                                                    insight.type === 'Risk Mitigation' ? <AlertTriangle size={20} /> :
                                                        <Activity size={20} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-slate-800 dark:text-white">{insight.problem}</h4>
                                                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-slate-100 dark:bg-slate-600 text-slate-500 rounded">
                                                        {insight.type}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{insight.recommendedAction}</p>
                                                <div className="flex items-center gap-3 text-xs">
                                                    <span className="font-semibold text-emerald-600 flex items-center bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">
                                                        ROI: {insight.roiImpact}
                                                    </span>
                                                    <span className="text-slate-400">Impact: {insight.impact}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 pl-14 md:pl-0">
                                            <div className="text-right mr-4 hidden md:block">
                                                <div className="text-xs text-slate-400">Confidence</div>
                                                <div className="font-bold text-slate-700 dark:text-slate-200">{(insight.confidenceScore * 100).toFixed(0)}%</div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedInsight(insight)}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-indigo-200 dark:shadow-none whitespace-nowrap">
                                                Execute Action
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {observations.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                    <Activity className="mx-auto mb-3 opacity-20" size={40} />
                                    <p>No active observations. Execute strategies to track them here.</p>
                                </div>
                            ) : (
                                observations.map((obs: any) => {
                                    const p = products.find(prod => prod.id === obs.metadata.productId);
                                    const totalStock = p ? Object.values(p.stock).reduce((a: number, b: any) => a + Number(b), 0) : 0;

                                    return (
                                        <div key={obs.id} className="p-5 bg-slate-50/50 dark:bg-slate-700/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex gap-4">
                                                <div className="mt-1 p-2 rounded-lg shrink-0 bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                                    <Activity size={20} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-bold text-slate-800 dark:text-white">{p ? p.name : obs.problem}</h4>
                                                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                                                            {obs.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                                                        {p ? `Live Inventory: ${totalStock} Units | Current Price: ₹${p.price}` : 'Product data unavailable'}
                                                    </p>
                                                    <div className="flex gap-4 text-xs text-slate-500">
                                                        <span>Strategy: {obs.type}</span>
                                                        {obs.acceptedPrice && <span>Analyzed Market Price: ₹{obs.acceptedPrice}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Stock Burn Rate Prediction (Critical Items)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={criticalStockAnalysis} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" strokeOpacity={0.1} />
                            <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                            <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '11px' }} stroke="#94a3b8" />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} />
                            <Bar dataKey="stock" barSize={10} fill="#413ea0" name="Current Stock" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="daysLeft" barSize={10} fill="#ff7300" name="Days Left" radius={[0, 4, 4, 0]} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Recent Alerts</h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {systemAlerts.length === 0 ? (
                            <div className="p-4 text-center text-slate-400 text-xs">All systems operational. No alerts.</div>
                        ) : (
                            systemAlerts.map(alert => (
                                <div key={alert.id} className={`flex gap-3 items-start p-3 rounded-lg border ${alert.type === 'critical' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30'}`}>
                                    <AlertTriangle size={16} className={`mt-0.5 ${alert.type === 'critical' ? 'text-red-600' : 'text-orange-600'}`} />
                                    <div>
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{alert.title}</p>
                                        <p className="text-xs text-slate-500 mt-1">{alert.message}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">{new Date(alert.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            {/* Action Execution Modal */}
            {selectedInsight && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Zap className="text-yellow-500" size={20} />
                                Execute Recommendation
                            </h3>
                            <p className="text-sm text-slate-500">{selectedInsight.problem}</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-100 dark:border-slate-600 mb-6">
                            <p className="font-medium text-slate-700 dark:text-slate-200 mb-2">{selectedInsight.recommendedAction}</p>
                            <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                                <TrendingUp size={14} /> Expected Impact: {selectedInsight.roiImpact}
                            </div>
                        </div>

                        {/* Market Price Analysis */}
                        {(selectedInsight.actionType === 'LIQUIDATE' || selectedInsight.actionType === 'PRICE_ADJUST') && selectedInsight.metadata?.productId && (
                            <div className="mb-4 p-3 bg-indigo-50 dark:bg-slate-700/30 rounded-lg flex justify-between items-center border border-indigo-100 dark:border-slate-600">
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Current Selling Price</p>
                                    <p className="font-bold text-slate-800 dark:text-white">
                                        ₹{products.find(p => p.id === selectedInsight.metadata.productId)?.price || 0}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1">
                                        Market Price <Search size={10} />
                                    </p>
                                    {marketPriceData.loading ? (
                                        <div className="h-5 w-16 bg-slate-200 dark:bg-slate-600 animate-pulse rounded mt-1 ml-auto"></div>
                                    ) : (
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-1">
                                                <span className="text-slate-400 dark:text-slate-500">₹</span>
                                                <input
                                                    className="w-20 bg-transparent border-b border-slate-300 dark:border-slate-500 font-bold text-right outline-none focus:border-indigo-500 text-indigo-600 dark:text-indigo-400"
                                                    value={editableMarketPrice}
                                                    onChange={(e) => setEditableMarketPrice(e.target.value)}
                                                    placeholder="0"
                                                />
                                            </div>
                                            {marketPriceData.price && (
                                                <span className="text-[10px] text-slate-400">
                                                    {(products.find(p => p.id === selectedInsight.metadata.productId)?.price || 0) > marketPriceData.price
                                                        ? 'You are Expensive'
                                                        : 'Competitive'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {(selectedInsight.actionType === 'LIQUIDATE' || selectedInsight.actionType === 'PRICE_ADJUST') && (
                            <div className="mb-6">
                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                    {selectedInsight.actionType === 'LIQUIDATE' ? 'New Clearance Price (₹)' : 'New Optimized Price (₹)'}
                                </label>
                                <input
                                    type="number"
                                    value={actionInput}
                                    onChange={(e) => setActionInput(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-800 dark:text-white"
                                />
                            </div>
                        )}

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setSelectedInsight(null)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeStrategy}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-indigo-200 dark:shadow-none"
                            >
                                Confirm & Execute
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export { Analytics };
