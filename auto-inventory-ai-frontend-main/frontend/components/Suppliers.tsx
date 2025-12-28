
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Supplier } from '../types';
import { Search, MapPin, Phone, Mail, Star, Truck, Calendar, ArrowRight, Package, DollarSign, Plus, X, CheckCircle } from 'lucide-react';

export const Suppliers: React.FC = () => {
    const { suppliers, products, transfers, addSupplier } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    // Add Supplier State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
        name: '', contactPerson: '', phone: '', email: '', address: '', category: '', rating: 5, lastSupplyDate: new Date().toISOString().split('T')[0]
    });

    const handleAddSupplier = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSupplier.name) return;

        const supplier: Supplier = {
            id: `sup-${Date.now()}`,
            name: newSupplier.name || 'New Supplier',
            contactPerson: newSupplier.contactPerson || '',
            phone: newSupplier.phone || '',
            email: newSupplier.email || '',
            address: newSupplier.address || '',
            category: newSupplier.category || 'General',
            rating: 5,
            lastSupplyDate: new Date().toISOString(),
            paymentTerms: 'Net 30'
        };

        addSupplier(supplier);
        setIsAddModalOpen(false);
        setNewSupplier({ name: '', contactPerson: '', phone: '', email: '', address: '', category: '', rating: 5 });
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getSupplierProducts = (supplierName: string) => {
        return products.filter(p => p.supplier === supplierName);
    };

    const getSupplierStats = (supplierName: string) => {
        const prods = getSupplierProducts(supplierName);
        const totalStockValue = prods.reduce((acc, p) => acc + (p.cost * Object.values(p.stock).reduce((a, b) => a + b, 0)), 0);
        const productCount = prods.length;
        return { totalStockValue, productCount };
    };

    return (
        <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Supplier Management</h2>
                    <p className="text-sm text-slate-500">Track vendor performance and details</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all font-medium">
                    <Plus size={18} /> Add Supplier
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
                {/* List Panel */}
                <div className={`w-full lg:w-1/3 bg-white rounded-xl border shadow-sm flex flex-col ${selectedSupplier ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-4 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search Suppliers..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredSuppliers.map(s => (
                            <div
                                key={s.id}
                                onClick={() => setSelectedSupplier(s)}
                                className={`p-4 rounded-lg cursor-pointer transition-all border ${selectedSupplier?.id === s.id ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-slate-800">{s.name}</h3>
                                    <div className="flex items-center bg-yellow-100 px-1.5 py-0.5 rounded text-xs font-bold text-yellow-700">
                                        <Star size={10} className="mr-1 fill-yellow-700" /> {s.rating}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mb-2">{s.category} • {s.address}</p>
                                <div className="flex items-center text-xs text-slate-400 gap-2">
                                    <span className="flex items-center"><Phone size={10} className="mr-1" /> {s.phone}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Details Panel */}
                <div className={`w-full lg:w-2/3 bg-white rounded-xl border shadow-sm flex-col overflow-hidden ${selectedSupplier ? 'flex' : 'hidden lg:flex'}`}>
                    {selectedSupplier ? (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4">
                            {/* Header */}
                            <div className="p-6 border-b bg-slate-50 flex justify-between items-start">
                                <div>
                                    <button onClick={() => setSelectedSupplier(null)} className="lg:hidden text-indigo-600 text-sm font-medium mb-2 flex items-center gap-1"><ArrowRight size={14} className="rotate-180" /> Back to List</button>
                                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                        <Truck size={24} className="text-indigo-600" /> {selectedSupplier.name}
                                    </h2>
                                    <p className="text-slate-500 mt-1 flex items-center gap-2">
                                        <MapPin size={14} /> {selectedSupplier.address}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-slate-700">Contact Person</div>
                                    <div className="text-slate-600">{selectedSupplier.contactPerson}</div>
                                    <div className="flex gap-3 mt-2 justify-end">
                                        <a href={`tel:${selectedSupplier.phone}`} className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200"><Phone size={16} /></a>
                                        <a href={`mailto:${selectedSupplier.email}`} className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"><Mail size={16} /></a>
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 p-6 border-b">
                                <div className="bg-slate-50 p-4 rounded-lg text-center">
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Products Supplied</div>
                                    <div className="text-xl font-bold text-slate-800">{getSupplierStats(selectedSupplier.name).productCount}</div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg text-center">
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Current Stock Value</div>
                                    <div className="text-xl font-bold text-indigo-600">₹{getSupplierStats(selectedSupplier.name).totalStockValue.toLocaleString()}</div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg text-center">
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Last Supply</div>
                                    <div className="text-xl font-bold text-slate-800">{new Date(selectedSupplier.lastSupplyDate).toLocaleDateString()}</div>
                                </div>
                            </div>

                            {/* Products List */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Package size={18} /> Product Catalog</h3>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="p-3">Product Name</th>
                                            <th className="p-3">SKU</th>
                                            <th className="p-3 text-right">Cost Price</th>
                                            <th className="p-3 text-center">Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getSupplierProducts(selectedSupplier.name).map(p => (
                                            <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                                                <td className="p-3 font-medium text-slate-700">{p.name}</td>
                                                <td className="p-3 font-mono text-xs text-slate-500">{p.sku}</td>
                                                <td className="p-3 text-right">₹{p.cost}</td>
                                                <td className="p-3 text-center">{Object.values(p.stock).reduce((a, b) => a + b, 0)}</td>
                                            </tr>
                                        ))}
                                        {getSupplierProducts(selectedSupplier.name).length === 0 && (
                                            <tr><td colSpan={4} className="p-4 text-center text-slate-400">No products found linked to this supplier.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Truck size={64} className="mb-4 opacity-20" />
                            <p>Select a supplier to view details</p>
                        </div>
                    )}
                </div>
            </div>


            {
                isAddModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}>
                        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Truck size={22} className="text-indigo-600" /> Add New Supplier</h3>
                                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleAddSupplier} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Name <span className="text-red-500">*</span></label>
                                    <input required className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Metro Traders" value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Person</label>
                                        <input className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Manager Name" value={newSupplier.contactPerson} onChange={e => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                                        <input className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Grains" value={newSupplier.category} onChange={e => setNewSupplier({ ...newSupplier, category: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label>
                                        <input className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="+91..." value={newSupplier.phone} onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                        <input type="email" className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="contact@..." value={newSupplier.email} onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address</label>
                                    <textarea className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none" placeholder="Full Billing Address" value={newSupplier.address} onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })}></textarea>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2.5 border rounded-lg hover:bg-slate-50 font-medium text-slate-600">Cancel</button>
                                    <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center justify-center gap-2"><CheckCircle size={18} /> Save Supplier</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
