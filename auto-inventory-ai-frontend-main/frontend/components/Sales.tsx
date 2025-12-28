
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product, CartItem, Sale, Customer } from '../types';
import { Plus, Trash2, Printer, Save, MapPin, Tag, User, Gift, X, CreditCard, Banknote, QrCode, Search, ShoppingBag, AlertCircle, History, FileText, ArrowLeft, Minus } from 'lucide-react';

export const Sales: React.FC = () => {
    const { products, locations, addSale, customers, addCustomer, sales } = useApp();
    const [currentLocationId, setCurrentLocationId] = useState<string>(locations[0].id);
    const [activeTab, setActiveTab] = useState<'POS' | 'HISTORY'>('POS');

    // POS State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [billDiscountPercent, setBillDiscountPercent] = useState<number>(0);

    // History State
    const [historySearch, setHistorySearch] = useState('');

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });

    // Auto-Add Logic (Scan Support)
    useEffect(() => {
        const match = products.find(p => p.sku === productSearch || p.barcode === productSearch);
        if (match) {
            const currentStock = match.stock[currentLocationId] || 0;
            if (currentStock > 0) {
                setCart(prev => {
                    const existing = prev.find(i => i.id === match.id);
                    if (existing) {
                        if (existing.quantity + 1 > currentStock) return prev; // Don't overfill
                        return prev.map(i => i.id === match.id ? { ...i, quantity: i.quantity + 1 } : i);
                    } else {
                        return [...prev, { ...match, quantity: 1, discount: 0 }];
                    }
                });
                setProductSearch(''); // Clear search after adding
            }
        }
    }, [productSearch, products, currentLocationId]);

    // --- Logic ---

    const availableProducts = useMemo(() => {
        return products.filter(p => {
            const matches = p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase());
            return matches;
        });
    }, [products, productSearch]);

    const customerMatches = useMemo(() => {
        if (!customerSearch) return [];
        const lower = customerSearch.toLowerCase();
        return customers.filter(c => c.name.toLowerCase().includes(lower) || c.phone.includes(lower)).slice(0, 5);
    }, [customers, customerSearch]);

    const addToCart = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const currentStock = product.stock[currentLocationId] || 0;

        // Check if item already in cart
        const existing = cart.find(i => i.id === productId);
        const currentQtyInCart = existing ? existing.quantity : 0;

        if (currentQtyInCart + 1 > currentStock) {
            alert(`Stock limit reached! Only ${currentStock} units available at this location.`);
            return;
        }

        if (existing) {
            setCart(cart.map(i => i.id === productId ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setCart([...cart, { ...product, quantity: 1, discount: 0 }]);
        }
    };

    const updateCartQuantity = (productId: string, delta: number) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        const currentStock = product.stock[currentLocationId] || 0;

        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQty = item.quantity + delta;
                if (newQty <= 0) return item; // Don't remove here, use delete button
                if (newQty > currentStock) {
                    alert(`Cannot add more. Stock limit: ${currentStock}`);
                    return item;
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const updateCartDiscount = (productId: string, percent: number) => {
        setCart(prev => prev.map(item => item.id === productId ? { ...item, discount: Math.min(100, Math.max(0, percent)) } : item));
    };

    const removeFromCart = (id: string) => setCart(cart.filter(i => i.id !== id));

    const calculateTotals = () => {
        let subtotal = 0, tax = 0;
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            const discountAmount = itemTotal * (item.discount / 100);
            const taxableValue = itemTotal - discountAmount;

            subtotal += taxableValue;
            tax += taxableValue * (item.taxRate / 100);
        });

        // Apply Bill Discount on Subtotal (Pre-tax usually, but simplified here)
        const billDiscountAmount = subtotal * (billDiscountPercent / 100);
        const finalSubtotal = subtotal - billDiscountAmount;

        // Recalculate tax proportionally if bill discount applies? 
        // Simplified: We assume tax is on final value
        const finalTax = tax * (1 - billDiscountPercent / 100);

        return {
            rawSubtotal: subtotal,
            billDiscountAmount,
            finalSubtotal,
            finalTax,
            grandTotal: finalSubtotal + finalTax
        };
    };

    const { rawSubtotal, billDiscountAmount, finalSubtotal, finalTax, grandTotal } = calculateTotals();

    const handlePayment = () => {
        const txnId = `TXN-${Date.now()}`;
        const invId = `INV-${Date.now()}`;

        const newSale: Sale = {
            id: invId,
            date: new Date().toISOString().split('T')[0],
            items: [...cart],
            totalAmount: grandTotal,
            totalTax: finalTax,
            subtotal: finalSubtotal,
            billDiscount: billDiscountPercent,
            customerName: selectedCustomer ? selectedCustomer.name : (customerSearch || 'Walk-in'),
            customerId: selectedCustomer?.id,
            locationId: currentLocationId,
            paymentMethod: paymentMethod,
            transactionId: txnId
        };

        addSale(newSale);
        setIsPaymentModalOpen(false);
        setCart([]);
        setSelectedCustomer(null);
        setCustomerSearch('');
        setBillDiscountPercent(0);

        generateInvoicePDF(newSale);
    };

    const generateInvoicePDF = (sale: Sale) => {
        const locationInfo = locations.find(l => l.id === sale.locationId);

        // Totals calculation for footer row
        const totalQty = sale.items.reduce((acc, i) => acc + i.quantity, 0);

        const invoiceContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${sale.id}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body { font-family: 'Inter', sans-serif; color: #333; margin: 0; padding: 40px; background: white; }
                .container { max-width: 800px; margin: 0 auto; }
                
                /* Header */
                .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
                .title { font-size: 42px; font-weight: 800; color: #1e293b; letter-spacing: -1px; line-height: 1; }
                
                .company-info { margin-top: 10px; font-size: 14px; line-height: 1.5; color: #64748b; }
                .company-name { font-weight: 700; font-size: 16px; color: #334155; margin-bottom: 4px; display:block; }
                
                .invoice-meta { text-align: right; }
                .meta-item { margin-bottom: 6px; }
                .meta-label { font-size: 12px; text-transform: uppercase; color: #94a3b8; font-weight: 600; display: block; }
                .meta-value { font-size: 15px; font-weight: 600; color: #334155; }
                
                /* Billed To */
                .billed-section { margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
                .section-title { font-size: 12px; text-transform: uppercase; color: #94a3b8; font-weight: 600; margin-bottom: 10px; }
                .client-name { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
                .client-details { font-size: 14px; color: #64748b; line-height: 1.5; }
                
                /* Table */
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { text-align: left; padding: 12px 0; border-bottom: 2px solid #3b82f6; color: #3b82f6; font-size: 12px; text-transform: uppercase; font-weight: 700; }
                td { padding: 16px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; vertical-align: top; }
                
                .col-item { width: 40%; }
                .col-qty { text-align: center; width: 10%; }
                .col-price { text-align: right; width: 15%; }
                .col-gst { text-align: right; width: 15%; }
                .col-total { text-align: right; width: 20%; font-weight: 600; }
                
                .item-name { font-weight: 600; color: #334155; display: block; margin-bottom: 2px; }
                .item-desc { font-size: 12px; color: #94a3b8; }
                
                /* Totals Footer */
                .table-footer td { border-bottom: none; border-top: 2px solid #334155; padding-top: 12px; font-weight: 700; color: #1e293b; }
                
                /* Summary */
                .summary-section { display: flex; justify-content: flex-end; }
                .summary-table { width: 300px; }
                .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #64748b; }
                .summary-row.total { font-size: 18px; font-weight: 700; color: #1e293b; border-top: 2px solid #e2e8f0; margin-top: 10px; padding-top: 10px; }
                
                /* Footer */
                .footer { margin-top: 60px; text-align: center; font-size: 13px; color: #94a3b8; padding-top: 20px; border-top: 1px solid #f1f5f9; }
                
            </style>
          </head>
          <body>
            <div class="container">
                <div class="header-top">
                    <div>
                        <div class="title">INVOICE</div>
                        <div class="company-info">
                            <span class="company-name">Hanuman Trader</span>
                            ${locationInfo?.address || 'Main Branch'}<br>
                            Phone: +91 98765 43210<br>
                            Email: billing@hanumantrader.com<br>
                            GSTIN: 29AAAAA0000A1Z5
                        </div>
                    </div>
                    <div class="invoice-meta">
                        <div class="meta-item">
                            <span class="meta-label">Invoice No</span>
                            <span class="meta-value">#${sale.id}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Date Issued</span>
                            <span class="meta-value">${sale.date}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Transaction ID</span>
                            <span class="meta-value">${sale.transactionId}</span>
                        </div>
                    </div>
                </div>
                
                <div class="billed-section">
                    <div class="section-title">Billed To</div>
                    <div class="client-name">${sale.customerName || 'Walk-in Customer'}</div>
                    <div class="client-details">
                        ${selectedCustomer?.address || 'Address not provided'}<br>
                        ${selectedCustomer?.phone || ''}<br>
                        ${selectedCustomer?.email || ''}
                    </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th class="col-item">Item Details</th>
                      <th class="col-qty">Qty</th>
                      <th class="col-price">Unit Price</th>
                      <th class="col-gst">GST Charges</th>
                      <th class="col-total">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sale.items.map(i => {
            const taxable = i.price * i.quantity * (1 - i.discount / 100);
            const gstAmount = taxable * (i.taxRate / 100);
            const totalLine = taxable + gstAmount;
            return `
                          <tr>
                            <td class="col-item">
                                <span class="item-name">${i.name}</span>
                                <span class="item-desc">SKU: ${i.sku || '-'} | HSN: ${i.hsnCode} | Rate: ${i.taxRate}%</span>
                            </td>
                            <td class="col-qty">${i.quantity}</td>
                            <td class="col-price">₹${i.price}</td>
                            <td class="col-gst">₹${gstAmount.toFixed(2)}</td>
                            <td class="col-total">₹${totalLine.toFixed(2)}</td>
                          </tr>
                        `;
        }).join('')}
                    
                    <tr class="table-footer">
                        <td>Totals</td>
                        <td class="col-qty">${totalQty}</td>
                        <td></td>
                        <td class="col-gst">₹${sale.totalTax.toFixed(2)}</td>
                        <td class="col-total">₹${sale.totalAmount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                <div class="summary-section">
                    <div class="summary-table">
                        <div class="summary-row">
                            <span>Subtotal</span>
                            <span>₹${sale.subtotal.toFixed(2)}</span>
                        </div>
                         <div class="summary-row">
                            <span>GST (Tax)</span>
                            <span>₹${sale.totalTax.toFixed(2)}</span>
                        </div>
                        ${sale.billDiscount > 0 ? `
                        <div class="summary-row" style="color: #ef4444;">
                            <span>Discount (${sale.billDiscount}%)</span>
                            <span>- ₹${(sale.subtotal * sale.billDiscount / 100).toFixed(2)}</span>
                        </div>` : ''}
                        <div class="summary-row total">
                            <span>Grand Total</span>
                            <span>₹${sale.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Thank you for your business!</p>
                    <p>Terms & Conditions: Returns accepted within 7 days with original receipt.</p>
                </div>
            </div>
          </body>
        </html>
      `;
        const win = window.open('', '_blank');
        win?.document.write(invoiceContent);
        win?.document.close();
        // Wait for content to load slightly before print to ensure styles apply
        setTimeout(() => {
            win?.print();
        }, 500);
    };

    const filteredHistory = useMemo(() => {
        if (!historySearch) return sales;
        const lower = historySearch.toLowerCase();
        return sales.filter(s => s.id.toLowerCase().includes(lower) || s.customerName?.toLowerCase().includes(lower) || s.transactionId.toLowerCase().includes(lower));
    }, [sales, historySearch]);


    // --- RENDER ---

    if (activeTab === 'HISTORY') {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveTab('POS')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400"><ArrowLeft /></button>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Sales History</h2>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input className="w-full pl-9 py-2 border dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500" placeholder="Search Invoice / Customer" value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="p-4">Invoice ID</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4">Items</th>
                                <th className="p-4 text-right">Total Amount</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredHistory.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300">
                                    <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{s.id}</td>
                                    <td className="p-4">{s.date}</td>
                                    <td className="p-4 font-medium text-slate-900 dark:text-white">{s.customerName}</td>
                                    <td className="p-4">{s.items.length}</td>
                                    <td className="p-4 text-right font-bold text-slate-900 dark:text-white">₹{s.totalAmount.toFixed(2)}</td>
                                    <td className="p-4 text-center"><span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs px-2 py-1 rounded-full uppercase font-bold">Paid</span></td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => generateInvoicePDF(s)} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded" title="Reprint Invoice">
                                            <Printer size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredHistory.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">No records found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // --- POS VIEW ---

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)] animate-in fade-in">
            {/* LEFT: Product Catalog */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex gap-4 justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-600 p-2 rounded text-white"><ShoppingBag size={20} /></div>
                        <h2 className="font-bold text-slate-800 dark:text-white">New Sale</h2>
                    </div>
                    <div className="flex gap-2">
                        <select className="border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={currentLocationId} onChange={e => setCurrentLocationId(e.target.value)}>
                            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <button onClick={() => setActiveTab('HISTORY')} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-600">
                            <History size={18} /> <span className="hidden sm:inline">History</span>
                        </button>
                    </div>
                </div>

                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            placeholder="Search Products by Name or SKU..."
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start custom-scrollbar">
                    {availableProducts.map(p => {
                        const stock = p.stock[currentLocationId] || 0;
                        const isOOS = stock <= 0;
                        return (
                            <button
                                key={p.id}
                                onClick={() => !isOOS && addToCart(p.id)}
                                disabled={isOOS}
                                className={`p-3 border dark:border-slate-700 rounded-xl text-left transition-all relative group flex flex-col justify-between h-32 ${isOOS ? 'opacity-60 bg-slate-100 dark:bg-slate-900 cursor-not-allowed' : 'hover:border-indigo-500 hover:shadow-md bg-white dark:bg-slate-800'}`}
                            >
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white line-clamp-2 text-sm">{p.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">{p.sku}</div>
                                </div>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">₹{p.price}</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${isOOS ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : (stock < 10 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400')}`}>
                                        {isOOS ? 'Out' : `${stock} Left`}
                                    </span>
                                </div>
                                {!isOOS && <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                    <Plus className="text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm" size={32} />
                                </div>}
                            </button>
                        );
                    })}
                    {availableProducts.length === 0 && <div className="col-span-full text-center text-slate-400 py-10">No products found.</div>}
                </div>
            </div>

            {/* RIGHT: Cart */}
            <div className="w-full lg:w-[450px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
                {/* Customer Search */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    <div className="relative group">
                        <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            className="w-full pl-9 pr-8 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            placeholder="Search Customer (Name/Phone)..."
                            value={selectedCustomer ? selectedCustomer.name : customerSearch}
                            onChange={e => {
                                setCustomerSearch(e.target.value);
                                setSelectedCustomer(null);
                            }}
                        />
                        {selectedCustomer && <button onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }} className="absolute right-2 top-2 text-slate-400 hover:text-red-500"><X size={16} /></button>}

                        {/* Dropdown Results */}
                        {!selectedCustomer && customerSearch && customerMatches.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-700 border dark:border-slate-600 shadow-lg rounded-lg mt-1 z-10 max-h-40 overflow-y-auto">
                                {customerMatches.map(c => (
                                    <div key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer text-sm text-slate-900 dark:text-white">
                                        <div className="font-bold">{c.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{c.phone}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {cart.map(item => (
                        <div key={item.id} className="flex gap-2 p-2 border border-slate-100 dark:border-slate-700/50 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                            <div className="h-10 w-10 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center flex-shrink-0">
                                <Tag size={18} className="text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-sm text-slate-800 dark:text-white truncate">{item.name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                                    </div>
                                    <div className="font-bold text-slate-800 dark:text-white">₹{(item.price * item.quantity * (1 - item.discount / 100)).toFixed(2)}</div>
                                </div>

                                <div className="flex justify-between items-center mt-2">
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300"><Minus size={14} /></button>
                                        <span className="w-8 text-center text-sm font-bold text-slate-900 dark:text-white">{item.quantity}</span>
                                        <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded text-indigo-600 dark:text-indigo-400"><Plus size={14} /></button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center bg-slate-50 dark:bg-slate-700 border dark:border-slate-600 rounded px-1.5 py-0.5">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 mr-1">Disc%</span>
                                            <input
                                                type="number"
                                                min="0" max="100"
                                                className="w-8 bg-transparent text-right text-xs outline-none text-slate-900 dark:text-white"
                                                value={item.discount}
                                                onChange={(e) => updateCartDiscount(item.id, Number(e.target.value))}
                                            />
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                            <ShoppingBag size={48} className="mb-2" />
                            <p>Cart is empty</p>
                        </div>
                    )}
                </div>

                {/* Billing Summary */}
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Subtotal</span>
                        <span>₹{rawSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">Bill Discount % <input type="number" className="w-10 border dark:border-slate-600 rounded px-1 text-center bg-white dark:bg-slate-800 outline-none" value={billDiscountPercent} onChange={e => setBillDiscountPercent(Number(e.target.value))} /></span>
                        <span className="text-red-500">- ₹{billDiscountAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>GST (Included/Calc)</span>
                        <span>₹{finalTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-slate-800 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-600 mt-2">
                        <span>Total Payable</span>
                        <span>₹{grandTotal.toFixed(2)}</span>
                    </div>

                    <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        disabled={cart.length === 0}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 mt-4 shadow-sm flex justify-center items-center gap-2"
                    >
                        <CreditCard size={18} /> Pay & Print Invoice
                    </button>
                </div>
            </div>

            {/* Payment Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xl font-bold mb-1 text-slate-800 dark:text-white">Payment</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">Total Amount: <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">₹{grandTotal.toFixed(2)}</span></p>

                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <button onClick={() => setPaymentMethod('CASH')} className={`p-3 border dark:border-slate-600 rounded-lg flex flex-col items-center transition-colors ${paymentMethod === 'CASH' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-500 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                <Banknote size={24} className="mb-1" /> <span className="text-xs font-bold">Cash</span>
                            </button>
                            <button onClick={() => setPaymentMethod('CARD')} className={`p-3 border dark:border-slate-600 rounded-lg flex flex-col items-center transition-colors ${paymentMethod === 'CARD' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-500 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                <CreditCard size={24} className="mb-1" /> <span className="text-xs font-bold">Card</span>
                            </button>
                            <button onClick={() => setPaymentMethod('UPI')} className={`p-3 border dark:border-slate-600 rounded-lg flex flex-col items-center transition-colors ${paymentMethod === 'UPI' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-500 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                <QrCode size={24} className="mb-1" /> <span className="text-xs font-bold">UPI</span>
                            </button>
                        </div>

                        {paymentMethod === 'CASH' && (
                            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg mb-4 text-center text-sm text-orange-800 dark:text-orange-300 border border-orange-100 dark:border-orange-900/50 flex items-center justify-center gap-2">
                                <Banknote size={16} /> Please collect cash from customer.
                            </div>
                        )}

                        {paymentMethod === 'CARD' && (
                            <div className="space-y-3 mb-4">
                                <input placeholder="Card Number" className="w-full border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={cardDetails.number} onChange={e => setCardDetails({ ...cardDetails, number: e.target.value })} />
                                <div className="flex gap-3">
                                    <input placeholder="MM/YY" className="w-full border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                                    <input placeholder="CVV" className="w-full border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'UPI' && (
                            <div className="flex flex-col items-center mb-4 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div className="w-32 h-32 bg-white border-2 border-slate-800 rounded-lg flex items-center justify-center mb-2 shadow-sm">
                                    <QrCode size={64} />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Scan via GPay, PhonePe, Paytm</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                            <button onClick={handlePayment} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md">Complete Sale</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
