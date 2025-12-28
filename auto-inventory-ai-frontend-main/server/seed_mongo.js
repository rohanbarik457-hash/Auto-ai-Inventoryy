const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB Connection URI - Change if needed
const MONGO_URI = 'mongodb://localhost:27017/hanuman_traders';

// --- Schemas ---
// Keeping schemas consistent with server.js

const RoleSchema = new mongoose.Schema({
    id: String,
    name: String,
    permissions: [String],
    is_system: Boolean
});

const UserSchema = new mongoose.Schema({
    id: String,
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    tenant_id: String,
    managed_location_ids: [String],
    permissions: [String]
});

const LocationSchema = new mongoose.Schema({
    id: String,
    name: String,
    tenant_id: String,
    type: String,
    address: String
});

const ProductSchema = new mongoose.Schema({
    id: String,
    name: String,
    sku: String,
    category: String,
    price: Number,
    cost: Number,
    stock: { type: Map, of: Number },
    tenant_id: String,
    minStockLevel: { type: Number, default: 10 },
    taxRate: Number,
    supplier: String,
    expiryDate: String, // Added for expiring logic
    lastSaleDate: String // Added for Dead Stock logic
});

const CustomerSchema = new mongoose.Schema({
    id: String,
    name: String,
    phone: String,
    email: String,
    gstNumber: String,
    address: String,
    loyaltyPoints: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 }
});

const SupplierSchema = new mongoose.Schema({
    id: String,
    name: String,
    contactPerson: String,
    phone: String,
    email: String,
    address: String,
    category: String,
    rating: Number,
    paymentTerms: String,
    lastSupplyDate: String
});

const SaleSchema = new mongoose.Schema({
    id: String,
    date: String,
    items: [],
    totalAmount: Number,
    totalTax: Number,
    subtotal: Number,
    customerId: String,
    customerName: String,
    locationId: String,
    paymentMethod: String,
    transactionId: String
});

const TransferSchema = new mongoose.Schema({
    id: String,
    productId: String,
    fromLocationId: String,
    toLocationId: String,
    quantity: Number,
    date: String,
    timestamp: Number,
    status: String,
    reason: String,
    notes: String
});

const TaxTierSchema = new mongoose.Schema({
    id: String,
    name: String,
    categoryType: String,
    rate: Number,
    cgst: Number,
    sgst: Number
});


// --- Models ---
const Role = mongoose.model('Role', RoleSchema);
const User = mongoose.model('User', UserSchema);
const Location = mongoose.model('Location', LocationSchema);
const Product = mongoose.model('Product', ProductSchema);
const Customer = mongoose.model('Customer', CustomerSchema);
const Supplier = mongoose.model('Supplier', SupplierSchema);
const Sale = mongoose.model('Sale', SaleSchema);
const Transfer = mongoose.model('Transfer', TransferSchema);
const TaxTier = mongoose.model('TaxTier', TaxTierSchema);

// --- Data Constants ---

const ROLES = [
    { id: 'role-super-admin', name: 'Super Admin', permissions: ['all'], is_system: true },
    { id: 'role-wh-owner', name: 'Warehouse Owner', permissions: ['dashboard', 'inventory', 'sales', 'reports', 'users', 'settings'], is_system: true },
    { id: 'role-wh-manager', name: 'Warehouse Manager', permissions: ['dashboard', 'inventory', 'sales'], is_system: true },
    { id: 'role-staff', name: 'Staff', permissions: ['sales'], is_system: true }
];

const LOCATIONS = [
    { id: 'loc-1', name: 'Main Warehouse', address: 'Industrial Area, Sector 4, New Delhi', type: 'WAREHOUSE', tenant_id: 'tenant-1' },
    { id: 'loc-2', name: 'City Center Store', address: 'Market Road, Shop 12, Mumbai', type: 'STORE', tenant_id: 'tenant-1' },
    { id: 'loc-3', name: 'North Branch', address: 'Highway 5, Exit 2, Chandigarh', type: 'STORE', tenant_id: 'tenant-2' }
];

