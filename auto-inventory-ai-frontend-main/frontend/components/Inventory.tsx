
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Search, MapPin, ArrowRightLeft, Filter, Plus, History, Edit, Box, X, IndianRupee, Skull, Truck, Tag, AlertTriangle, Calendar, CheckCircle, Info, MoreHorizontal, CheckSquare, Camera, Trash2, ChevronDown, Check, ScanLine, Clock, Wand2, Zap, FileText, Bell, Download, Upload } from 'lucide-react';
import { Product } from '../types';
import { identifyProductFromImage } from '../services/geminiService';
import { useLanguage } from '../context/LanguageContext';
import { isDeadStockProduct, isLocationLowStock, isLowStock, isExpiringSoon } from '../services/AnalyticsEngine';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useClickOutside } from '../hooks/useClickOutside';

// --- Constants ---
const HSN_MAPPING: Record<string, string> = {
    'Grains': '1001',
    'Pulses': '0713',
    'Spices': '0910',
    'Oil': '1501',
    'Dairy': '0401',
    'Snacks': '1905',
    'Beverages': '2202',
    'Personal Care': '3304',
    'Cleaning': '3402',
    'Electronics': '8500',
    'Vegetables': '0709',
    'Fruits': '0800',
    'Stationery': '4820'
};

export const Inventory: React.FC = () => {
    const { products, locations, transferStock, addProduct, updateProduct, deleteProducts, transfers, addNotification } = useApp();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'low_stock' | 'expiring' | 'dead_stock' | 'history'>('all');
    const [selectedLocation, setSelectedLocation] = useState<string>('all');
    const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortOption, setSortOption] = useState<'name' | 'stockAsc' | 'stockDesc' | 'valueDesc'>('name');
    const [expiryFilter, setExpiryFilter] = useState<'all' | 'soon' | 'expired' | 'safe'>('all'); // Kept for compatibility, though hidden from UI

    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [showDataTools, setShowDataTools] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // Dropdown Refs
    const bulkActionsRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const dataToolsRef = useRef<HTMLDivElement>(null);

    useClickOutside(bulkActionsRef, () => setShowBulkActions(false));
    useClickOutside(notificationsRef, () => setShowNotifications(false));
    useClickOutside(dataToolsRef, () => setShowDataTools(false));

    // Transfer State
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferStep, setTransferStep] = useState<'input' | 'confirm'>('input');
    const [transferData, setTransferData] = useState({ productId: '', isBulk: false, fromLoc: '', toLoc: '', qty: 0, notes: '' });
    const [transferStatus, setTransferStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [transferError, setTransferError] = useState('');

    // Product Modal State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productForm, setProductForm] = useState<Partial<Product> & { stockInputs?: Record<string, number>, minStockInputs?: Record<string, number> }>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Global Check State
    const [isGlobalCheckOpen, setIsGlobalCheckOpen] = useState(false);
    const [globalStockData, setGlobalStockData] = useState<any[]>([]);
    const [checkingSku, setCheckingSku] = useState('');
    const [checkLoading, setCheckLoading] = useState(false);

    const handleGlobalCheck = async (product: Product) => {
        if (!product.sku) {
            alert("Product missing SKU");
            return;
        }
        setCheckingSku(product.sku);
        setIsGlobalCheckOpen(true);
        setCheckLoading(true);
        setGlobalStockData([]);

        try {
            const token = localStorage.getItem('token') || '';
            const { checkGlobalStock } = await import('../services/api'); // Dynamic import to avoid circular dep issues if any, or just easy use
            const data = await checkGlobalStock(token, product.sku);
            setGlobalStockData(data);
        } catch (err) {
            alert("Failed to check network stock");
        } finally {
            setCheckLoading(false);
        }
    };

    const exportData = (format: 'csv' | 'xlsx' | 'json' | 'xml') => {
        const dataToExport = products;
        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `inventory_${timestamp}`;

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
            saveAs(blob, `${fileName}.json`);
        } else if (format === 'xml') {
            const xmlContent = dataToExport.map(p => `
    <product>
        <id>${p.id}</id>
        <name>${p.name}</name>
        <sku>${p.sku}</sku>
        <category>${p.category}</category>
        <price>${p.price}</price>
        <cost>${p.cost}</cost>
        <supplier>${p.supplier || ''}</supplier>
        <status>${p.status}</status>
        <stock>${JSON.stringify(p.stock)}</stock>
        <minStockLevel>${p.minStockLevel}</minStockLevel>
        <expiryDate>${p.expiryDate || ''}</expiryDate>
        <barcode>${p.barcode || ''}</barcode>
    </product>`).join('\n');
            const blob = new Blob([`<inventory>\n${xmlContent}\n</inventory>`], { type: 'application/xml' });
            saveAs(blob, `${fileName}.xml`);
        } else {
            // For CSV/XLSX, flatten the object to ensure all data is visible
            const flattenProduct = (p: Product) => {
                const flat: any = {
                    ...p, // Spread all primitive props
                    TotalStock: Object.values(p.stock).reduce((a: number, b: any) => a + Number(b), 0),
                    Stock_Details: JSON.stringify(p.stock), // Keep raw object as string just in case
                };

                // Add individual location columns for better readability if desired, 
                // but "Keeping all data" usually implies raw fields. 
                // Let's add explicit columns for each location present in the system
                locations.forEach(loc => {
                    flat[`Stock_${loc.name}`] = p.stock[loc.id] || 0;
                });

                // Remove complex objects meant for UI/Logic if they clutter, but user said "keep all data"
                delete flat.minStockThresholds; // Maybe keep this if consistent
                return flat;
            };

            const ws = XLSX.utils.json_to_sheet(dataToExport.map(flattenProduct));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Inventory");
            if (format === 'csv') {
                XLSX.writeFile(wb, `${fileName}.csv`);
            } else {
                XLSX.writeFile(wb, `${fileName}.xlsx`);
            }
        }
        addNotification('SUCCESS', `Exported as ${format.toUpperCase()}`);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            let updatedCount = 0;
            data.forEach((row: any) => {
                if (row.ID) {
                    const existing = products.find(p => p.id === row.ID);
                    if (existing) {
                        updateProduct({
                            ...existing,
                            name: row.Name || existing.name,
                            price: row.Price || existing.price,
                            cost: row.Cost || existing.cost
                        });
                        updatedCount++;
                    }
                }
            });
            if (updatedCount > 0) addNotification('SUCCESS', `Updated ${updatedCount} products from import.`);
            else addNotification('INFO', 'No matching products found to update. Ensure "ID" column exists.');
        };
        reader.readAsBinaryString(file);
    };

    // Auto-Generate SKU Effect (Moved logic here)
    useEffect(() => {
        if (isProductModalOpen && !editingProduct && productForm.name && productForm.category && (!productForm.sku || productForm.sku.includes('GEN-'))) {
            const categoryPart = (productForm.category || 'GEN').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
            const namePart = (productForm.name || 'PRD').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
            const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            setProductForm(prev => ({ ...prev, sku: `${categoryPart}-${namePart}-${randomPart}` }));
        }
    }, [productForm.name, productForm.category, isProductModalOpen, editingProduct]);

    // --- Auto-Populate HSN Code ---
    useEffect(() => {
        if (!isProductModalOpen || editingProduct) return; // Don't overwrite when editing existing product unless explicitly changed? actually safe to skip

        // If user hasn't manually entered a special HSN, try to auto-fill based on category
        // simple logic: if category exists in map, use it.
        const mappedHSN = HSN_MAPPING[productForm.category];
        if (mappedHSN) {
            setProductForm(prev => ({ ...prev, hsnCode: mappedHSN }));
        }
    }, [productForm.category, isProductModalOpen]);

    // Local state for "Add New" inputs
    const [isNewCategory, setIsNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isNewSupplier, setIsNewSupplier] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');

    // Bulk Edit Modal State
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
    const [bulkForm, setBulkForm] = useState<{ supplier?: string, status?: string }>({ supplier: '', status: '' });

    const [historyProductId, setHistoryProductId] = useState<string | null>(null);
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

    // Data Tools State
    // Data Tools State moved to top
    // Click outside to close Data Tools handled by hook at top

    // --- Helper Functions ---

    const generateID = (prefix: string) => {
        return `${prefix}-${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}`;
    };

    const getDisplayStock = (product: Product, locId: string) =>
        locId === 'all' ? Object.values(product.stock).reduce((a: number, b: number) => a + b, 0) : product.stock[locId] || 0;

    // Unified Low Stock Check using Analytics Engine
    // Note: Local override not needed anymore as we use the engine's consistent logic
    // But we might need a helper for the Table row rendering if we want to pass specific location
    const checkIsLowStock = (product: Product, locId: string) => {
        if (locId === 'all') return isLowStock(product);
        return isLocationLowStock(product, locId);
    };



    const handleDeadStockOptimize = (product: Product) => {
        const sourceLoc = locations.find(l => (product.stock[l.id] || 0) > 0);

        if (!sourceLoc) {
            alert("No stock available to move.");
            return;
        }

        // Try to find a DIFFERENT location for transfer
        const targetLoc = locations.find(l => l.id !== sourceLoc.id && l.type === 'STORE' && (product.stock[l.id] || 0) < 10);

        if (targetLoc) {
            if (confirm(`Dead Stock Optimization:\n\nMove stock from ${sourceLoc.name} to ${targetLoc.name} with a 20% discount tag?\n\nThis will distribute inventory to stores with lower stock.`)) {
                // Perform transfer
                const qty = Math.min(10, product.stock[sourceLoc.id]);
                transferStock(product.id, sourceLoc.id, targetLoc.id, qty, "Dead Stock Optimization");

                const specialTxnId = generateID('CLR-MOV');
                addNotification('INFO', 'Dead Stock Transfer Initiated', `Txn: ${specialTxnId}. Moving ${qty} units to ${targetLoc.name}.`);
            }
        } else {
            // If no other location, suggest a Clearance Sale at the CURRENT location
            if (confirm(`Dead Stock Optimization:\n\nRun a "Clearance Sale" for this item at ${sourceLoc.name}?\n\nThis will apply a 30% discount marker to flush out old stock.`)) {
                // Logic to mark as 'Clearance' (mocked as an alert/notification for now)
                const specialTxnId = generateID('CLR-SALE');
                addNotification('SUCCESS', 'Clearance Sale Active', `Txn: ${specialTxnId}. ${product.name} marked as 30% OFF at ${sourceLoc.name}.`);
            }
        }
    };

    // --- Metrics ---

    const metrics = useMemo(() => {
        const totalItems = products.reduce((acc, p) => acc + getDisplayStock(p, 'all'), 0);
        const totalValue = products.reduce((acc, p) => acc + (getDisplayStock(p, 'all') * p.cost), 0);

        const deadStockCount = products.filter(isDeadStockProduct).length;
        const lowStockCount = products.filter(p => checkIsLowStock(p, selectedLocation)).length;

        return { totalItems, totalValue, deadStockCount, lowStockCount };
    }, [products, selectedLocation]);

    // --- Filtering & Sorting ---

    const suppliers = useMemo(() => Array.from(new Set(products.map(p => p.supplier).filter(Boolean) as string[])), [products]);
    const categories = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[])), [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            if (activeTab === 'low_stock' && !checkIsLowStock(p, selectedLocation)) return false;
            if (activeTab === 'dead_stock' && !isDeadStockProduct(p)) return false;
            if (activeTab === 'expiring') {
                if (!isExpiringSoon(p)) return false;
            }

            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = p.name.toLowerCase().includes(searchLower) ||
                p.sku?.toLowerCase().includes(searchLower) ||
                p.barcode?.includes(searchTerm);

            if (!matchesSearch) return false;
            if (selectedSupplier !== 'all' && p.supplier !== selectedSupplier) return false;
            if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
            // if (selectedLocation !== 'all' && (p.stock[selectedLocation] || 0) === 0) return false; // Fixed: Don't hide out-of-stock items

            // Expiry Filter
            if (expiryFilter !== 'all') {
                if (!p.expiryDate) return expiryFilter === 'safe';
                const today = new Date();
                const expDate = new Date(p.expiryDate);
                const diffDays = (expDate.getTime() - today.getTime()) / (1000 * 3600 * 24);

                if (expiryFilter === 'expired' && diffDays < 0) return true;
                if (expiryFilter === 'soon' && diffDays >= 0 && diffDays <= 30) return true;
                if (expiryFilter === 'safe' && diffDays > 30) return true;
                return false;
            }

            return true;
        }).sort((a, b) => {
            const stockA = getDisplayStock(a, selectedLocation);
            const stockB = getDisplayStock(b, selectedLocation);
            const valueA = stockA * a.cost;
            const valueB = stockB * b.cost;

            switch (sortOption) {
                case 'stockAsc': return stockA - stockB;
                case 'stockDesc': return stockB - stockA;
                case 'valueDesc': return valueB - valueA;
                case 'name': default: return a.name.localeCompare(b.name);
            }
        });
    }, [products, searchTerm, selectedSupplier, selectedLocation, selectedCategory, sortOption, expiryFilter, activeTab]);

    // --- Handlers ---

    const handleBulkTransfer = () => {
        if (selectedProductIds.size === 0) return;
        setTransferData({ productId: '', isBulk: true, fromLoc: locations[0].id, toLoc: locations[1]?.id || '', qty: 0, notes: '' });
        setTransferStep('input');
        setIsTransferModalOpen(true);
        setShowBulkActions(false);
    };

    const handleBulkDelete = () => {
        if (confirm(`Are you sure you want to delete ${selectedProductIds.size} products?`)) {
            deleteProducts(Array.from(selectedProductIds));
            setSelectedProductIds(new Set());
            setShowBulkActions(false);
        }
    };

    const handleBulkUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        Array.from(selectedProductIds).forEach(id => {
            const p = products.find(prod => prod.id === id);
            if (p) {
                const updated = { ...p };
                if (bulkForm.supplier) updated.supplier = bulkForm.supplier;
                if (bulkForm.status) updated.status = bulkForm.status as any;
                updateProduct(updated);
            }
        });
        setIsBulkEditModalOpen(false);
        setSelectedProductIds(new Set());
        setBulkForm({ supplier: '', status: '' });
    };

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (transferStep === 'input') {
            if (transferData.fromLoc === transferData.toLoc) {
                alert("Source and Destination cannot be the same.");
                return;
            }
            if (!transferData.qty || transferData.qty <= 0) {
                alert("Please enter a valid quantity.");
                return;
            }

            // Check for single product stock
            if (!transferData.isBulk) {
                const p = products.find(prod => prod.id === transferData.productId);
                const available = p?.stock[transferData.fromLoc] || 0;
                if (available < transferData.qty) {
                    // We don't block here anymore, we proceed to allow the system to log a FAILED transaction
                    if (!confirm(`Warning: Insufficient stock. Available: ${available}. Proceeding will result in a failed transaction log. Continue?`)) {
                        return;
                    }
                }
            }
            setTransferStep('confirm');
        } else {
            try {
                if (!transferData.isBulk) {
                    transferStock(transferData.productId, transferData.fromLoc, transferData.toLoc, Number(transferData.qty), transferData.notes);
                } else {
                    Array.from(selectedProductIds).forEach(id => {
                        transferStock(id, transferData.fromLoc, transferData.toLoc, Number(transferData.qty), transferData.notes);
                    });
                    setSelectedProductIds(new Set());
                }
                setTransferStatus('success');
                setTimeout(() => {
                    setTransferStatus('idle');
                    setIsTransferModalOpen(false);
                    setTransferStep('input');
                }, 1500);
            } catch (error) {
                setTransferStatus('error');
                setTransferError("Transfer failed due to system error.");
            }
        }
    };

    const openEditModal = (p: Product) => {
        setEditingProduct(p);
        setProductForm({
            ...p,
            stockInputs: { ...p.stock },
            minStockInputs: { ...p.minStockThresholds }
        });
        setIsProductModalOpen(true);
    };

    const autoGenerateSKU = () => {
        const categoryPart = (productForm.category || 'GEN').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
        const namePart = (productForm.name || 'PRD').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
        const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        setProductForm(prev => ({ ...prev, sku: `${categoryPart}-${namePart}-${randomPart}` }));
    };

    const openAddModal = () => {
        setEditingProduct(null);
        setProductForm({
            name: '', sku: '', category: '', price: 0, cost: 0, taxRate: 18, stockInputs: {}, minStockInputs: {}, status: 'Active', supplier: '', barcode: '', unit: 'pcs'
        });
        setIsNewCategory(false);
        setNewCategoryName('');
        setIsNewSupplier(false);
        setNewSupplierName('');
        setIsProductModalOpen(true);
    };

    const handleProductSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const pData: Product = {
            id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
            name: productForm.name || 'New Product',
            sku: productForm.sku || '',
            category: (isNewCategory && newCategoryName) ? newCategoryName : (productForm.category || 'General'),
            price: Number(productForm.price),
            cost: Number(productForm.cost),
            hsnCode: productForm.hsnCode || '0000',
            taxRate: Number(productForm.taxRate),
            minStockLevel: Number(productForm.minStockLevel || 10),
            minStockThresholds: productForm.minStockInputs || {},
            leadTimeDays: 7,
            stock: productForm.stockInputs || {},
            supplier: (isNewSupplier && newSupplierName) ? newSupplierName : productForm.supplier,
            status: productForm.status as any || 'Active',
            barcode: productForm.barcode,
            expiryDate: productForm.expiryDate,
            unit: productForm.unit || 'pcs'
        };

        // Initialize stock for all locations if missing
        locations.forEach(l => { if (pData.stock[l.id] === undefined) pData.stock[l.id] = 0; });

        editingProduct ? updateProduct(pData) : addProduct(pData);
        setIsProductModalOpen(false);
    };

    // --- RENDER HELPERS ---

    // Calculate alerts for the dropdown
    const alertItems = useMemo(() => {
        const expiring = products.filter(p => p.expiryDate && (new Date(p.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24) <= 30);
        const lowStock = products.filter(p => {
            const currentStock = Object.values(p.stock).reduce((a: number, b: number) => a + b, 0);
            const threshold = p.minStockLevel || 10;
            return currentStock < threshold;
        });
        const deadStock = products.filter(isDeadStockProduct);

        return { expiring, lowStock, deadStock };
    }, [products, locations]); // Added locations dependency for isDeadStock implicit dependency if needed, though isDeadStock uses getDisplayStock('all')



    return (
        <div className="space-y-6 animate-in fade-in">

            {/* Network Stock Modal */}
            {isGlobalCheckOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={(e) => { if (e.target === e.currentTarget) setIsGlobalCheckOpen(false); }}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Box className="text-blue-600" /> Network Stock Check
                                </h3>
                                <p className="text-sm text-slate-500">Checking availability across all branches</p>
                            </div>
                            <button onClick={() => setIsGlobalCheckOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target SKU:</span>
                                <span className="font-mono text-sm font-bold text-indigo-700">{checkingSku}</span>
                            </div>

                            {checkLoading ? (
                                <div className="py-8 text-center text-slate-500">
                                    <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                                    <p>Scanning network...</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {globalStockData.length === 0 ? (
                                        <div className="text-center py-6 text-slate-400">
                                            <p>No stock found in other branches.</p>
                                        </div>
                                    ) : (
                                        globalStockData.map((item, idx) => (
                                            <div key={idx} className={`p-4 rounded-xl border flex justify-between items-center ${item.isLocal ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{item.locationName}</h4>
                                                    <div className="flex flex-col gap-1 mt-1">
                                                        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full w-fit ${item.isLocal ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {item.isLocal ? 'Your Warehouse' : 'External Branch'}
                                                        </span>
                                                        {!item.isLocal && (
                                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                                <span className="flex items-center gap-1"><MapPin size={12} /> {item.distance}</span>
                                                                <span className="flex items-center gap-1"><Clock size={12} /> {item.eta}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-slate-800">{item.quantity}</p>
                                                    <p className="text-xs text-slate-500">Units Available</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button onClick={() => setIsGlobalCheckOpen(false)} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t('inv.title')}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('inv.subtitle')}</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto relative" ref={notificationsRef}>
                    <button onClick={() => setShowNotifications(!showNotifications)} className={`relative p-2.5 rounded-lg border transition-colors ${showNotifications ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-400' : 'border-slate-300 hover:bg-slate-50 text-slate-600 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-slate-300'}`}>
                        <Bell size={20} />
                        {(alertItems.lowStock.length > 0 || alertItems.expiring.length > 0 || alertItems.deadStock.length > 0) && (
                            <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-slate-800"></span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in zoom-in-95 origin-top-right">
                            <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 dark:text-white text-sm">Notifications</h3>
                                <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={16} /></button>
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {alertItems.expiring.length === 0 && alertItems.lowStock.length === 0 && alertItems.deadStock.length === 0 && (
                                    <div className="p-8 text-center text-slate-400 text-sm">
                                        <CheckCircle size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>All items are in good standing.</p>
                                    </div>
                                )}

                                {/* Expiring Section */}
                                {alertItems.expiring.length > 0 && (
                                    <div className="p-0">
                                        <div className="px-4 py-2 bg-orange-50 text-orange-800 text-xs font-bold uppercase tracking-wider flex items-center gap-2 sticky top-0">
                                            <Calendar size={12} /> Expiring Soon ({alertItems.expiring.length})
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {alertItems.expiring.slice(0, 5).map(p => (
                                                <div key={p.id} onClick={() => { setActiveTab('expiring'); setShowNotifications(false); }} className="p-3 hover:bg-slate-50 cursor-pointer transition-colors block">
                                                    <div className="font-medium text-slate-800 text-sm truncate">{p.name}</div>
                                                    <div className="text-xs text-orange-600 flex justify-between mt-1">
                                                        <span>Expires: {p.expiryDate}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {alertItems.expiring.length > 5 && (
                                                <button onClick={() => { setActiveTab('expiring'); setShowNotifications(false); }} className="w-full py-2 text-xs text-indigo-600 font-medium hover:bg-slate-50 border-t border-slate-100">
                                                    View All {alertItems.expiring.length} Items →
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Low Stock Section */}
                                {alertItems.lowStock.length > 0 && (
                                    <div className="border-t border-slate-100">
                                        <div className="px-4 py-2 bg-red-50 text-red-800 text-xs font-bold uppercase tracking-wider flex items-center gap-2 sticky top-0">
                                            <AlertTriangle size={12} /> Low Stock ({alertItems.lowStock.length})
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {alertItems.lowStock.slice(0, 5).map(p => (
                                                <div key={p.id} onClick={() => { setActiveTab('low_stock'); setShowNotifications(false); }} className="p-3 hover:bg-slate-50 cursor-pointer transition-colors block">
                                                    <div className="font-medium text-slate-800 text-sm truncate">{p.name}</div>
                                                    <div className="text-xs text-red-600 flex justify-between mt-1">
                                                        <span>Stock: {Object.values(p.stock).reduce((a: number, b: number) => a + b, 0)}</span>
                                                        <span>Min: {p.minStockLevel}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {alertItems.lowStock.length > 5 && (
                                                <button onClick={() => { setActiveTab('low_stock'); setShowNotifications(false); }} className="w-full py-2 text-xs text-indigo-600 font-medium hover:bg-slate-50 border-t border-slate-100">
                                                    View All {alertItems.lowStock.length} Low Stock →
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Dead Stock Section */}
                                {alertItems.deadStock.length > 0 && (
                                    <div className="border-t border-slate-100">
                                        <div className="px-4 py-2 bg-amber-50 text-amber-800 text-xs font-bold uppercase tracking-wider flex items-center gap-2 sticky top-0">
                                            <Clock size={12} /> Slow Moving ({alertItems.deadStock.length})
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {alertItems.deadStock.slice(0, 5).map(p => (
                                                <div key={p.id} onClick={() => { setSearchTerm(p.name); setShowNotifications(false); }} className="p-3 hover:bg-slate-50 cursor-pointer transition-colors block">
                                                    <div className="font-medium text-slate-800 text-sm truncate">{p.name}</div>
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        Last Sold: {p.lastSaleDate || 'Never'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls, .csv" />

                    <div className="relative" ref={dataToolsRef}>
                        <button onClick={() => setShowDataTools(!showDataTools)} className={`flex items-center justify-center p-2.5 border rounded-lg shadow-sm transition-all h-full ${showDataTools ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`} title="Data Tools">
                            <span className="flex items-center gap-2"><Download size={18} /> Data Tools</span>
                        </button>

                        {showDataTools && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 animate-in zoom-in-95 origin-top-right">
                                <div className="p-2 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-500">Export</div>
                                <button onClick={() => { exportData('xlsx'); setShowDataTools(false); }} className="block w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200">Export to Excel</button>
                                <button onClick={() => { exportData('csv'); setShowDataTools(false); }} className="block w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200">Export to CSV</button>
                                <button onClick={() => { exportData('json'); setShowDataTools(false); }} className="block w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200">Export JSON</button>

                                <div className="p-2 border-b border-t border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-500 mt-1">Import</div>
                                <button onClick={() => { navigate('/inventory/import'); setShowDataTools(false); }} className="block w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <Upload size={14} /> Interactive Import
                                </button>
                            </div>
                        )}
                    </div>

                    <button onClick={openAddModal} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg flex items-center justify-center space-x-2 shadow-sm transition-all">
                        <Plus size={18} /><span>{t('inv.addProduct')}</span>
                    </button>
                    <button onClick={() => { setTransferData(d => ({ ...d, isBulk: false, productId: '', qty: 0, notes: '' })); setIsTransferModalOpen(true); }} className="flex-1 md:flex-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-lg flex items-center justify-center space-x-2 shadow-sm transition-all">
                        <ArrowRightLeft size={18} /><span>{t('inv.transfer')}</span>
                    </button>
                </div>
            </div>

            {/* Metrics Cards Omitted for brevity (same as previous) */}

            {/* 2. Tabs Navigation REMOVED - Merged into Filter Bar below */}

            {/* 2. Tabs Navigation REMOVED - Merged into Filter Bar below */}


            {/* 3. Filter & Organization Panel - Always Visible */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={t('inv.searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center bg-slate-100 dark:bg-slate-700/50 rounded-lg p-1 overflow-x-auto">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'low_stock', label: 'Low Stock' },
                            { id: 'expiring', label: 'Expiring Soon' },
                            { id: 'dead_stock', label: 'Dead Stock' },
                            { id: 'history', label: 'Transfer History' }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setActiveTab(opt.id as any)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors whitespace-nowrap ${activeTab === opt.id ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {selectedProductIds.size > 0 && (
                        <div className="relative" ref={bulkActionsRef}>
                            <button onClick={() => setShowBulkActions(!showBulkActions)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium">
                                <CheckSquare size={16} /> {selectedProductIds.size} Selected <ChevronDown size={16} />
                            </button>

                            {showBulkActions && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden">
                                    <button onClick={handleBulkTransfer} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm flex items-center gap-2 text-slate-700 border-b border-slate-100">
                                        <ArrowRightLeft size={16} /> Transfer Stock
                                    </button>
                                    <button onClick={() => { setIsBulkEditModalOpen(true); setShowBulkActions(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm flex items-center gap-2 text-slate-700 border-b border-slate-100">
                                        <Edit size={16} /> Edit Details
                                    </button>
                                    <button onClick={handleBulkDelete} className="w-full text-left px-4 py-3 hover:bg-red-50 text-sm flex items-center gap-2 text-red-600">
                                        <Trash2 size={16} /> Delete Products
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <select className="w-full pl-9 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}>
                            <option value="all">{t('inv.filter.location')}</option>
                            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <Truck className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <select className="w-full pl-9 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                            <option value="all">{t('inv.filter.supplier')}</option>
                            {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <Tag className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <select className="w-full pl-9 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                            <option value="all">{t('inv.filter.category')}</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <select className="w-full pl-9 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" value={sortOption} onChange={e => setSortOption(e.target.value as any)}>
                            <option value="name">Name (A-Z)</option>
                            <option value="stockAsc">Stock (Low to High)</option>
                            <option value="stockDesc">Stock (High to Low)</option>
                            <option value="valueDesc">Value (High to Low)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Product Table View */}
            {activeTab !== 'history' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-4 py-4 w-12">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300"
                                            checked={filteredProducts.length > 0 && selectedProductIds.size === filteredProducts.length}
                                            onChange={() => setSelectedProductIds(selectedProductIds.size === filteredProducts.length ? new Set() : new Set(filteredProducts.map(p => p.id)))}
                                        />
                                    </th>
                                    <th className="px-4 py-4">{t('inv.table.product')}</th>
                                    <th className="px-4 py-4">{t('inv.table.category')}</th>
                                    <th className="px-4 py-4">{t('common.status')}</th>
                                    <th className="px-4 py-4 text-right">{t('inv.table.price')}</th>
                                    <th className="px-4 py-4 text-center">{t('inv.table.stock')}</th>
                                    <th className="px-4 py-4 text-right">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.map(p => {
                                    const stock = getDisplayStock(p, selectedLocation);
                                    const totalVal = stock * p.cost;
                                    const lowStock = checkIsLowStock(p, selectedLocation);
                                    const deadStock = isDeadStockProduct(p);

                                    return (
                                        <tr key={p.id} onClick={() => setViewingProduct(p)} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer ${deadStock ? 'bg-amber-50/30' : ''} border-b last:border-0 border-slate-100 dark:border-slate-700/50`}>
                                            <td className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300"
                                                    checked={selectedProductIds.has(p.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={() => { const s = new Set(selectedProductIds); s.has(p.id) ? s.delete(p.id) : s.add(p.id); setSelectedProductIds(s); }}
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{p.name}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                                    <span>SKU: {p.sku || 'N/A'}</span>
                                                    {p.barcode && <span className="bg-slate-100 dark:bg-slate-700 px-1 rounded flex items-center gap-1"><ScanLine size={10} /> {p.barcode}</span>}
                                                    {isExpiringSoon(p) && <span className="bg-orange-100 text-orange-700 px-1 rounded flex items-center gap-1 text-[10px] font-bold"><Tag size={10} /> EXPIRING</span>}
                                                    {deadStock && <span className="bg-amber-100 text-amber-700 px-1 rounded flex items-center gap-1 text-[10px] font-bold">SLOW MOVING</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-slate-800 dark:text-slate-200">{p.category}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">{p.supplier || 'Unknown Supplier'}</div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                    p.status === 'Seasonal' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                                                        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                                    }`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="font-medium text-slate-900 dark:text-white">₹{p.price.toLocaleString()}</div>
                                                <div className="text-xs text-slate-400">Cost: ₹{p.cost}</div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className={`font-bold flex items-center justify-center gap-1 ${lowStock ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>
                                                    {lowStock && <AlertTriangle size={14} className="text-red-500" />}
                                                    {stock.toLocaleString()}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">Value: ₹{totalVal.toLocaleString()}</div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); setViewingProduct(p); }} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="View Details">
                                                        <Info size={16} />
                                                    </button>
                                                    {deadStock && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeadStockOptimize(p); }} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Action Needed: Slow Moving">
                                                            <Zap size={16} />
                                                        </button>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); openEditModal(p); }} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Edit">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setHistoryProductId(p.id); }} className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700.50 rounded-lg transition-colors" title="History">
                                                        <History size={16} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleGlobalCheck(p); }} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Check Network Stock">
                                                        <Box size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/20">
                                            <Box size={48} className="mx-auto mb-3 opacity-20" />
                                            <p>No products found matching your filters.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }

            {/* History Table View */}
            {
                activeTab === 'history' && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 dark:text-white">Stock Movement History</h3>
                            <button onClick={() => { setTransferData(d => ({ ...d, isBulk: false, productId: '', qty: 0, notes: '' })); setIsTransferModalOpen(true); }} className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium bg-white dark:bg-slate-800 border dark:border-slate-600 px-3 py-1 rounded">+ New Transfer</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4">Date / Time</th>
                                        <th className="px-6 py-4">Product</th>
                                        <th className="px-6 py-4">Source → Destination</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Qty</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transfers.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">No transfer history found.</td></tr>
                                    ) : transfers.sort((a, b) => b.timestamp - a.timestamp).map(t => (
                                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b last:border-0 border-slate-100 dark:border-slate-700/50">
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                <div>{new Date(t.date).toLocaleDateString()}</div>
                                                <div className="text-xs text-slate-400">{new Date(t.timestamp).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{products.find(p => p.id === t.productId)?.name || 'Unknown Product'}</td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs text-nowrap">
                                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded border dark:border-slate-600">{locations.find(l => l.id === t.fromLocationId)?.name}</span>
                                                <span className="mx-2">→</span>
                                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded border dark:border-slate-600">{locations.find(l => l.id === t.toLocationId)?.name}</span>
                                                {t.notes && <div className="mt-1 italic opacity-75 truncate max-w-[200px]" title={t.notes}>"{t.notes}"</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${t.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-200">{t.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Product Details Modal */}
            {
                viewingProduct && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                            {/* Modal Header */}
                            <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{viewingProduct.name}</h2>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${viewingProduct.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                            viewingProduct.status === 'Seasonal' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                                                'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                            }`}>
                                            {viewingProduct.status}
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-4">
                                        <span>SKU: {viewingProduct.sku}</span>
                                        {viewingProduct.category && <span className="flex items-center gap-1"><Tag size={14} /> {viewingProduct.category}</span>}
                                    </div>
                                </div>
                                <button onClick={() => setViewingProduct(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 space-y-8">
                                {/* Key Metrics Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Selling Price</div>
                                        <div className="text-2xl font-bold text-slate-900 dark:text-white">₹{viewingProduct.price.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Cost Price</div>
                                        <div className="text-2xl font-bold text-slate-900 dark:text-white">₹{viewingProduct.cost.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Margin</div>
                                        <div className={`text-2xl font-bold ${((viewingProduct.price - viewingProduct.cost) / viewingProduct.price) * 100 > 15 ? 'text-green-600 dark:text-green-400' : 'text-amber-600'}`}>
                                            {((viewingProduct.price > 0 ? (viewingProduct.price - viewingProduct.cost) / viewingProduct.price : 0) * 100).toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Tax Rate</div>
                                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{viewingProduct.taxRate}%</div>
                                    </div>
                                </div>

                                {/* Main Details Section */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {/* Left Col: Info */}
                                    <div className="md:col-span-2 space-y-6">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <FileText size={16} className="text-indigo-500" /> Product Information
                                            </h3>
                                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                        <tr className="flex">
                                                            <td className="w-1/3 p-3 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium border-r border-slate-100 dark:border-slate-700">Supplier</td>
                                                            <td className="w-2/3 p-3 text-slate-900 dark:text-white">{viewingProduct.supplier || 'N/A'}</td>
                                                        </tr>
                                                        <tr className="flex">
                                                            <td className="w-1/3 p-3 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium border-r border-slate-100 dark:border-slate-700">HSN Code</td>
                                                            <td className="w-2/3 p-3 text-slate-900 dark:text-white">{viewingProduct.hsnCode || 'N/A'}</td>
                                                        </tr>
                                                        <tr className="flex">
                                                            <td className="w-1/3 p-3 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium border-r border-slate-100 dark:border-slate-700">Lead Time</td>
                                                            <td className="w-2/3 p-3 text-slate-900 dark:text-white">{viewingProduct.leadTimeDays || 0} Days</td>
                                                        </tr>
                                                        <tr className="flex">
                                                            <td className="w-1/3 p-3 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium border-r border-slate-100 dark:border-slate-700">Expiry</td>
                                                            <td className="w-2/3 p-3 text-slate-900 dark:text-white">{viewingProduct.expiryDate || 'Non-perishable'}</td>
                                                        </tr>
                                                        <tr className="flex">
                                                            <td className="w-1/3 p-3 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium border-r border-slate-100 dark:border-slate-700">Barcode</td>
                                                            <td className="w-2/3 p-3 text-slate-900 dark:text-white font-mono">{viewingProduct.barcode || 'N/A'}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Stock Distribution */}
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <Box size={16} className="text-indigo-500" /> Stock Distribution
                                            </h3>
                                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-slate-50 dark:bg-slate-700/50 font-medium text-slate-500 dark:text-slate-400">
                                                        <tr>
                                                            <th className="p-3">Location</th>
                                                            <th className="p-3 text-right">Available</th>
                                                            <th className="p-3 text-right">Min Level</th>
                                                            <th className="p-3 text-center">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                        {locations.map(loc => {
                                                            const qty = viewingProduct.stock[loc.id] || 0;
                                                            const min = viewingProduct.minStockThresholds?.[loc.id] ?? viewingProduct.minStockLevel ?? 10;
                                                            const isLow = qty < min;
                                                            return (
                                                                <tr key={loc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                                    <td className="p-3 text-slate-900 dark:text-white font-medium">{loc.name} <span className="text-xs text-slate-400 font-normal ml-1">({loc.type})</span></td>
                                                                    <td className="p-3 text-right text-slate-700 dark:text-slate-300 font-mono">{qty}</td>
                                                                    <td className="p-3 text-right text-slate-500 dark:text-slate-400 font-mono">{min}</td>
                                                                    <td className="p-3 text-center">
                                                                        {isLow ?
                                                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full"><AlertTriangle size={10} /> Low</span> :
                                                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full"><Check size={10} /> Good</span>
                                                                        }
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                    <tfoot className="bg-slate-50 dark:bg-slate-700/50 font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700">
                                                        <tr>
                                                            <td className="p-3">Total Inventory</td>
                                                            <td className="p-3 text-right">{Object.values(viewingProduct.stock).reduce((a: any, b: any) => a + b, 0)}</td>
                                                            <td className="p-3" colSpan={2}></td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Col: Actions / ID */}
                                    <div className="space-y-6">
                                        <div className="bg-slate-50 dark:bg-slate-700/20 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                                            <button onClick={() => { openEditModal(viewingProduct); setViewingProduct(null); }} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                                                <Edit size={16} /> Edit Product
                                            </button>
                                            <button onClick={() => { setTransferData(d => ({ ...d, productId: viewingProduct.id, fromLoc: locations[0]?.id || '', toLoc: '' })); setIsTransferModalOpen(true); setViewingProduct(null); }} className="w-full py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                                                <ArrowRightLeft size={16} /> Transfer Stock
                                            </button>
                                            <button onClick={() => { setHistoryProductId(viewingProduct.id); setViewingProduct(null); }} className="w-full py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                                                <History size={16} /> View History
                                            </button>
                                        </div>

                                        <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/50 text-xs text-orange-800 dark:text-orange-300">
                                            <h4 className="font-bold mb-1 flex items-center gap-1"><Wand2 size={12} /> AI Insight</h4>
                                            <p className="opacity-90">
                                                {isDeadStockProduct(viewingProduct) ?
                                                    "This item is classified as Dead Stock. Consider a clearance sale or transfer to a high-traffic location." :
                                                    "Demand for this category is trending up. Ensure stock levels are above min thresholds for the weekend."
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                isTransferModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setIsTransferModalOpen(false); }}>
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white"><ArrowRightLeft size={22} className="text-indigo-600 dark:text-indigo-400" /> Transfer Stock</h3>

                            {transferStatus === 'success' ? (
                                <div className="flex flex-col items-center py-8">
                                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full text-green-600 dark:text-green-400 mb-3"><CheckCircle size={40} /></div>
                                    <h4 className="text-lg font-bold text-green-800 dark:text-green-400">Transfer Initiated</h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-center mt-1">Inventory levels have been updated.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleTransferSubmit} className="space-y-4">
                                    {!transferData.isBulk && (
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Product</div>
                                            {transferData.productId ? (
                                                <div className="flex justify-between items-center">
                                                    <div className="font-medium text-slate-800 dark:text-white">{products.find(p => p.id === transferData.productId)?.name}</div>
                                                    <button type="button" onClick={() => setTransferData({ ...transferData, productId: '' })} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Change</button>
                                                </div>
                                            ) : (
                                                <select className="w-full border dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white outline-none" value={transferData.productId} onChange={e => setTransferData({ ...transferData, productId: e.target.value })}>
                                                    <option value="">Select Product...</option>
                                                    {products.slice().sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    )}
                                    {transferData.isBulk && (
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Bulk Action</div>
                                            <div className="font-medium text-slate-800 dark:text-white">{selectedProductIds.size} Items Selected</div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Source</label>
                                            <select className="w-full border dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={transferData.fromLoc} onChange={e => setTransferData({ ...transferData, fromLoc: e.target.value })}>
                                                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Destination</label>
                                            <select className="w-full border dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={transferData.toLoc} onChange={e => setTransferData({ ...transferData, toLoc: e.target.value })}>
                                                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Quantity to Transfer</label>
                                        <input type="number" className="w-full border dark:border-slate-600 p-2.5 rounded-lg text-lg font-bold text-center outline-none focus:border-indigo-500 dark:bg-slate-700 dark:text-white" value={transferData.qty} onChange={e => setTransferData({ ...transferData, qty: Number(e.target.value) })} min="1" />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Transfer Reason / Notes</label>
                                        <textarea className="w-full border dark:border-slate-600 p-2.5 rounded-lg text-sm outline-none focus:border-indigo-500 h-20 dark:bg-slate-700 dark:text-white" placeholder="e.g. Replenishment for weekend sale..." value={transferData.notes} onChange={e => setTransferData({ ...transferData, notes: e.target.value })}></textarea>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button type="button" onClick={() => setIsTransferModalOpen(false)} className="flex-1 py-2.5 border dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">Cancel</button>
                                        <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold">Confirm Transfer</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )
            }

            {/* History Modal - Update to show Status/Reason */}
            {
                historyProductId && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-3xl w-full p-0 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-700">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-700/50">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Stock History</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{products.find(p => p.id === historyProductId)?.name}</p>
                                </div>
                                <button onClick={() => setHistoryProductId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={20} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Type</th>
                                            <th className="px-6 py-3">Details</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3 text-right">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {transfers
                                            .filter(t => t.productId === historyProductId)
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map(t => {
                                                const fromName = locations.find(l => l.id === t.fromLocationId)?.name || 'Unknown';
                                                const toName = locations.find(l => l.id === t.toLocationId)?.name || 'Unknown';
                                                return (
                                                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b last:border-0 border-slate-100 dark:border-slate-700/50">
                                                        <td className="px-6 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <Clock size={14} className="text-slate-400" />
                                                                <div>
                                                                    <div>{new Date(t.date).toLocaleDateString()}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-bold">TRANSFER</span>
                                                        </td>
                                                        <td className="px-6 py-3 text-xs">
                                                            <div className="font-medium text-slate-800 dark:text-white">{fromName} → {toName}</div>
                                                            <div className="text-slate-500 dark:text-slate-400 mt-0.5">{t.notes || t.reason || 'No notes'}</div>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            {t.status === 'FAILED' ?
                                                                <span className="text-red-600 font-bold text-xs" title={t.reason}>FAILED</span> :
                                                                <span className="text-green-600 font-bold text-xs">COMPLETED</span>
                                                            }
                                                        </td>
                                                        <td className="px-6 py-3 text-right font-bold text-slate-800 dark:text-white">
                                                            {t.quantity}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                isProductModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                                <div>
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                                        {editingProduct ? <Edit size={24} className="text-indigo-600 dark:text-indigo-400" /> : <Plus size={24} className="text-indigo-600 dark:text-indigo-400" />}
                                        {editingProduct ? 'Edit Product Details' : 'Add New Product'}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 ml-8">Fill in the information to add a new item to inventory.</p>
                                </div>
                                <button onClick={() => setIsProductModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 p-2 rounded-full transition-colors text-slate-600 dark:text-slate-300"><X size={20} /></button>
                            </div>

                            <form onSubmit={handleProductSubmit} className="space-y-8">
                                {/* Section 1: Basic Info */}
                                <div className="space-y-4">
                                    <h4 className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider border-b border-indigo-100 dark:border-indigo-900 pb-2">
                                        <Box size={16} className="text-indigo-600 dark:text-indigo-400" /> Basic Information
                                    </h4>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Product Name <span className="text-red-500">*</span></label>
                                        <input required className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="e.g. Premium Basmati Rice" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between items-center">
                                                        SKU ID
                                                        <button type="button" onClick={autoGenerateSKU} className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors" title="Auto Generate SKU">
                                                            <Wand2 size={12} /> Auto-Generate
                                                        </button>
                                                    </label>
                                                    <div className="relative">
                                                        <Tag className="absolute left-3 top-3 text-slate-400" size={16} />
                                                        <input
                                                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 pl-9 outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                            placeholder="Auto-Generated"
                                                            value={productForm.sku}
                                                            onChange={e => setProductForm({ ...productForm, sku: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Barcode</label>
                                                    <div className="relative">
                                                        <ScanLine className="absolute left-3 top-3 text-slate-400" size={16} />
                                                        <input className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 pl-9 outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="Scan..." value={productForm.barcode} onChange={e => setProductForm({ ...productForm, barcode: e.target.value })} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
                                                    {!isNewCategory ? (
                                                        <select
                                                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                            value={productForm.category}
                                                            onChange={e => {
                                                                if (e.target.value === '__NEW__') {
                                                                    setIsNewCategory(true);
                                                                    setProductForm({ ...productForm, category: '' });
                                                                } else {
                                                                    setProductForm({ ...productForm, category: e.target.value });
                                                                }
                                                            }}
                                                        >
                                                            <option value="">Select Category...</option>
                                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                                            <option value="__NEW__" className="font-bold text-indigo-600 dark:text-indigo-400">+ Add New Category</option>
                                                        </select>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <input
                                                                autoFocus
                                                                className="w-full border border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-100 dark:ring-indigo-900/30 rounded-lg p-2.5 outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                                placeholder="Enter New Category Name"
                                                                value={newCategoryName}
                                                                onChange={e => {
                                                                    setNewCategoryName(e.target.value);
                                                                    setProductForm({ ...productForm, category: e.target.value }); // keep form in sync for HSN effect
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsNewCategory(false)}
                                                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                                title="Cancel"
                                                            >
                                                                <X size={20} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Unit Type</label>
                                                    <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={productForm.unit} onChange={e => setProductForm({ ...productForm, unit: e.target.value })}>
                                                        <option value="pcs">Pieces (pcs)</option>
                                                        <option value="kg">Kilograms (kg)</option>
                                                        <option value="g">Grams (g)</option>
                                                        <option value="l">Liters (l)</option>
                                                        <option value="ml">Milliliters (ml)</option>
                                                        <option value="box">Box</option>
                                                        <option value="doz">Dozen</option>
                                                        <option value="pack">Pack</option>
                                                        <option value="m">Meter (m)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Supplier</label>
                                                    {!isNewSupplier ? (
                                                        <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                            value={productForm.supplier}
                                                            onChange={e => {
                                                                if (e.target.value === '__NEW__') {
                                                                    setIsNewSupplier(true);
                                                                    setProductForm({ ...productForm, supplier: '' });
                                                                } else {
                                                                    setProductForm({ ...productForm, supplier: e.target.value });
                                                                }
                                                            }}>
                                                            <option value="">Select Supplier...</option>
                                                            {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                                                            <option value="__NEW__" className="font-bold text-indigo-600 dark:text-indigo-400">+ Add New Supplier</option>
                                                        </select>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <input
                                                                autoFocus
                                                                className="w-full border border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-100 dark:ring-indigo-900/30 rounded-lg p-2.5 outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                                placeholder="Enter Supplier Name"
                                                                value={newSupplierName}
                                                                onChange={e => {
                                                                    setNewSupplierName(e.target.value);
                                                                    setProductForm({ ...productForm, supplier: e.target.value });
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsNewSupplier(false)}
                                                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                                title="Cancel"
                                                            >
                                                                <X size={20} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                                                <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                                                    {['Active', 'Seasonal', 'Discontinued'].map(s => (
                                                        <button type="button" key={s} onClick={() => setProductForm({ ...productForm, status: s as any })}
                                                            className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${productForm.status === s ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Pricing & Inventory */}
                                <div className="space-y-4">
                                    <h4 className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider border-b border-indigo-100 dark:border-indigo-900 pb-2">
                                        <IndianRupee size={16} className="text-indigo-600 dark:text-indigo-400" /> {t('inv.modal.pricingStock')}
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Sale Price (MRP)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2.5 text-slate-500 font-bold">₹</span>
                                                        <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 pl-8 outline-none focus:border-indigo-500 font-medium bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: Number(e.target.value) })} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Cost Price</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2.5 text-slate-500 font-bold">₹</span>
                                                        <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 pl-8 outline-none focus:border-indigo-500 font-medium bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={productForm.cost} onChange={e => setProductForm({ ...productForm, cost: Number(e.target.value) })} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">HSN Code</label>
                                                    <div className="relative">
                                                        <input
                                                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 pr-8 outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                            value={productForm.hsnCode}
                                                            onChange={e => setProductForm({ ...productForm, hsnCode: e.target.value })}
                                                            placeholder="Enter HSN"
                                                        />
                                                        {HSN_MAPPING[productForm.category] && (
                                                            <div className="absolute right-2 top-2.5 text-xs text-indigo-500 font-bold bg-indigo-50 px-1.5 py-0.5 rounded" title="Auto-suggested based on category">
                                                                AUTO
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Expiry Date</label>
                                                    <input type="date" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 outline-none focus:border-indigo-500 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700" value={productForm.expiryDate || ''} onChange={e => setProductForm({ ...productForm, expiryDate: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Initial Stock Distribution</label>
                                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 p-4 space-y-3">
                                                {locations.map(loc => (
                                                    <div key={loc.id} className="flex justify-between items-center group">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin size={14} className="text-slate-400 group-hover:text-indigo-500" />
                                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{loc.name}</span>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <div className="text-right">
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Min Alert</div>
                                                                <input type="number" className="w-20 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 focus:border-indigo-500 outline-none text-center text-slate-900 dark:text-white"
                                                                    value={productForm.minStockInputs?.[loc.id] || productForm.minStockLevel || 10}
                                                                    onChange={e => setProductForm({
                                                                        ...productForm,
                                                                        minStockInputs: { ...productForm.minStockInputs, [loc.id]: Number(e.target.value) }
                                                                    })}
                                                                />
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Current</div>
                                                                <input type="number" className="w-24 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 focus:border-indigo-500 outline-none font-bold text-center text-indigo-600 dark:text-indigo-400"
                                                                    value={productForm.stockInputs?.[loc.id] || 0}
                                                                    onChange={e => setProductForm({
                                                                        ...productForm,
                                                                        stockInputs: { ...productForm.stockInputs, [loc.id]: Number(e.target.value) }
                                                                    })}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-3 justify-end bg-white dark:bg-slate-800 sticky bottom-0">
                                    <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition-colors">Cancel</button>
                                    <button type="submit" className="px-8 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2">
                                        <CheckCircle size={18} />
                                        {editingProduct ? 'Save Changes' : 'Create Product'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
