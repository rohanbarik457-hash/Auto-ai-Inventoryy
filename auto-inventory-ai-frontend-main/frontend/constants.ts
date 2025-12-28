
import { Location, Product, Sale, Customer, SalesTarget, Transfer, TaxTier, Supplier, User, Role } from './types';

export const LOCATIONS: Location[] = [
  { id: 'loc-1', name: 'Main Warehouse', address: 'Industrial Area, Sector 4, New Delhi', type: 'WAREHOUSE', tenantId: 'tenant-1' },
  { id: 'loc-2', name: 'City Center Store', address: 'Market Road, Shop 12, Mumbai', type: 'STORE', tenantId: 'tenant-1' },
  { id: 'loc-3', name: 'North Branch', address: 'Highway 5, Exit 2, Chandigarh', type: 'STORE', tenantId: 'tenant-2' },
];

export const MOCK_USERS: User[] = [
  { id: 'u-admin', name: 'Super Admin', email: 'admin@hanuman.com', role: Role.SUPER_ADMIN },
  { id: 'u-owner-1', name: 'Rajesh (Owner)', email: 'rajesh@tenant1.com', role: Role.WAREHOUSE_OWNER, tenantId: 'tenant-1' },
  { id: 'u-manager-1', name: 'Suresh (Mgr - City Ctr)', email: 'suresh@tenant1.com', role: Role.WAREHOUSE_MANAGER, tenantId: 'tenant-1', managedLocationIds: ['loc-2'] },
  { id: 'u-owner-2', name: 'Vikram (Owner)', email: 'vikram@tenant2.com', role: Role.WAREHOUSE_OWNER, tenantId: 'tenant-2' },
];



// ...

export const MOCK_TENANT2_PRODUCTS: Product[] = [
  // Unique data for Tenant 2 to demonstrate isolation
  {
    id: 'prod-t2-1',
    name: 'Shimla Apples (Crate)',
    sku: 'FRT-APL-SHIM',
    category: 'Fruits',
    price: 1500,
    cost: 1000,
    hsnCode: '080810',
    taxRate: 5,
    stock: { 'loc-3': 50 }, // Only available in Tenant 2's location
    minStockLevel: 5,
    leadTimeDays: 2,
    supplier: 'Himachal Orchards',
    status: 'Active',
    unit: 'crate'
  },
  {
    id: 'prod-t2-2',
    name: 'Woolen Shawl (Handmade)',
    sku: 'CLT-SHWL-01',
    category: 'Clothing',
    price: 2500,
    cost: 1200,
    hsnCode: '621420',
    taxRate: 12,
    stock: { 'loc-3': 20 },
    minStockLevel: 2,
    leadTimeDays: 10,
    supplier: 'Local Artisans',
    status: 'Active',
    unit: 'pcs'
  }
];


export const DEFAULT_TAX_TIERS: TaxTier[] = [
  { id: 'tax-0', name: 'Exempt', categoryType: 'Essential', rate: 0, cgst: 0, sgst: 0 },
  { id: 'tax-5', name: 'GST 5%', categoryType: 'Essential', rate: 5, cgst: 2.5, sgst: 2.5 },
  { id: 'tax-12', name: 'GST 12%', categoryType: 'Standard', rate: 12, cgst: 6, sgst: 6 },
  { id: 'tax-18', name: 'GST 18%', categoryType: 'Standard', rate: 18, cgst: 9, sgst: 9 },
  { id: 'tax-28', name: 'GST 28%', categoryType: 'Luxury', rate: 28, cgst: 14, sgst: 14 },
];

