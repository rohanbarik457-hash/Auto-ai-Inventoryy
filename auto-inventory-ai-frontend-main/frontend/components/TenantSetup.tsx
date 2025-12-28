import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User, MapPin, CheckCircle, ArrowRight, ShieldCheck, Mail, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';

export const TenantSetup: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, addLocation } = useApp();
    const { t } = useLanguage();

    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [successData, setSuccessData] = useState<any>(null);

    // Form Data
    const [warehouseName, setWarehouseName] = useState('');
    const [warehouseAddress, setWarehouseAddress] = useState('');
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    if (currentUser?.role !== 'SUPER_ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <ShieldCheck size={48} className="text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-slate-700">Access Restricted</h2>
                <p>Only Super Admins can provision new Sub-Warehouses.</p>
                <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300">
                    Go Back
                </button>
            </div>
        );
    }

    const generateTenantId = () => `T-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const generateLocationId = () => `LOC-${Date.now()}`;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Generate IDs
            const tenantId = generateTenantId();
            const locationId = generateLocationId();

            // 2. Create Location (Linked to Tenant)
            // Note: We need to use `api` service directly or ensure `addLocation` supports custom objects? 
            // `addLocation` in AppContext is wrapper around API. Let's use direct fetch/API for precise control if needed, 
            // but for now let's assume standard API calls. 
            // We'll simulate the chain here or use a specialized API endpoint if we had one.
            // Since we need to ensure the LOCATION has the tenant_id, we need to make sure the backend supports it.
            // (We added tenant_id to all schemas in Phase 1).

            // Actually, we must use `fetch` to pass `tenantId` explicitly because `addLocation` might rely on current user's context only (Phase 1 logic).
            // As Super Admin, we are creating for *another* tenant.

            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            // A. Create Location for New Tenant
            // We need a way to override the tenant_id in the backend save.
            // In Phase 1 `getTenantIdForSave`, if Super Admin AND body.tenantId, it uses body.tenantId. Perfect.

            const locRes = await fetch('http://localhost:5000/api/locations', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    id: locationId,
                    name: warehouseName,
                    address: warehouseAddress,
                    type: 'STORE', // Or WAREHOUSE
                    tenantId: tenantId // Explicit override
                })
            });
            if (!locRes.ok) throw new Error("Failed to create location");

            // B. Create Admin User for New Tenant
            const userRes = await fetch('http://localhost:5000/api/users', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name: adminName,
                    email: adminEmail,
                    password: adminPassword,
                    role: 'WAREHOUSE_OWNER',
                    locationId: locationId,
                    tenantId: tenantId, // Explicit override
                    permissions: ['dashboard', 'inventory', 'sales', 'customers', 'suppliers', 'settings', 'reports', 'trash']
                })
            });

            // Handle "Email already exists" separately to show nice error
            if (userRes.status === 400) {
                const errData = await userRes.json();
                if (errData.error === 'Email already registered') throw new Error("Email already used.");
            }
            if (!userRes.ok) throw new Error("Failed to create admin user");

            setSuccessData({ tenantId, locationId, warehouseName, adminEmail });
            setStep(3);

        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Setup Sub-Warehouse</h1>
            <p className="text-slate-500 mb-8">Provision a fresh, isolated workspace for a new branch.</p>

            {step === 1 && (
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-3 mb-6 text-indigo-600">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold">1</div>
                        <h2 className="text-xl font-bold">Warehouse Details</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Total/Branch Name</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={warehouseName}
                                    onChange={e => setWarehouseName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. Hanuman Traders - South Branch"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Physical Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={warehouseAddress}
                                    onChange={e => setWarehouseAddress(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. 123 Main St, Bangalore"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button
                                disabled={!warehouseName || !warehouseAddress}
                                onClick={() => setStep(2)}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                            >
                                Next <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 animate-in fade-in slide-in-from-right-4">
                    <div className="flex items-center gap-3 mb-6 text-indigo-600">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold">2</div>
                        <h2 className="text-xl font-bold">Branch Admin</h2>
                    </div>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Admin Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={adminName}
                                    onChange={e => setAdminName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. Ramesh Kumar"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email (Login ID)</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    value={adminEmail}
                                    onChange={e => setAdminEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="ramesh@hanumantraders.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    value={adminPassword}
                                    onChange={e => setAdminPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <div className="flex justify-between mt-8">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-all font-medium"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !adminName || !adminEmail || !adminPassword}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-md"
                            >
                                {loading ? 'Provisioning...' : 'Create Warehouse'} {loading ? null : <CheckCircle size={18} />}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {step === 3 && successData && (
                <div className="bg-white p-12 rounded-2xl shadow-xl border border-green-100 text-center animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={48} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Sub-Warehouse Active!</h2>
                    <p className="text-slate-500 mb-8">
                        The new environment has been provisioned successfully.
                    </p>

                    <div className="bg-slate-50 p-6 rounded-xl text-left max-w-md mx-auto space-y-3 mb-8 border border-slate-200">
                        <div className="flex justify-between">
                            <span className="text-slate-500 text-sm">Warehouse Name:</span>
                            <span className="font-medium text-slate-800">{successData.warehouseName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 text-sm">Tenant ID:</span>
                            <span className="font-mono text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-700">{successData.tenantId}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-3 mt-2">
                            <span className="text-slate-500 text-sm">Admin Login:</span>
                            <span className="font-bold text-indigo-700">{successData.adminEmail}</span>
                        </div>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button onClick={() => {
                            setStep(1);
                            setSuccessData(null);
                            setWarehouseName('');
                            setWarehouseAddress('');
                            setAdminName('');
                            setAdminEmail('');
                            setAdminPassword('');
                        }} className="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
                            Create Another
                        </button>
                        <button onClick={() => navigate('/inventory')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                            Go to Inventory
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
