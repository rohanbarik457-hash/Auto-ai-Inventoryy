import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 scale-100">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                            {variant === 'danger' ? <Trash2 size={24} /> : <AlertTriangle size={24} />}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h3>
                        </div>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className={`px-5 py-2.5 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transition-all transform active:scale-95 ${variant === 'danger'
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                                : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                                }`}
                        >
                            {variant === 'danger' ? 'Yes, Delete It' : 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