// Helper to get date relative to today (days offset)
const getDate = (daysOffset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 'sup-1', name: 'AgroFields Ltd', contactPerson: 'Vikram Singh', phone: '9876543210', email: 'orders@agrofields.in', address: 'Punjab, India', rating: 4.5, category: 'Grains', paymentTerms: 'Net 30', lastSupplyDate: getDate(-5) },
  { id: 'sup-2', name: 'PurePress Oils', contactPerson: 'Anita Desai', phone: '9988776655', email: 'sales@purepress.com', address: 'Gujarat, India', rating: 4.8, category: 'Oils', paymentTerms: 'Immediate', lastSupplyDate: getDate(-12) },
  { id: 'sup-3', name: 'Golden Harvest', contactPerson: 'Rahul Roy', phone: '9123456789', email: 'rahul@goldenharvest.com', address: 'MP, India', rating: 3.9, category: 'Grains', paymentTerms: 'Net 15', lastSupplyDate: getDate(-20) },
  { id: 'sup-4', name: 'Dal Mills Corp', contactPerson: 'Suresh Raina', phone: '8899001122', email: 'supply@dalmills.com', address: 'Maharashtra, India', rating: 4.2, category: 'Pulses', paymentTerms: 'Net 45', lastSupplyDate: getDate(-2) },
  { id: 'sup-5', name: 'FreshDairy Co', contactPerson: 'Amulya V', phone: '7766554433', email: 'fresh@dairy.com', address: 'Haryana, India', rating: 4.9, category: 'Dairy', paymentTerms: 'Net 7', lastSupplyDate: getDate(-1) },
  { id: 'sup-6', name: 'SpiceWorld', contactPerson: 'Karan Johar', phone: '9988223344', email: 'trade@spiceworld.com', address: 'Kerala, India', rating: 4.0, category: 'Spices', paymentTerms: 'Net 30', lastSupplyDate: getDate(-45) },
  { id: 'sup-7', name: 'SweetCane Ltd', contactPerson: 'Priya Mani', phone: '8877665544', email: 'orders@sweetcane.com', address: 'UP, India', rating: 3.5, category: 'Pantry', paymentTerms: 'Net 60', lastSupplyDate: getDate(-60) },
];

