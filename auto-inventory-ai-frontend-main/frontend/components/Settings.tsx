import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { User, Bell, Database, Save, Trash2, Plus, Shield, Mail, Phone, AlertTriangle } from 'lucide-react';
import { getUsers, createUser, deleteUser } from '../services/api';
import { UsersComp } from './Users';

export const Settings: React.FC = () => {
    const { locations, token } = useApp();
    const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'data' | 'notifications'>('profile');

    // Profile State
    const [profile, setProfile] = useState({ name: 'John Doe', email: 'admin@hanumantrader.com', role: 'Super Admin', phone: '+91 98765 43210' });



    // Notification State
    const [notifications, setNotifications] = useState({ email: true, sms: false, push: true, lowStock: true });



    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Profile updated successfully!");
    };

    const handleDataAction = (action: string) => {
        if (confirm(`Are you sure you want to ${action}? This is a simulation.`)) {
            alert(`${action} successful.`);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-bold text-slate-800">Settings & Configuration</h2>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar */}
                <div className="w-full lg:w-64 flex flex-col gap-2">
                    <button onClick={() => setActiveTab('profile')} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 font-medium transition-colors ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                        <User size={18} /> Profile
                    </button>
                    <button onClick={() => setActiveTab('users')} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 font-medium transition-colors ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                        <Shield size={18} /> User Management
                    </button>
                    <button onClick={() => setActiveTab('data')} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 font-medium transition-colors ${activeTab === 'data' ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                        <Database size={18} /> Data & Backup
                    </button>
                    <button onClick={() => setActiveTab('notifications')} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 font-medium transition-colors ${activeTab === 'notifications' ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                        <Bell size={18} /> Notifications
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[500px]">

                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <form onSubmit={handleSaveProfile} className="max-w-xl space-y-5 animate-in fade-in">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-2xl">JD</div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">{profile.name}</h3>
                                    <p className="text-slate-500 text-sm">{profile.role}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-3 top-3 text-slate-400" />
                                        <input className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                                        <input className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                                        <input className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <button type="submit" className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium">
                                    <Save size={18} /> Save Changes
                                </button>
                            </div>
                        </form>
                    )}

                    {/* USERS TAB */}
                    {activeTab === 'users' && (
                        <div className="animate-in fade-in">
                            <UsersComp />
                        </div>
                    )}

                    {/* DATA TAB */}
                    {activeTab === 'data' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                                <h4 className="font-bold text-slate-800 mb-2">Backup & Restore</h4>
                                <p className="text-sm text-slate-500 mb-4">Export all inventory, sales, and customer data to CSV/JSON format.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => handleDataAction('Export Data')} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100 font-medium text-sm">Export CSV</button>
                                    <button onClick={() => handleDataAction('Create Backup')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm">Create Backup</button>
                                </div>
                            </div>

                            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                                <h4 className="font-bold text-red-800 mb-2 flex items-center"><AlertTriangle size={18} className="mr-2" /> Danger Zone</h4>
                                <p className="text-sm text-red-600 mb-4">Irreversible actions. Please proceed with caution.</p>
                                <button onClick={() => handleDataAction('Reset System')} className="bg-white border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 font-medium text-sm">Reset System Data</button>
                            </div>
                        </div>
                    )}

                    {/* NOTIFICATIONS TAB */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-4 animate-in fade-in">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Notification Preferences</h3>
                            {[
                                { key: 'email', label: 'Email Alerts', desc: 'Receive daily summaries and critical alerts via email.' },
                                { key: 'push', label: 'Push Notifications', desc: 'Real-time updates for sales and low stock.' },
                                { key: 'lowStock', label: 'Low Stock Warnings', desc: 'Get notified when items drop below threshold.' },
                                { key: 'sms', label: 'SMS Updates', desc: 'Receive critical OTPs and alerts via SMS.' },
                            ].map((item: any) => (
                                <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                                    <div>
                                        <h4 className="font-medium text-slate-800">{item.label}</h4>
                                        <p className="text-xs text-slate-500">{item.desc}</p>
                                    </div>
                                    <div
                                        onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                                        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${notifications[item.key as keyof typeof notifications] ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};