const TAX_TIERS = [
    { id: 'tax-0', name: 'Exempt', categoryType: 'Essential', rate: 0, cgst: 0, sgst: 0 },
    { id: 'tax-5', name: 'GST 5%', categoryType: 'Essential', rate: 5, cgst: 2.5, sgst: 2.5 },
    { id: 'tax-12', name: 'GST 12%', categoryType: 'Standard', rate: 12, cgst: 6, sgst: 6 },
    { id: 'tax-18', name: 'GST 18%', categoryType: 'Standard', rate: 18, cgst: 9, sgst: 9 },
    { id: 'tax-28', name: 'GST 28%', categoryType: 'Luxury', rate: 28, cgst: 14, sgst: 14 },
];

const CUSTOMERS = [
    { id: 'cust-1', name: 'Rajesh Kumar', email: 'rajesh@example.com', gstNumber: '29ABCDE1234F1Z5', address: '123, MG Road, Mumbai', phone: '9876543210', loyaltyPoints: 120, totalPurchases: 15000 },
    { id: 'cust-2', name: 'Priya Singh', email: 'priya@example.com', gstNumber: '', address: '45, Civil Lines, Delhi', phone: '9988776655', loyaltyPoints: 45, totalPurchases: 5000 },
    { id: 'cust-3', name: 'Amitabh Bachchan', email: 'bigb@example.com', gstNumber: '27AAAAA0000A1Z5', address: 'Juhu, Mumbai', phone: '9123456789', loyaltyPoints: 300, totalPurchases: 45000 },
    { id: 'cust-4', name: 'Deepika P', email: 'dp@example.com', gstNumber: '', address: 'Bangalore', phone: '9988001122', loyaltyPoints: 10, totalPurchases: 1200 },
];

const SUPPLIERS_BASE = [
    { id: 'sup-1', name: 'AgroFields Ltd', contactPerson: 'Vikram Singh', phone: '9876543210', email: 'orders@agrofields.in', address: 'Punjab, India', rating: 4.5, category: 'Grains', paymentTerms: 'Net 30' },
    { id: 'sup-2', name: 'PurePress Oils', contactPerson: 'Anita Desai', phone: '9988776655', email: 'sales@purepress.com', address: 'Gujarat, India', rating: 4.8, category: 'Oils', paymentTerms: 'Immediate' },
    { id: 'sup-3', name: 'Golden Harvest', contactPerson: 'Rahul Roy', phone: '9123456789', email: 'rahul@goldenharvest.com', address: 'MP, India', rating: 3.9, category: 'Grains', paymentTerms: 'Net 15' },
    { id: 'sup-4', name: 'Dal Mills Corp', contactPerson: 'Suresh Raina', phone: '8899001122', email: 'supply@dalmills.com', address: 'Maharashtra, India', rating: 4.2, category: 'Pulses', paymentTerms: 'Net 45' },
    { id: 'sup-5', name: 'FreshDairy Co', contactPerson: 'Amulya V', phone: '7766554433', email: 'fresh@dairy.com', address: 'Haryana, India', rating: 4.9, category: 'Dairy', paymentTerms: 'Net 7' },
];

const CATEGORIES = ['Vegetables', 'Fruits', 'Dairy', 'Grains', 'Snacks', 'Beverages', 'Spices', 'Packaged Goods'];
const ADJECTIVES = ['Fresh', 'Organic', 'Premium', 'Local', 'Imported', 'Green', 'Red', 'Yellow'];
const NOUNS = [
    ['Tomato', 'Potato', 'Onion', 'Spinach', 'Carrot', 'Cauliflower', 'Peas', 'Okra'], // Veg
    ['Banana', 'Apple', 'Mango', 'Orange', 'Grapes', 'Papaya', 'Guava', 'Pomegranate'], // Fruit
    ['Milk', 'Curd', 'Paneer', 'Butter', 'Cheese', 'Cream', 'Ghee', 'Yogurt'], // Dairy
    ['Rice', 'Wheat Flour', 'Dal', 'Chickpeas', 'Oats', 'Corn', 'Bajra', 'Mustard Seeds'], // Grains
    ['Chips', 'Biscuits', 'Namkeen', 'Popcorn', 'Chocolate', 'Cookies', 'Nuts', 'Crackers'], // Snacks
    ['Tea', 'Coffee', 'Juice', 'Soda', 'Water', 'Milkshake', 'Lassi', 'Energy Drink'], // Bev
    ['Turmeric', 'Chilli Powder', 'Cumin', 'Coriander', 'Salt', 'Pepper', 'Cardamom', 'Cloves'], // Spices
    ['Oil', 'Sugar', 'Salt', 'Pasta', 'Noodles', 'Ketchup', 'Jam', 'Honey'] // Packaged
];

