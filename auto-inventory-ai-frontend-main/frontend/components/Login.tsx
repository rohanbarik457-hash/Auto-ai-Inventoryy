import React, { useState } from 'react';
import { login } from '../services/api';
import { Package, User, Building2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
    onLogin: (token: string, user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { } = useApp();
    const navigate = useNavigate();

    const handleDemoLogin = (role: string) => {
        const demoCreds: { [key: string]: { e: string, p: string } } = {
            'Admin': { e: 'admin@hanuman.com', p: 'password123' },
            'Tenant': { e: 'newadmin@branch1.com', p: 'password123' } // Placeholder for user to manually create/use
        };
        const creds = demoCreds[role];
        if (creds) {
            setEmail(creds.e);
            setPassword(creds.p);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await login(email, password);
            onLogin(data.token, data.user);
            navigate('/');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                        <Package className="text-white" size={28} />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Welcome Back</h2>
                <p className="text-center text-slate-500 mb-8">Sign in to your inventory dashboard</p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            placeholder="admin@hanuman.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-center text-xs text-slate-400 mb-4 uppercase font-bold tracking-wider">Quick Demo Login</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleDemoLogin('Admin')}
                            className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-200 transition-all text-sm font-medium"
                        >
                            <User size={16} /> Super Admin
                        </button>
                        <button
                            onClick={() => handleDemoLogin('Tenant')}
                            className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-purple-100 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-200 transition-all text-sm font-medium"
                        >
                            <Building2 size={16} /> Sub-Warehouse
                        </button>
                    </div>
                    <p className="text-xs text-center mt-3 text-slate-400">NOTE: Use the Provisioning Tool to create a real Sub-Warehouse account first.</p>
                </div>
            </div>
        </div>
    );
};