export const INITIAL_PRODUCTS: Product[] = [
  ...MOCK_TENANT2_PRODUCTS,
  {
    id: 'prod-1',
    name: 'Basmati Rice (Premium)',
    sku: 'GRN-RICE-001',
    category: 'Grains',
    price: 120,
    cost: 95,
    hsnCode: '100630',
    taxRate: 5,
    stock: { 'loc-1': 500, 'loc-2': 50, 'loc-3': 20 },
    minStockLevel: 100,
    minStockThresholds: { 'loc-2': 30, 'loc-3': 15 },
    maxStockLevel: 1000,
    leadTimeDays: 7,
    supplier: 'AgroFields Ltd',
    expiryDate: getDate(365),
    barcode: '8901234567890',
    status: 'Active',
    lastSaleDate: getDate(-1),
    unit: 'kg'
  },
  {
    id: 'prod-2',
    name: 'Sunflower Oil (1L)',
    sku: 'OIL-SUN-002',
    category: 'Oils',
    price: 180,
    cost: 140,
    hsnCode: '151211',
    taxRate: 5,
    stock: { 'loc-1': 200, 'loc-2': 40, 'loc-3': 15 },
    minStockLevel: 50,
    maxStockLevel: 500,
    leadTimeDays: 14,
    supplier: 'PurePress Oils',
    expiryDate: getDate(180),
    barcode: '8909876543210',
    status: 'Active',
    lastSaleDate: getDate(-2),
    unit: 'liter'
  },
  {
    id: 'prod-3',
    name: 'Wheat Flour (Atta 10kg)',
    sku: 'GRN-WHT-003',
    category: 'Grains',
    price: 450,
    cost: 380,
    hsnCode: '110100',
    taxRate: 0,
    stock: { 'loc-1': 100, 'loc-2': 10, 'loc-3': 5 },
    minStockLevel: 30,
    maxStockLevel: 200,
    leadTimeDays: 5,
    supplier: 'Golden Harvest',
    expiryDate: getDate(20),
    status: 'Active',
    lastSaleDate: getDate(-5),
    unit: 'kg'
  },
  {
    id: 'prod-4',
    name: 'Masoor Dal (1kg)',
    sku: 'PLS-MAS-004',
    category: 'Pulses',
    price: 90,
    cost: 65,
    hsnCode: '071340',
    taxRate: 5,
    stock: { 'loc-1': 300, 'loc-2': 80, 'loc-3': 60 },
    minStockLevel: 80,
    maxStockLevel: 400,
    leadTimeDays: 10,
    supplier: 'Dal Mills Corp',
    expiryDate: getDate(200),
    status: 'Active',
    lastSaleDate: getDate(-10),
    unit: 'kg'
  },
  {
    id: 'prod-5',
    name: 'Milk (Tetra Pack 1L)',
    sku: 'DRY-MLK-005',
    category: 'Dairy',
    price: 75,
    cost: 60,
    hsnCode: '040120',
    taxRate: 5,
    stock: { 'loc-1': 50, 'loc-2': 12, 'loc-3': 8 },
    minStockLevel: 40,
    maxStockLevel: 150,
    leadTimeDays: 3,
    supplier: 'FreshDairy Co',
    expiryDate: getDate(5),
    status: 'Active',
    lastSaleDate: getDate(0),
    unit: 'liter'
  },
  {
    id: 'prod-6',
    name: 'Turmeric Powder (500g)',
    sku: 'SPC-TUR-006',
    category: 'Spices',
    price: 150,
    cost: 110,
    hsnCode: '091030',
    taxRate: 5,
    stock: { 'loc-1': 400, 'loc-2': 100, 'loc-3': 50 },
    minStockLevel: 50,
    maxStockLevel: 600,
    leadTimeDays: 15,
    supplier: 'SpiceWorld',
    expiryDate: getDate(500),
    status: 'Active',
    lastSaleDate: getDate(-15),
    unit: 'kg'
  },
  {
    id: 'prod-7',
    name: 'Sugar (5kg)',
    sku: 'PAN-SUG-007',
    category: 'Pantry',
    price: 220,
    cost: 190,
    hsnCode: '170199',
    taxRate: 5,
    stock: { 'loc-1': 10, 'loc-2': 5, 'loc-3': 0 },
    minStockLevel: 50,
    maxStockLevel: 300,
    leadTimeDays: 7,
    supplier: 'SweetCane Ltd',
    expiryDate: getDate(700),
    status: 'Seasonal',
    lastSaleDate: getDate(-400), // Dead stock (>365 days)
    unit: 'kg'
  },
  {
    id: 'prod-8',
    name: 'Old Monsoon Umbrella',
    sku: 'ACC-UMB-008',
    category: 'Accessories',
    price: 350,
    cost: 200,
    hsnCode: '660199',
    taxRate: 12,
    stock: { 'loc-1': 100, 'loc-2': 20, 'loc-3': 10 },
    minStockLevel: 10,
    maxStockLevel: 50,
    leadTimeDays: 20,
    supplier: 'General Supplies',
    expiryDate: getDate(1000),
    status: 'Discontinued',
    lastSaleDate: getDate(-450), // Dead stock (>365 days)
    unit: 'pcs'
  },
  {
    id: 'prod-9',
    name: 'Winter Jacket (2023 Model)',
    sku: 'CLT-JKT-009',
    category: 'Clothing',
    price: 1200,
    cost: 800,
    hsnCode: '620190',
    taxRate: 12,
    stock: { 'loc-1': 50, 'loc-2': 5, 'loc-3': 2 },
    minStockLevel: 5,
    maxStockLevel: 100,
    leadTimeDays: 30,
    supplier: 'Fashion Hub',
    expiryDate: getDate(9999),
    status: 'Discontinued',
    lastSaleDate: getDate(-500), // Dead stock (>365 days)
    unit: 'pcs'
  }
];

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'Rajesh Kumar', email: 'rajesh@example.com', gstNumber: '29ABCDE1234F1Z5', address: '123, MG Road, Mumbai', phone: '9876543210', loyaltyPoints: 120, totalPurchases: 15000 },
  { id: 'cust-2', name: 'Priya Singh', email: 'priya@example.com', gstNumber: '', address: '45, Civil Lines, Delhi', phone: '9988776655', loyaltyPoints: 45, totalPurchases: 5000 },
  { id: 'cust-3', name: 'Amitabh Bachchan', email: 'bigb@example.com', gstNumber: '27AAAAA0000A1Z5', address: 'Juhu, Mumbai', phone: '9123456789', loyaltyPoints: 300, totalPurchases: 45000 },
  { id: 'cust-4', name: 'Deepika P', email: 'dp@example.com', gstNumber: '', address: 'Bangalore', phone: '9988001122', loyaltyPoints: 10, totalPurchases: 1200 },
];