// --- Helper Functions ---

const getDate = (daysOffset) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
};

function generateProducts(count) {
    const products = [];
    let idCounter = 1;

    for (let i = 0; i < count; i++) {
        const catIdx = Math.floor(Math.random() * CATEGORIES.length);
        const category = CATEGORIES[catIdx];
        const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
        const nounList = NOUNS[catIdx] || NOUNS[7];
        const noun = nounList[Math.floor(Math.random() * nounList.length)];

        const name = `${adj} ${noun}`;
        const basePrice = 10 + Math.floor(Math.random() * 500);
        const cost = Math.floor(basePrice * 0.7);

        const stock = {};
        LOCATIONS.forEach(loc => {
            if (Math.random() > 0.3) {
                stock[loc.id] = Math.floor(Math.random() * 1000);
            } else {
                stock[loc.id] = 0;
            }
        });

        const taxRate = [0, 5, 12, 18][Math.floor(Math.random() * 4)];
        const supplier = SUPPLIERS_BASE[Math.floor(Math.random() * SUPPLIERS_BASE.length)].name;

        // Determine Expiry Date
        // 10% Expired, 20% Expiring Soon (0-30 days), 20% No Expiry (Non-perishable), 50% Safe (Future)
        let expiryDate = null;
        const rand = Math.random();

        if (rand < 0.1) {
            // Expired (1-60 days ago)
            expiryDate = getDate(-Math.floor(Math.random() * 60) - 1);
        } else if (rand < 0.3) {
            // Expiring Soon (1-30 days from now)
            expiryDate = getDate(Math.floor(Math.random() * 30) + 1);
        } else if (rand < 0.8) {
            // Safe (2-12 months from now)
            expiryDate = getDate(Math.floor(Math.random() * 300) + 60);
        }
        // Else null (Non-perishable)

        products.push({
            id: `prod-${idCounter++}-${Date.now()}`,
            name: `${name} (${Math.floor(Math.random() * 100)}g)`,
            sku: `SKU-${category.substring(0, 3).toUpperCase()}-${idCounter}`,
            category,
            price: basePrice,
            cost,
            stock,
            tenant_id: 'tenant-1',
            minStockLevel: Math.floor(Math.random() * 50) + 10,
            taxRate,
            supplier,
            expiryDate
        });
    }
    return products;
}

function generateSales(products, customers) {
    const salesData = [];
    const today = new Date();

    // Generate sales for last 60 days
    for (let i = 0; i < 60; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dailyTransactionCount = Math.floor(Math.random() * 5) + 1;

        for (let t = 0; t < dailyTransactionCount; t++) {
            const locationId = Math.random() > 0.5 ? 'loc-2' : 'loc-3';
            const customer = Math.random() > 0.4 ? customers[Math.floor(Math.random() * customers.length)] : null;

            const itemCount = Math.floor(Math.random() * 4) + 1;
            const saleItems = [];
            let subtotal = 0;
            let tax = 0;

            for (let k = 0; k < itemCount; k++) {
                // Pick from first 70% of products to leave 30% as "Dead Stock"
                const activeProductCount = Math.floor(products.length * 0.7);
                const prod = products[Math.floor(Math.random() * activeProductCount)];
                if (!prod) continue;

                const qty = Math.floor(Math.random() * 5) + 1;
                const itemTotal = prod.price * qty;
                const itemTax = itemTotal * (prod.taxRate / 100);

                saleItems.push({
                    id: prod.id,
                    name: prod.name,
                    price: prod.price,
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
                customerId: customer?.id,
                customerName: customer?.name,
                paymentMethod: method,
                transactionId: `TXN${Date.now()}${i}${t}`
            });
        }
    }
    return salesData;
}

function generateTransfers(products) {
    const transfers = [];
    for (let i = 0; i < 20; i++) {
        const prod = products[Math.floor(Math.random() * products.length)];
        const daysAgo = Math.floor(Math.random() * 60);
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
            status: Math.random() > 0.8 ? 'FAILED' : 'COMPLETED',
            reason: 'Replenishment',
            notes: 'Auto-generated seed transfer'
        });
    }
    return transfers;
}


