
import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { TrendingUp, IndianRupee, Package, ArrowUpRight, Bot, Users, ShoppingBag, Edit2, RefreshCw, X, Calendar, Check, Zap, Target, Sparkles, ArrowRight, Bell, AlertTriangle, Info, CheckCircle, Activity, BrainCircuit, Plus, Trash2, Save, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

export const Dashboard: React.FC = () => {
    const { products, sales, locations, customers, notifications, goals, addGoal, updateGoal, deleteGoal, salesTargets, setSalesTarget } = useApp();

    // Filter States
    const [chartPeriod, setChartPeriod] = useState<'Day' | 'Week' | 'Month'>('Week');

    // Goal Edit State
    const [editingGoal, setEditingGoal] = useState<string | null>(null);
    const [goalText, setGoalText] = useState('');
    const [newGoalText, setNewGoalText] = useState('');
    const [newGoalDeadline, setNewGoalDeadline] = useState('');
    const [isAddingGoal, setIsAddingGoal] = useState(false);

    // Inventory Filter State
    const [inventoryHealthLoc, setInventoryHealthLoc] = useState('all');

    // Sales Target State
    const [editingTargetLoc, setEditingTargetLoc] = useState<string | null>(null);
    const [newTargetAmount, setNewTargetAmount] = useState<number>(0);

    // --- 1. Top Metrics Calculations ---

    const totalRevenue = useMemo(() => sales.reduce((acc, s) => acc + s.totalAmount, 0), [sales]);
    const totalOrders = sales.length;
    const totalProfit = useMemo(() => {
        return sales.reduce((acc, s) => {
            const cost = s.items.reduce((c, i) => c + (i.cost * i.quantity), 0);
            return acc + (s.subtotal - cost);
        }, 0);
    }, [sales]);

    const lowStockItems = useMemo(() => {
        return products.filter(p => {
            // Location specific filtering
            if (inventoryHealthLoc !== 'all') {
                const threshold = p.minStockThresholds?.[inventoryHealthLoc] ?? p.minStockLevel;
                const stock = p.stock[inventoryHealthLoc] || 0;
                return stock <= threshold;
            }

            // Global Check if 'all' is selected
            if (p.minStockThresholds && Object.keys(p.minStockThresholds).length > 0) {
                return locations.some(loc => {
                    const threshold = p.minStockThresholds?.[loc.id] ?? p.minStockLevel;
                    const stock = p.stock[loc.id] || 0;
                    return stock <= threshold;
                });
            }
            return locations.some(loc => {
                const threshold = p.minStockLevel;
                const stock = p.stock[loc.id] || 0;
                return stock <= threshold;
            });
        });
    }, [products, locations, inventoryHealthLoc]);

    const deadStockItems = useMemo(() => {
        const now = new Date().getTime();
        return products.filter(p => {
            if (!p.lastSaleDate) return false;
            const daysSinceSale = (now - new Date(p.lastSaleDate).getTime()) / (1000 * 3600 * 24);
            const hasStock = inventoryHealthLoc === 'all' ? Object.values(p.stock).some(s => s > 0) : (p.stock[inventoryHealthLoc] || 0) > 0;
            return daysSinceSale > 60 && hasStock;
        });
    }, [products, inventoryHealthLoc]);

    const activeCustomersCount = customers.length;

    // --- 2. Chart Data Preparation ---

    const salesTrendData = useMemo(() => {
        const baseValue = totalRevenue / 30; // approx daily base

        if (chartPeriod === 'Day') {
            // Hourly breakdown mock
            return Array.from({ length: 12 }, (_, i) => ({
                period: `${i + 9} AM`,
                sales: Math.floor(Math.random() * (baseValue / 8))
            }));
        } else if (chartPeriod === 'Week') {
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            return days.map(day => ({
                period: day,
                sales: Math.floor(Math.random() * baseValue * 1.5) + baseValue / 2
            }));
        } else {
            // Month breakdown (days 1-30) - simplified to 4 weeks
            return ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map(w => ({
                period: w,
                sales: Math.floor(Math.random() * baseValue * 7)
            }));
        }
    }, [totalRevenue, chartPeriod]);

    const stockByLocationData = useMemo(() => {
        return locations.map(loc => {
            const count = products.reduce((acc, p) => acc + (p.stock[loc.id] || 0), 0);
            return { name: loc.name, value: count };
        });
    }, [products, locations]);

    // --- 3. Dynamic AI Insights ---
    const dynamicInsights = useMemo(() => {
        const avgOrderValue = totalRevenue / totalOrders || 0;
        const recentSales = sales.slice(-10);
        const recentAvg = recentSales.reduce((a, s) => a + s.totalAmount, 0) / 10 || 0;
        const growth = ((recentAvg - avgOrderValue) / avgOrderValue) * 100;
        const growthStr = growth >= 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;

        const catCounts: Record<string, number> = {};
        sales.forEach(s => s.items.forEach(i => {
            const itemAmount = i.price * i.quantity;
            catCounts[i.category] = (catCounts[i.category] || 0) + itemAmount;
        }));
        const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';

        return {
            revenueText: `Revenue is trending ${growth >= 0 ? 'up' : 'down'} by <span class="font-bold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}">${growthStr}</span> recently. Top category: ${topCat}.`,
            profitText: `Gross Profit estimated at <span class="font-bold">₹${totalProfit.toLocaleString()}</span>. Margins healthy on ${topCat} items.`,
            velocityText: `Order frequency is ${totalOrders > 50 ? 'High' : 'Moderate'}. Suggested restocking for ${locations[0]?.name} based on recent volume.`,
            retentionText: `${Math.floor(Math.random() * 20 + 50)}% of sales from repeat customers. Loyalty program engagement is steady.`
        };
    }, [sales, totalRevenue, totalOrders, totalProfit, locations]);

    // --- 4. Sales Target Progress ---
    const salesProgressData = useMemo(() => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        return locations.map(loc => {
            const target = salesTargets.find(t => t.locationId === loc.id && t.month === currentMonth);
            const actual = sales
                .filter(s => s.locationId === loc.id && s.date.startsWith(currentMonth))
                .reduce((acc, s) => acc + s.totalAmount, 0);

            return {
                locationId: loc.id,
                name: loc.name,
                target: target ? target.targetAmount : 0,
                targetId: target ? target.id : null,
                actual,
                percent: target && target.targetAmount > 0 ? Math.min(100, (actual / target.targetAmount) * 100) : 0
            };
        });
    }, [sales, salesTargets, locations]);

    const handleUpdateTarget = (locationId: string, amount: number, existingId: string | null) => {
        const month = new Date().toISOString().slice(0, 7);
        const id = existingId || `tgt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        setSalesTarget({
            id,
            locationId,
            month,
            targetAmount: amount
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">

            {/* Top Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Real-time overview & AI insights</p>
                </div>
            </div>

            {/* Row 1: Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Revenue</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">₹{totalRevenue.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <IndianRupee size={20} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                            <TrendingUp size={12} className="mr-1" /> +12.5%
                        </span>
                        <span className="text-slate-400 ml-2">from last week</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Orders</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{totalOrders.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                            <ShoppingBag size={20} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                            <ArrowUpRight size={12} className="mr-1" /> +5.2%
                        </span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Stock</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{lowStockItems.length}</h3>
                        </div>
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/40 rounded-lg text-amber-600 dark:text-amber-400">
                            <Package size={20} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs">
                        <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                            Needs Attention
                        </span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active WareHouse</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{activeCustomersCount}</h3>
                        </div>
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/40 rounded-lg text-purple-600 dark:text-purple-400">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Returning: <span className="font-semibold text-slate-700 dark:text-slate-200">65%</span></span>
                    </div>
                </div>
            </div>

            {/* Row 2: Charts and Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-1">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800">Sales Trends</h3>
                        <div className="flex bg-slate-100 rounded-lg p-1 text-xs">
                            {['Day', 'Week', 'Month'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setChartPeriod(p as any)}
                                    className={`px-3 py-1 rounded transition-all ${chartPeriod === p ? 'bg-white shadow text-indigo-700 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesTrendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-1">
                    <h3 className="font-bold text-slate-800 mb-4">Stock Distribution</h3>
                    <div className="h-64 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stockByLocationData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {stockByLocationData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* New Live Notifications Panel */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-1 flex flex-col h-[340px]">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-2">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Bell size={18} className="text-indigo-600" /> Live Alerts</h3>
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{notifications.length} New</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {notifications.map(n => (
                            <div key={n.id} className="flex gap-3 items-start p-2 hover:bg-slate-50 rounded-lg transition-colors border-l-2 border-transparent hover:border-indigo-200 animate-in fade-in slide-in-from-right-2">
                                <div className={`mt-0.5 p-1 rounded-full flex-shrink-0 ${n.type === 'SUCCESS' ? 'bg-green-100 text-green-600' :
                                    n.type === 'WARNING' ? 'bg-amber-100 text-amber-600' :
                                        n.type === 'ERROR' ? 'bg-red-100 text-red-600' :
                                            'bg-blue-100 text-blue-600'
                                    }`}>
                                    {n.type === 'SUCCESS' ? <CheckCircle size={12} /> :
                                        n.type === 'WARNING' ? <AlertTriangle size={12} /> :
                                            n.type === 'ERROR' ? <X size={12} /> :
                                                <Info size={12} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{n.message}</p>
                                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    {n.details && <p className="text-xs text-slate-500 line-clamp-1">{n.details}</p>}
                                </div>
                            </div>
                        ))}
                        {notifications.length === 0 && (
                            <div className="text-center text-slate-400 py-10 flex flex-col items-center">
                                <Bell size={24} className="mb-2 opacity-20" />
                                <span className="text-xs">No new notifications</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 3: Strategic Insights Boxes & Goals */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* AI Business Insights */}
                <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 border border-indigo-100 dark:border-slate-700 p-6 rounded-xl shadow-sm">
                    <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-400 mb-4 flex items-center gap-2 border-b border-indigo-100 dark:border-slate-700 pb-3">
                        <BrainCircuit size={20} className="text-indigo-600 dark:text-indigo-400" /> AI Business Insights
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm text-indigo-600 dark:text-indigo-400"><TrendingUp size={18} /></div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Revenue Growth</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: dynamicInsights.revenueText }}></p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm text-emerald-600 dark:text-emerald-400"><IndianRupee size={18} /></div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Profitability</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: dynamicInsights.profitText }}></p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm text-blue-600 dark:text-blue-400"><ShoppingBag size={18} /></div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Sales Velocity</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: dynamicInsights.velocityText }}></p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm text-purple-600 dark:text-purple-400"><Activity size={18} /></div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Customer Retention</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{dynamicInsights.retentionText}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Business Goals Widget */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-xl shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Target size={20} className="text-blue-500" /> Business Goals
                        </h3>
                        {!isAddingGoal && (
                            <button onClick={() => setIsAddingGoal(true)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-indigo-600 dark:text-indigo-400"><Plus size={18} /></button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3">
                        {isAddingGoal && (
                            <div className="flex flex-col gap-2 mb-3 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg animate-in fade-in border border-indigo-100 dark:border-slate-600">
                                <input
                                    className="w-full border p-1.5 text-sm rounded outline-none focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                                    placeholder="Goal description..."
                                    value={newGoalText}
                                    onChange={e => setNewGoalText(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        className="flex-1 border p-1.5 text-xs rounded outline-none focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                                        value={newGoalDeadline}
                                        onChange={e => setNewGoalDeadline(e.target.value)}
                                    />
                                    <button onClick={() => { if (newGoalText) addGoal(newGoalText, newGoalDeadline); setNewGoalText(''); setNewGoalDeadline(''); setIsAddingGoal(false); }} className="bg-indigo-600 text-white px-2 rounded hover:bg-indigo-700"><Check size={16} /></button>
                                    <button onClick={() => setIsAddingGoal(false)} className="bg-white border text-slate-500 px-2 rounded hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700"><X size={16} /></button>
                                </div>
                            </div>
                        )}

                        {goals.map(goal => (
                            <div key={goal.id} className="group flex justify-between items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded border border-transparent hover:border-slate-100 dark:hover:border-slate-600 transition-all">
                                {editingGoal === goal.id ? (
                                    <div className="flex gap-2 w-full">
                                        <input
                                            className="flex-1 border p-1 text-sm rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                                            value={goalText}
                                            onChange={e => setGoalText(e.target.value)}
                                        />
                                        <button onClick={() => { updateGoal(goal.id, goalText); setEditingGoal(null); }} className="text-green-600"><Check size={16} /></button>
                                        <button onClick={() => setEditingGoal(null)} className="text-slate-400"><X size={16} /></button>
                                    </div>
                                ) : (
                                    <div className="w-full">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${goal.status === 'Completed' ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                                                <span className={`${goal.status === 'Completed' ? 'line-through text-slate-400' : ''} line-clamp-1`}>{goal.text}</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingGoal(goal.id); setGoalText(goal.text); }} className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 rounded"><Edit2 size={14} /></button>
                                                <button onClick={() => deleteGoal(goal.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        {goal.deadline && (
                                            <div className="text-[10px] text-slate-400 ml-4 flex items-center gap-1 mt-0.5">
                                                <Calendar size={10} /> Due: {new Date(goal.deadline).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {goals.length === 0 && !isAddingGoal && <p className="text-sm text-slate-400 text-center italic mt-10">No goals set.</p>}
                    </div>
                </div>

                {/* Inventory Health & Alert Box */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-xl shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Activity size={20} className="text-amber-500" /> Inventory Health
                        </h3>
                        <div className="relative">
                            <select
                                className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white text-xs rounded-lg py-1 pl-2 pr-6 outline-none focus:border-indigo-500"
                                value={inventoryHealthLoc}
                                onChange={e => setInventoryHealthLoc(e.target.value)}
                            >
                                <option value="all">All Locations</option>
                                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <MapPin size={12} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-red-50 dark:bg-red-900/40 p-3 rounded-lg border border-red-100 dark:border-red-800/50 text-center">
                            <span className="text-xs text-red-600 dark:text-red-400 font-bold uppercase block mb-1">Critical Low Stock</span>
                            <span className="text-2xl font-bold text-red-800 dark:text-red-200">{lowStockItems.length}</span>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/40 p-3 rounded-lg border border-amber-100 dark:border-amber-800/50 text-center">
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase block mb-1">Dead Stock</span>
                            <span className="text-2xl font-bold text-amber-800 dark:text-amber-200">{deadStockItems.length}</span>
                        </div>
                    </div>
                    <div className="space-y-2 flex-1 overflow-y-auto max-h-48 pr-1 custom-scrollbar">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase sticky top-0 bg-white dark:bg-slate-800 pb-1">Actionable Alerts</h4>
                        {lowStockItems.slice(0, 5).map(p => (
                            <div key={p.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-100 dark:border-slate-700">
                                <div className="flex-1 min-w-0 mr-2">
                                    <span className="font-medium text-slate-700 dark:text-slate-200 truncate block">{p.name}</span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Stock: {inventoryHealthLoc === 'all' ? Object.values(p.stock).reduce((a: number, b: number) => a + b, 0) : p.stock[inventoryHealthLoc]}</span>
                                </div>
                                <span className="text-red-600 dark:text-red-400 text-[10px] font-bold bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded whitespace-nowrap">Reorder</span>
                            </div>
                        ))}
                        {deadStockItems.slice(0, 2).map(p => (
                            <div key={p.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-100 dark:border-slate-700">
                                <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{p.name}</span>
                                <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">Clearance</span>
                            </div>
                        ))}
                        {lowStockItems.length === 0 && deadStockItems.length === 0 && (
                            <div className="text-center text-sm text-green-600 py-4 flex flex-col items-center gap-2 opacity-70">
                                <CheckCircle size={32} />
                                <span>Inventory is healthy!</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 4: Monthly Sales Targets Widget */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Target size={20} className="text-indigo-600 dark:text-indigo-400" /> Monthly Sales Targets ({new Date().toLocaleString('default', { month: 'long' })})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {salesProgressData.map(data => (
                        <div key={data.locationId} className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700 relative group">
                            <div className="flex justify-between items-end mb-2">
                                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{data.name}</span>
                                <div className="text-right">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Target: </span>
                                    {editingTargetLoc === data.locationId ? (
                                        <div className="flex items-center gap-1 inline-flex">
                                            <input
                                                type="number"
                                                className="w-20 text-xs border rounded p-1 outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                                                autoFocus
                                                defaultValue={data.target}
                                                onBlur={(e) => {
                                                    if (e.target.value) {
                                                        handleUpdateTarget(data.locationId, Number(e.target.value), data.targetId);
                                                    }
                                                    setEditingTargetLoc(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleUpdateTarget(data.locationId, Number(e.currentTarget.value), data.targetId);
                                                        setEditingTargetLoc(null);
                                                    }
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <span className="font-bold text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400" onClick={() => setEditingTargetLoc(data.locationId)}>₹{data.target.toLocaleString()}</span>
                                    )}
                                </div>
                            </div>

                            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2.5 mb-1 overflow-hidden">
                                <div
                                    className={`h-2.5 rounded-full transition-all duration-500 ${data.percent >= 100 ? 'bg-green-500' : 'bg-indigo-600'}`}
                                    style={{ width: `${data.percent}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between text-xs mt-1">
                                <span className="text-slate-500 dark:text-slate-400">Achieved: <span className="font-bold text-slate-800 dark:text-slate-200">₹{data.actual.toLocaleString()}</span></span>
                                <span className={`font-bold ${data.percent >= 100 ? 'text-green-600 dark:text-green-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{data.percent.toFixed(1)}%</span>
                            </div>

                            <button onClick={() => setEditingTargetLoc(data.locationId)} className="absolute top-2 right-2 p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600 transition-all">
                                <Edit2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
