import React, { useEffect, useState } from 'react';
import { getTrash, restoreItem } from '../services/api';
import { useApp } from '../context/AppContext';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';

export const Trash: React.FC = () => {
    const { token } = useApp();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchTrash();
    }, [token]);

    const fetchTrash = async () => {
        try {
            setLoading(true);
            const data = await getTrash(token);
            setItems(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (id: string) => {
        try {
            setActionLoading(id);
            await restoreItem(token, id);
            // Remove from list
            setItems(prev => prev.filter(i => i.id !== id));
        } catch (err: any) {
            alert(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const getDaysLeft = (deletedAt: string) => {
        const deletedDate = new Date(deletedAt);
        const expiryDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading trash...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <Trash2 className="w-8 h-8 text-red-500" />
                    Trash / Archive
                </h1>
                <p className="text-gray-600 mt-2">
                    Items are automatically permanently deleted after 30 days.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {items.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-100">
                    <Trash2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Trash is empty</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm uppercase tracking-wider">
                                <th className="p-4 font-semibold">Item</th>
                                <th className="p-4 font-semibold">Type</th>
                                <th className="p-4 font-semibold">Deleted By</th>
                                <th className="p-4 font-semibold">Deleted On</th>
                                <th className="p-4 font-semibold">Auto-Delete In</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-medium text-gray-900">
                                        {item.document?.name || item.document?.email || item.originalId}
                                    </td>
                                    <td className="p-4 text-gray-600">
                                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                                            {item.collectionName}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-600">{item.deletedBy || 'Unknown'}</td>
                                    <td className="p-4 text-gray-600 text-sm">
                                        {new Date(item.deletedAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <span className={`font-medium ${getDaysLeft(item.deletedAt) < 5 ? 'text-red-500' : 'text-green-600'}`}>
                                            {getDaysLeft(item.deletedAt)} Days
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleRestore(item.id)}
                                            disabled={actionLoading === item.id}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium disabled:opacity-50"
                                        >
                                            {actionLoading === item.id ? (
                                                'Restoring...'
                                            ) : (
                                                <>
                                                    <RotateCcw className="w-4 h-4" /> Restore
                                                </>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