async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear All
        await Promise.all([
            Role.deleteMany({}),
            User.deleteMany({}),
            Location.deleteMany({}),
            Product.deleteMany({}),
            Customer.deleteMany({}),
            Supplier.deleteMany({}),
            Sale.deleteMany({}),
            Transfer.deleteMany({}),
            TaxTier.deleteMany({})
        ]);
        console.log('Cleared existing data');

        // Insert Static Data
        await Role.insertMany(ROLES);
        await Location.insertMany(LOCATIONS);
        await Customer.insertMany(CUSTOMERS);
        await TaxTier.insertMany(TAX_TIERS);

        const suppliersWithDates = SUPPLIERS_BASE.map(s => ({
            ...s,
            lastSupplyDate: getDate(-Math.floor(Math.random() * 30))
        }));
        await Supplier.insertMany(suppliersWithDates);

        // Insert Users
        const passwordHash = await bcrypt.hash('password123', 10);
        const USERS = [
            { id: 'u-admin', name: 'Super Admin', email: 'admin@hanuman.com', password: passwordHash, role: 'SUPER_ADMIN', permissions: [] },
            { id: 'u-owner-1', name: 'Rajesh (Owner)', email: 'rajesh@tenant1.com', password: passwordHash, role: 'WAREHOUSE_OWNER', tenant_id: 'tenant-1', permissions: [] },
            { id: 'u-manager-1', name: 'Suresh (Mgr)', email: 'suresh@tenant1.com', password: passwordHash, role: 'WAREHOUSE_MANAGER', tenant_id: 'tenant-1', managed_location_ids: ['loc-2'], permissions: [] }
        ];
        await User.insertMany(USERS);

        // Insert Products
        const generatedProducts = generateProducts(120);
        await Product.insertMany(generatedProducts);
        console.log(`Inserted ${generatedProducts.length} Products`);

        // Insert Sales
        const generatedSales = generateSales(generatedProducts, CUSTOMERS);
        await Sale.insertMany(generatedSales);
        console.log(`Inserted ${generatedSales.length} Sales transactions`);

        // UPDATE PRODUCTS WITH LAST SALE DATE
        console.log("Updating product last sale dates...");
        const productUpdates = generatedProducts.map(p => {
            // Find all sales for this product
            const productSales = generatedSales
                .filter(s => s.items.some(i => i.id === p.id))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const lastSaleDate = productSales.length > 0 ? productSales[0].date : null;
            return {
                updateOne: {
                    filter: { id: p.id },
                    update: { $set: { lastSaleDate: lastSaleDate } }
                }
            };
        });

        await Product.bulkWrite(productUpdates);
        console.log("Product last sale dates updated.");

        // UPDATE CUSTOMERS WITH TOTAL SPENT & LOYALTY
        console.log("Updating customer totals...");
        const customerUpdates = CUSTOMERS.map(c => {
            const customerSales = generatedSales.filter(s => s.customerId === c.id);
            const totalSpent = customerSales.reduce((sum, s) => sum + s.totalAmount, 0);
            const loyaltyPoints = Math.floor(totalSpent / 100); // 1 pt per 100rs

            return {
                updateOne: {
                    filter: { id: c.id },
                    update: {
                        $set: {
                            totalPurchases: totalSpent,
                            loyaltyPoints: loyaltyPoints
                        }
                    }
                }
            };
        });
        await Customer.bulkWrite(customerUpdates);
        console.log("Customer totals updated.");

        // Insert Transfers
        const generatedTransfers = generateTransfers(generatedProducts);
        await Transfer.insertMany(generatedTransfers);
        console.log(`Inserted ${generatedTransfers.length} Transfers`);

        console.log('Seeding Complete! Press Ctrl+C to exit.');
        process.exit(0);

    } catch (err) {
        console.error('Seeding Error:', err);
        process.exit(1);
    }
}

seed();
