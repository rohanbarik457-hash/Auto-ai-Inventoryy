
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Filter, Download, FileText, Bot, Settings2, Plus, Trash2, AlertCircle, X, Save, Table } from 'lucide-react';
import { chatWithAgent } from '../services/geminiService';

export const GSTReport: React.FC = () => {
    const { sales, locations, products, taxTiers, addTaxTier, deleteTaxTier } = useApp();
    const [selectedLocation, setSelectedLocation] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedTaxRate, setSelectedTaxRate] = useState<string>('all');

    // Date Filtering
    const [dateRangeType, setDateRangeType] = useState<'thisMonth' | 'lastMonth' | 'thisQuarter' | 'custom'>('thisMonth');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [dateError, setDateError] = useState('');

    // AI Analyst
    const [isAnalystOpen, setIsAnalystOpen] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Tax Configuration Modal
    const [taxConfigOpen, setTaxConfigOpen] = useState(false);
    const [newTaxForm, setNewTaxForm] = useState({ name: '', rate: '', cgst: '', sgst: '', category: 'Standard' });

    // Initialize Dates
    useEffect(() => {
        const today = new Date();
        let start = new Date(), end = today;
        if (dateRangeType === 'thisMonth') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
        } else if (dateRangeType === 'lastMonth') {
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
        } else if (dateRangeType === 'thisQuarter') {
            const q = Math.floor(today.getMonth() / 3);
            start = new Date(today.getFullYear(), q * 3, 1);
        }

        if (dateRangeType !== 'custom') {
            const offset = start.getTimezoneOffset();
            const startLocal = new Date(start.getTime() - (offset * 60 * 1000));
            const endLocal = new Date(end.getTime() - (offset * 60 * 1000));
            setStartDate(startLocal.toISOString().split('T')[0]);
            setEndDate(endLocal.toISOString().split('T')[0]);
            setDateError('');
        }
    }, [dateRangeType]);

    const filteredSales = useMemo(() => {
        if (startDate && endDate && startDate > endDate) return [];
        return sales.filter(s => {
            const matchLoc = selectedLocation === 'all' || s.locationId === selectedLocation;
            const matchDate = s.date >= startDate && s.date <= endDate;
            const matchCat = selectedCategory === 'all' || s.items.some(i => i.category === selectedCategory);
            const matchTax = selectedTaxRate === 'all' || s.items.some(item => {
                const tier = taxTiers.find(t => t.id === selectedTaxRate);
                return tier ? item.taxRate === tier.rate : false;
            });
            return matchLoc && matchDate && matchCat && matchTax;
        });
    }, [sales, selectedLocation, startDate, endDate, selectedCategory, selectedTaxRate, taxTiers]);

    const totals = useMemo(() => {
        return filteredSales.reduce((acc, curr) => ({
            taxable: acc.taxable + curr.subtotal,
            tax: acc.tax + curr.totalTax,
            total: acc.total + curr.totalAmount
        }), { taxable: 0, tax: 0, total: 0 });
    }, [filteredSales]);

    // Helper to determine dominant Tax Category for a sale
    const getSaleTaxCategory = (sale: typeof sales[0]) => {
        // Find all unique tax categories in the sale items
        const categories = new Set<string>();
        sale.items.forEach(item => {
            const tier = taxTiers.find(t => t.rate === item.taxRate);
            if (tier?.categoryType) categories.add(tier.categoryType);
        });

        if (categories.size === 0) return 'Standard';
        if (categories.size === 1) return Array.from(categories)[0];
        return 'Mixed';
    };

    const handleDownloadCSV = () => {
        const headers = ["Invoice ID", "Date", "Location", "Customer", "Tax Category", "Taxable Amount", "Tax Amount", "Total Amount"];
        const rows = filteredSales.map(s => [
            s.id,
            s.date,
            locations.find(l => l.id === s.locationId)?.name || 'Unknown',
            s.customerName,
            getSaleTaxCategory(s),
            s.subtotal.toFixed(2),
            s.totalTax.toFixed(2),
            s.totalAmount.toFixed(2)
        ]);
        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Transaction_History_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAddTax = () => {
        if (!newTaxForm.name || !newTaxForm.rate) return;
        addTaxTier({
            id: `tax-${Date.now()}`,
            name: newTaxForm.name,
            categoryType: newTaxForm.category as any,
            rate: Number(newTaxForm.rate),
            cgst: Number(newTaxForm.cgst),
            sgst: Number(newTaxForm.sgst)
        });
        setNewTaxForm({ name: '', rate: '', cgst: '', sgst: '', category: 'Standard' });
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">GST Compliance & Reports</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage tax rates, filing data, and AI insights.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => setIsAnalystOpen(!isAnalystOpen)} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"><Bot size={18} /> <span>AI Analyst</span></button>
                    <button onClick={() => setTaxConfigOpen(true)} className="flex-1 md:flex-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"><Settings2 size={18} /> <span>Config Rates</span></button>
                </div>
            </div>

            {/* Tax Configuration Preview */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 flex items-center"><Table size={14} className="mr-2" /> Current Tax Configuration</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {taxTiers.map(t => (
                        <div key={t.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600 text-center">
                            <div className="font-bold text-slate-800 dark:text-white text-sm">{t.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{t.categoryType}</div>
                            <div className="text-xs font-mono bg-white dark:bg-slate-600 dark:text-slate-200 inline-block px-2 py-0.5 rounded mt-1 border dark:border-slate-500">{t.rate}%</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filters - Fixed Alignment */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Date Range</label>
                    <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 outline-none bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" value={dateRangeType} onChange={e => setDateRangeType(e.target.value as any)}>
                        <option value="thisMonth">This Month</option>
                        <option value="lastMonth">Last Month</option>
                        <option value="thisQuarter">This Quarter</option>
                        <option value="custom">Custom Range</option>
                    </select>
                </div>

                <div className="flex gap-2 w-full">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">From</label>
                        <div className="relative">
                            <input type="date" className={`w-full border rounded-lg p-2.5 outline-none text-sm dark:bg-slate-700 dark:text-white ${dateError ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-slate-300 dark:border-slate-600'}`} value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">To</label>
                        <div className="relative">
                            <input type="date" className={`w-full border rounded-lg p-2.5 outline-none text-sm dark:bg-slate-700 dark:text-white ${dateError ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-slate-300 dark:border-slate-600'}`} value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Tax Category</label>
                    <div className="relative">
                        <Filter className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
                        <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-2 p-2.5 outline-none bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" value={selectedTaxRate} onChange={e => setSelectedTaxRate(e.target.value)}>
                            <option value="all">All Tax Rates</option>
                            {taxTiers.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Location</label>
                    <div className="relative">
                        <Filter className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
                        <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-2 p-2.5 outline-none bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}>
                            <option value="all">All Locations</option>
                            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase mb-1">Total Revenue</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">₹{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase mb-1">Taxable Value</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">₹{totals.taxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-full -mr-8 -mt-8"></div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase mb-1">Total Tax Collected</p>
                    <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">₹{totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase mb-1">Invoice Count</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{filteredSales.length}</h3>
                </div>
            </div>

            {/* Transaction History Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><FileText size={18} className="text-indigo-600 dark:text-indigo-400" /> Transaction History</h3>
                    <button onClick={handleDownloadCSV} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-bold flex items-center gap-1 bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 px-3 py-1.5 rounded-lg shadow-sm">
                        <Download size={14} /> CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="p-4 whitespace-nowrap">Invoice ID</th>
                                <th className="p-4 whitespace-nowrap">Date</th>
                                <th className="p-4 whitespace-nowrap">Location</th>
                                <th className="p-4 whitespace-nowrap">Customer</th>
                                <th className="p-4 whitespace-nowrap">Tax Category</th>
                                <th className="p-4 text-right whitespace-nowrap">Taxable</th>
                                <th className="p-4 text-right whitespace-nowrap">Tax</th>
                                <th className="p-4 text-right whitespace-nowrap">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {filteredSales.map(s => {
                                const locName = locations.find(l => l.id === s.locationId)?.name;
                                const taxCat = getSaleTaxCategory(s);
                                return (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4 font-mono text-slate-500 dark:text-slate-500">{s.id}</td>
                                        <td className="p-4 whitespace-nowrap text-slate-800 dark:text-slate-300">{new Date(s.date).toLocaleDateString()}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-400">{locName}</td>
                                        <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{s.customerName}</td>
                                        <td className="p-4">
                                            <span className={`text-xs px-2 py-1 rounded-full border ${taxCat === 'Luxury' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' :
                                                taxCat === 'Essential' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' :
                                                    taxCat === 'Mixed' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                                                        'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                                                }`}>
                                                {taxCat}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap text-slate-800 dark:text-slate-200">₹{s.subtotal.toFixed(2)}</td>
                                        <td className="p-4 text-right font-medium text-red-600 dark:text-red-400 whitespace-nowrap">₹{s.totalTax.toFixed(2)}</td>
                                        <td className="p-4 text-right font-bold text-slate-800 dark:text-white whitespace-nowrap">₹{s.totalAmount.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tax Config Modal (kept mostly same, styling tweaks) */}
            {taxConfigOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setTaxConfigOpen(false); }}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95">
                        {/* ...modal content... */}
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center"><Settings2 size={20} className="mr-2 text-indigo-600 dark:text-indigo-400" /> Configure Tax Rates</h3>
                            <button onClick={() => setTaxConfigOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 mb-6">
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Add New Tax Rate</h4>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <input className="border border-slate-300 dark:border-slate-600 p-2 rounded-lg text-sm outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="Name (e.g. Gold Tax)" value={newTaxForm.name} onChange={e => setNewTaxForm({ ...newTaxForm, name: e.target.value })} />
                                <select className="border border-slate-300 dark:border-slate-600 p-2 rounded-lg text-sm outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newTaxForm.category} onChange={e => setNewTaxForm({ ...newTaxForm, category: e.target.value })}>
                                    <option>Essential</option><option>Standard</option><option>Luxury</option><option>Goods</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <input className="border border-slate-300 dark:border-slate-600 p-2 rounded-lg text-sm outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="Rate %" type="number" value={newTaxForm.rate} onChange={e => setNewTaxForm({ ...newTaxForm, rate: e.target.value })} />
                                <input className="border border-slate-300 dark:border-slate-600 p-2 rounded-lg text-sm outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="CGST %" type="number" value={newTaxForm.cgst} onChange={e => setNewTaxForm({ ...newTaxForm, cgst: e.target.value })} />
                                <input className="border border-slate-300 dark:border-slate-600 p-2 rounded-lg text-sm outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="SGST %" type="number" value={newTaxForm.sgst} onChange={e => setNewTaxForm({ ...newTaxForm, sgst: e.target.value })} />
                            </div>
                            <button onClick={handleAddTax} className="w-full bg-slate-800 dark:bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-900 dark:hover:bg-indigo-700 flex items-center justify-center"><Plus size={16} className="mr-1" /> Add Rate</button>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Existing Rates</h4>
                            {taxTiers.map(t => (
                                <div key={t.id} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white text-sm">{t.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{t.rate}% (C:{t.cgst}% S:{t.sgst}%) <span className="ml-1 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 dark:text-slate-300 rounded text-[10px]">{t.categoryType}</span></div>
                                    </div>
                                    <button onClick={() => deleteTaxTier(t.id)} className="text-slate-400 dark:text-slate-500 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
