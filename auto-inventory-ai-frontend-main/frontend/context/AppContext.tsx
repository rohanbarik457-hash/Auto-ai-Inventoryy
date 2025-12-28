
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Product, Location, Sale, Transfer, Customer, SalesTarget, TaxTier, Notification, Supplier, BusinessGoal, User, Role } from '../types';
import * as Constants from '../constants';
import { getProducts, getLocations, getCustomers, createCustomer, getSuppliers, getSales, createSale, getTransfers, createTransfer, getTaxTiers, createProduct as apiCreateProduct, updateProduct as apiUpdateProduct } from '../services/api';

interface AppState {
  currentUser: User | null;
  token: string | null;
  loginUser: (token: string, user: User) => void;
  logoutUser: () => void;
  products: Product[];
  locations: Location[];
  addLocation: (location: Location) => void;
  sales: Sale[];
  transfers: Transfer[];
  customers: Customer[];
  salesTargets: SalesTarget[];
  taxTiers: TaxTier[];
  notifications: Notification[];
  suppliers: Supplier[];
  addSupplier: (supplier: Supplier) => void;
  goals: BusinessGoal[];
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProducts: (productIds: string[]) => void;
  updateStock: (productId: string, locationId: string, quantityChange: number) => void;
  transferStock: (productId: string, fromLocId: string, toLocId: string, quantity: number, notes?: string) => void;
  addSale: (sale: Sale) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  setSalesTarget: (target: SalesTarget) => void;
  addTaxTier: (tier: TaxTier) => void;
  deleteTaxTier: (id: string) => void;
  addNotification: (type: Notification['type'], message: string, details?: string) => void;
  addGoal: (text: string, deadline?: string) => void;
  updateGoal: (id: string, text: string) => void;
  deleteGoal: (id: string) => void;
  reloadContext: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [rawLocations, setLocations] = useState<Location[]>([]);
  const [rawSales, setSales] = useState<Sale[]>([]);
  const [rawTransfers, setTransfers] = useState<Transfer[]>([]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesTargets, setSalesTargets] = useState<SalesTarget[]>(Constants.SALES_TARGETS); // Keep local for now
  const [taxTiers, setTaxTiers] = useState<TaxTier[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [goals, setGoals] = useState<BusinessGoal[]>([
    { id: 'g1', text: 'Increase monthly revenue by 10%', status: 'Pending', deadline: '2024-12-31' },
    { id: 'g2', text: 'Reduce dead stock by 50 units', status: 'Pending', deadline: '2024-11-15' },
    { id: 'g3', text: 'Expand to new location in Pune', status: 'Completed', deadline: '2024-08-01' }
  ]);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 'not-1', type: 'INFO', message: 'System Initialized', timestamp: Date.now() - 100000, details: 'Welcome to AutoInventory AI' }
  ]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return localStorage.getItem('theme') as 'light' | 'dark' || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const [loading, setLoading] = useState(false);

  // Initialize Data from API
  const fetchAllData = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [prods, locs, custs, supps, salesData, transfersData, tiers] = await Promise.all([
        getProducts(token),
        getLocations(token),
        getCustomers(token),
        getSuppliers(token),
        getSales(token),
        getTransfers(token),
        getTaxTiers(token)
      ]);
      setProducts(prods);
      setLocations(locs);
      setCustomers(custs);
      setSuppliers(supps);
      setSales(salesData);
      setTransfers(transfersData);
      setTaxTiers(tiers);
      // Removed initial "Data Synced" msg to avoid spam on auto-refresh
    } catch (err) {
      console.error("Failed to load data", err);
      // Only logout on 401? For now keep simple
      if ((err as any)?.response?.status === 401) {
        setToken(null);
        setCurrentUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const reloadContext = () => fetchAllData();

  const loginUser = (newToken: string, user: User) => {
    setToken(newToken);
    setCurrentUser(user);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const logoutUser = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setProducts([]);
  };



  // --- RBAC Filtering ---

  const locations = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === Role.SUPER_ADMIN) return rawLocations;
    if (currentUser.role === Role.WAREHOUSE_OWNER) return rawLocations.filter(l => l.tenantId === currentUser.tenantId);
    if (currentUser.role === Role.WAREHOUSE_MANAGER) return rawLocations.filter(l => currentUser.managedLocationIds?.includes(l.id));
    return [];
  }, [rawLocations, currentUser]);

  const sales = useMemo(() => {
    const visibleLocIds = locations.map(l => l.id);
    return rawSales.filter(s => visibleLocIds.includes(s.locationId));
  }, [rawSales, locations]);

  const transfers = useMemo(() => {
    const visibleLocIds = locations.map(l => l.id);
    return rawTransfers.filter(t => visibleLocIds.includes(t.fromLocationId) || visibleLocIds.includes(t.toLocationId));
  }, [rawTransfers, locations]);


  const addNotification = (type: Notification['type'], message: string, details?: string) => {
    const newNotif: Notification = {
      id: `not-${Date.now()}-${Math.random()}`,
      type,
      message,
      timestamp: Date.now(),
      details
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // Keep last 50
  };

  const addSupplier = (supplier: Supplier) => {
    setSuppliers(prev => [...prev, supplier]);
    addNotification('SUCCESS', `Supplier Added: ${supplier.name}`);
  };

  const addLocation = (loc: Location) => {
    // Auto-assign tenant ID if created by an Owner
    const newLoc = { ...loc };
    if (currentUser.role === Role.WAREHOUSE_OWNER && currentUser.tenantId) {
      newLoc.tenantId = currentUser.tenantId;
    }
    setLocations(prev => [...prev, newLoc]);
    addNotification('SUCCESS', `New Location Created: ${newLoc.name}`);
  };

  const addProduct = async (product: Product) => {
    if (!token) return;
    try {
      const newProd = await apiCreateProduct(token, product);
      // setProducts(prev => [...prev, newProd]); // Rely on reload for SSOT
      addNotification('SUCCESS', `Product Added: ${newProd.name}`, `SKU: ${newProd.sku}`);
      reloadContext();
    } catch (e) {
      addNotification('ERROR', 'Failed to add product');
    }
  };

  const updateProduct = async (product: Product) => {
    if (!token) return;
    try {
      const updated = await apiUpdateProduct(token, product.id, product);
      // setProducts(prev => prev.map(p => p.id === product.id ? updated : p));
      addNotification('INFO', `Product Updated: ${updated.name}`);
      reloadContext();
    } catch (e) {
      addNotification('ERROR', 'Failed to update product');
    }
  };

  const deleteProducts = (productIds: string[]) => {
    // Ideally this should be an API call
    setProducts(prev => prev.filter(p => !productIds.includes(p.id)));
    // Since we don't have delete API wired up here yet properly in context (it was optimistic), 
    // we would call API then reload. For now, local state.
    addNotification('WARNING', `${productIds.length} Products Deleted`);
    // reloadContext(); // Uncomment when delete API is integrated
  };

  const updateStock = async (productId: string, locationId: string, quantityChange: number) => {
    const product = products.find(p => p.id === productId);
    if (!product || !token) return;

    const currentStock = product.stock[locationId] || 0;
    const newStock = Math.max(0, currentStock + quantityChange);

    // Optimistic Update
    const updatedProduct = {
      ...product,
      stock: {
        ...product.stock,
        [locationId]: newStock
      }
    };

    setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));

    try {
      await apiUpdateProduct(token, productId, updatedProduct);
      // Low Stock Notification
      if (newStock <= product.minStockLevel && currentStock > product.minStockLevel) {
        const locName = rawLocations.find(l => l.id === locationId)?.name;
        addNotification('WARNING', `Low Stock Alert: ${product.name}`, `Location: ${locName}. Remaining: ${newStock}`);
      }
    } catch (e) {
      console.error("Failed to sync stock update", e);
      // Revert on failure (simple revert)
      setProducts(prev => prev.map(p => p.id === productId ? product : p));
      addNotification('ERROR', 'Stock update failed', 'Reverting changes');
    }
  };

  const transferStock = (productId: string, fromLocId: string, toLocId: string, quantity: number, notes?: string) => {
    let success = false;
    let failReason = '';
    const fromLocName = rawLocations.find(l => l.id === fromLocId)?.name;
    const toLocName = rawLocations.find(l => l.id === toLocId)?.name;

    // Check stock first
    const product = products.find(p => p.id === productId);
    if (product) {
      const currentStock = product.stock[fromLocId] || 0;
      if (currentStock >= quantity) {
        success = true;
      } else {
        failReason = `Insufficient stock in ${fromLocName}. Requested: ${quantity}, Available: ${currentStock}`;
      }
    } else {
      failReason = 'Product not found';
    }

    if (success && token) {
      // Optimistic updates done above (refactor for API later if needed, but for now just update transfer list)
      // Actually, updateStock handles the product update API calls individually if we reused it? 
      // But here we did manual setProducts. 
      // Let's manually call updateProduct API for the modified product.

      const updatedProduct = products.find(p => p.id === productId);
      if (updatedProduct) {
        const fromStock = updatedProduct.stock[fromLocId] || 0;
        const toStock = updatedProduct.stock[toLocId] || 0;
        const newProductState = {
          ...updatedProduct,
          stock: {
            ...updatedProduct.stock,
            [fromLocId]: fromStock - quantity,
            [toLocId]: toStock + quantity
          }
        };
        // Optimistic UI
        setProducts(prev => prev.map(p => p.id === productId ? newProductState : p));
        apiUpdateProduct(token, productId, newProductState).catch(err => console.error("Transfer stock sync failed", err));
      }

      const newTransfer: Transfer = {
        id: `trf-${Date.now()}`,
        productId,
        fromLocationId: fromLocId,
        toLocationId: toLocId,
        quantity,
        date: new Date().toISOString(),
        timestamp: Date.now(),
        status: success ? 'COMPLETED' : 'FAILED',
        reason: failReason,
        notes: notes || ''
      };

      createTransfer(token, newTransfer)
        .then(savedTransfer => {
          setTransfers(prev => [savedTransfer, ...prev]);
          addNotification('SUCCESS', 'Stock Transfer Successful');
        })
        .catch(() => addNotification('ERROR', 'Failed to save transfer'));

    } else {
      addNotification('ERROR', 'Stock Transfer Failed', failReason);
    }
  };

  const addCustomer = async (customer: Customer) => {
    if (!token) return;
    try {
      const newCust = await createCustomer(token, customer);
      setCustomers(prev => [...prev, newCust]);
      addNotification('SUCCESS', `New Customer Added: ${newCust.name}`);
    } catch (e) {
      addNotification('ERROR', 'Failed to add customer');
    }
  };

  const updateCustomer = (customer: Customer) => {
    // API not implemented for updateCustomer yet, keep local
    setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
    addNotification('INFO', `Customer Updated: ${customer.name}`);
  };

  const addSale = async (sale: Sale) => {
    if (!token) return;

    // 1. Save Sale to DB
    try {
      const savedSale = await createSale(token, sale);
      setSales(prev => [...prev, savedSale]);
      addNotification('SUCCESS', `New Sale Recorded: ₹${savedSale.totalAmount}`, `Invoice: ${savedSale.id}`);

      // 2. Deduct stock for sold items (handled via updateStock individually)
      // Note: Ideally this should be one transaction in backend, but for now we chain calls
      sale.items.forEach(item => {
        updateStock(item.id, sale.locationId, -item.quantity);
      });

      // 3. Handle Loyalty
      if (sale.customerId) {
        // We'd update customer API here technically, but reusing updateCustomer (local) for now or assume simple state update. 
        // In real app, re-fetch customer or patch.
        const pointsEarned = Math.floor(sale.totalAmount / 100);
        setCustomers(prev => prev.map(c => {
          if (c.id === sale.customerId) {
            return {
              ...c,
              loyaltyPoints: c.loyaltyPoints + pointsEarned,
              totalPurchases: c.totalPurchases + sale.totalAmount
            };
          }
          return c;
        }));
      }

    } catch (e) {
      addNotification('ERROR', 'Failed to record sale');
    }
  };

  const setSalesTarget = (target: SalesTarget) => {
    setSalesTargets(prev => {
      const existingIdx = prev.findIndex(t => t.locationId === target.locationId && t.month === target.month);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = target;
        return updated;
      }
      return [...prev, target];
    });
    addNotification('INFO', 'Sales Target Updated');
  };

  const addTaxTier = (tier: TaxTier) => {
    setTaxTiers(prev => [...prev, tier]);
    addNotification('INFO', `New Tax Tier Added: ${tier.name}`);
  };

  const deleteTaxTier = (id: string) => {
    setTaxTiers(prev => prev.filter(t => t.id !== id));
    addNotification('WARNING', 'Tax Tier Deleted');
  };

  const addGoal = (text: string, deadline?: string) => {
    setGoals(prev => [...prev, { id: `g-${Date.now()}`, text, status: 'Pending', deadline }]);
  };

  const updateGoal = (id: string, text: string) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, text } : g));
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  return (
    <AppContext.Provider value={{
      currentUser, token, loginUser, logoutUser,
      products, locations, addLocation, sales, transfers, customers, salesTargets, taxTiers, notifications, suppliers, addSupplier, goals,
      addProduct, updateProduct, deleteProducts, updateStock, transferStock, addSale,
      addCustomer, updateCustomer, setSalesTarget, addTaxTier, deleteTaxTier, addNotification,
      addGoal, updateGoal, deleteGoal, theme, toggleTheme, reloadContext
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
