
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import { User, Plus, Search, Edit2, Gift, Phone, Mail, MapPin, FileText, X, History, TrendingUp, Award } from 'lucide-react';

export const Customers: React.FC = () => {
  const { customers, addCustomer, updateCustomer, sales } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewHistoryCustomer, setViewHistoryCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState<Partial<Customer>>({});

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleOpenModal = (c?: Customer) => {
    setEditingCustomer(c || null);
    setFormData(c || { name: '', phone: '', email: '', gstNumber: '', address: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer && formData.name && formData.phone) {
      updateCustomer({ ...editingCustomer, ...formData as Customer });
    } else if (formData.name && formData.phone) {
      addCustomer({
        id: `cust-${Date.now()}`,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        gstNumber: formData.gstNumber,
        address: formData.address,
        loyaltyPoints: 0,
        totalPurchases: 0
      });
    }
    setIsModalOpen(false);
  };

  const getHistory = (id: string) => sales.filter(s => s.customerId === id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Customers</h2>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"><Plus size={18} /><span>Add Customer</span></button>
      </div>

      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 py-2 border rounded-lg outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-4">Name / Contact</th>
              <th className="px-6 py-4">Details (GST/Email)</th>
              <th className="px-6 py-4">Total Spent</th>
              <th className="px-6 py-4">Loyalty</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCustomers.map(c => (
              <tr key={c.id} onClick={() => setViewHistoryCustomer(c)} className="hover:bg-slate-50 cursor-pointer group">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-800">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.phone}</div>
                </td>
                <td className="px-6 py-4 text-xs text-slate-600">
                  <div>{c.email || '-'}</div>
                  <div className="text-indigo-600">{c.gstNumber || 'Unregistered'}</div>
                </td>
                <td className="px-6 py-4 font-bold">₹{c.totalPurchases.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs">{c.loyaltyPoints} Pts</span>
                  <span className="ml-2 text-xs text-green-600 font-medium">(₹{c.loyaltyPoints} Off)</span>
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button onClick={(e) => { e.stopPropagation(); setViewHistoryCustomer(c); }} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="History"><History size={16} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleOpenModal(c); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Edit"><Edit2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold mb-4">{editingCustomer ? 'Edit' : 'Add'} Customer</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input className="w-full border p-2 rounded" placeholder="Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              <input className="w-full border p-2 rounded" placeholder="Phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
              <input className="w-full border p-2 rounded" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              <input className="w-full border p-2 rounded" placeholder="GST Number" value={formData.gstNumber} onChange={e => setFormData({ ...formData, gstNumber: e.target.value })} />
              <input className="w-full border p-2 rounded" placeholder="Address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 border py-2 rounded">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {viewHistoryCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setViewHistoryCustomer(null); }}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{viewHistoryCustomer.name}</h3>
              <button onClick={() => setViewHistoryCustomer(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            {/* Summary Card */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 flex justify-around">
              <div className="text-center">
                <div className="flex justify-center mb-1 text-indigo-500"><Award size={24} /></div>
                <div className="text-2xl font-bold text-slate-800">{viewHistoryCustomer.loyaltyPoints}</div>
                <div className="text-xs text-slate-500 font-medium uppercase">Total Loyalty Points</div>
                <div className="text-xs text-green-600 font-bold mt-1">(= ₹{viewHistoryCustomer.loyaltyPoints} Off)</div>
              </div>
              <div className="w-px bg-slate-200"></div>
              <div className="text-center">
                <div className="flex justify-center mb-1 text-emerald-500"><TrendingUp size={24} /></div>
                <div className="text-2xl font-bold text-slate-800">₹{viewHistoryCustomer.totalPurchases.toLocaleString()}</div>
                <div className="text-xs text-slate-500 font-medium uppercase">Total Spent</div>
              </div>
              <div className="w-px bg-slate-200"></div>
              <div className="text-center">
                <div className="flex justify-center mb-1 text-blue-500"><FileText size={24} /></div>
                <div className="text-2xl font-bold text-slate-800">{getHistory(viewHistoryCustomer.id).length}</div>
                <div className="text-xs text-slate-500 font-medium uppercase">Total Orders</div>
              </div>
            </div>

            <h4 className="font-bold text-slate-700 mb-3 text-sm">Transaction History</h4>
            <div className="space-y-2">
              {getHistory(viewHistoryCustomer.id).map(s => (
                <div key={s.id} className="border p-3 rounded-lg flex justify-between items-center text-sm hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="font-bold text-indigo-700 font-mono">{s.id}</div>
                    <div className="text-xs text-slate-500">{new Date(s.date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-xs bg-slate-100 px-2 py-1 rounded">{s.items.length} items</div>
                  <div className="text-right">
                    <div className="font-bold text-slate-800">₹{s.totalAmount.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400 uppercase">{s.paymentMethod}</div>
                  </div>
                </div>
              ))}
              {getHistory(viewHistoryCustomer.id).length === 0 && <p className="text-slate-500 text-center py-4 italic">No purchases found for this customer.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