const generateSales = (): Sale[] => {
  const salesData: Sale[] = [];
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dailyTransactionCount = Math.floor(Math.random() * 4);

    for (let t = 0; t < dailyTransactionCount; t++) {
      const locationId = Math.random() > 0.3 ? 'loc-2' : 'loc-3';
      const customer = Math.random() > 0.5 ? MOCK_CUSTOMERS[Math.floor(Math.random() * MOCK_CUSTOMERS.length)] : null;

      const itemCount = Math.floor(Math.random() * 3) + 1;
      const saleItems = [];
      let subtotal = 0;
      let tax = 0;

      for (let k = 0; k < itemCount; k++) {
        const prod = INITIAL_PRODUCTS[Math.floor(Math.random() * INITIAL_PRODUCTS.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        const itemTotal = prod.price * qty;
        const itemTax = itemTotal * (prod.taxRate / 100);

        saleItems.push({
          ...prod,
          quantity: qty,
          discount: 0
        });
        subtotal += itemTotal;
        tax += itemTax;
      }

      const method = Math.random() > 0.6 ? 'UPI' : (Math.random() > 0.5 ? 'CARD' : 'CASH');

      salesData.push({
        id: `INV-${10000 + i + t}`,
        date: dateStr,
        locationId,
        items: saleItems,
        subtotal,
        totalTax: tax,
        totalAmount: subtotal + tax,
        billDiscount: 0,
        customerId: customer?.id,
        customerName: customer?.name,
        paymentMethod: method,
        transactionId: `TXN${Date.now()}${i}${t}`
      });
    }
  }
  return salesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const MOCK_SALES: Sale[] = generateSales();

const generateTransfers = (): Transfer[] => {
  const transfers: Transfer[] = [];
  // Generate transfers for the last 365 days
  for (let i = 0; i < 80; i++) {
    const prod = INITIAL_PRODUCTS[Math.floor(Math.random() * INITIAL_PRODUCTS.length)];
    const daysAgo = Math.floor(Math.random() * 365);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    transfers.push({
      id: `trf-${i}`,
      productId: prod.id,
      fromLocationId: 'loc-1',
      toLocationId: Math.random() > 0.5 ? 'loc-2' : 'loc-3',
      quantity: Math.floor(Math.random() * 50) + 10,
      date: date.toISOString(),
      timestamp: date.getTime(),
      status: Math.random() > 0.9 ? 'FAILED' : 'COMPLETED',
      reason: Math.random() > 0.9 ? 'Stock Mismatch' : 'Replenishment',
      notes: 'Auto-generated transfer'
    });
  }
  return transfers.sort((a, b) => b.timestamp - a.timestamp);
};

export const MOCK_TRANSFERS: Transfer[] = generateTransfers();

export const SALES_TARGETS: SalesTarget[] = [
  { id: 'tgt-1', locationId: 'loc-2', month: new Date().toISOString().slice(0, 7), targetAmount: 60000 },
  { id: 'tgt-2', locationId: 'loc-3', month: new Date().toISOString().slice(0, 7), targetAmount: 40000 },
  { id: 'tgt-3', locationId: 'loc-2', month: getDate(-30).slice(0, 7), targetAmount: 55000 },
  { id: 'tgt-4', locationId: 'loc-3', month: getDate(-30).slice(0, 7), targetAmount: 35000 },
];
