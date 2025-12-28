const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 5000;
const SECRET_KEY = 'super_secret_key_change_in_prod';
const MONGO_URI = 'mongodb://localhost:27017/hanuman_traders';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Schemas & Models ---

const AuditLog = require('./models/AuditLog');
const Business = require('./models/Business');
const DeletedItem = require('./models/DeletedItem');

const RoleSchema = new mongoose.Schema({
    id: String,
    name: String,
    permissions: [String],
    is_system: Boolean,
    tenant_id: String // Optional: if roles are tenant specific
});
const Role = mongoose.model('Role', RoleSchema);

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
const User = mongoose.model('User', UserSchema);

const LocationSchema = new mongoose.Schema({
    id: String,
    name: String,
    tenant_id: String,
    type: String, // STORE, WAREHOUSE
    address: String
});
const Location = mongoose.model('Location', LocationSchema);

const ProductSchema = new mongoose.Schema({
    id: String,
    name: String,
    sku: String,
    category: String,
    price: Number,
    cost: Number,
    stock: { type: Map, of: Number }, // Map of locationId -> quantity
    tenant_id: String,
    minStockLevel: { type: Number, default: 10 }
});
const Product = mongoose.model('Product', ProductSchema);

const CustomerSchema = new mongoose.Schema({
    id: String,
    name: String,
    phone: String,
    email: String,
    gstNumber: String,
    address: String,
    loyaltyPoints: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 },
    tenant_id: String
});
const Customer = mongoose.model('Customer', CustomerSchema);

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
    lastSupplyDate: String,
    tenant_id: String
});
const Supplier = mongoose.model('Supplier', SupplierSchema);

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
    transactionId: String,
    tenant_id: String
});

// Auto-generate transactionId if missing
SaleSchema.pre('save', function (next) {
    if (!this.transactionId) {
        this.transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    next();
});

const Sale = mongoose.model('Sale', SaleSchema);

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
    notes: String,
    tenant_id: String
});
const Transfer = mongoose.model('Transfer', TransferSchema);

const TaxTierSchema = new mongoose.Schema({
    id: String,
    name: String,
    categoryType: String,
    rate: Number,
    cgst: Number,
    sgst: Number,
    tenant_id: String
});
const TaxTier = mongoose.model('TaxTier', TaxTierSchema);

// --- Auth Routes ---

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user.id, role: user.role, tenantId: user.tenant_id }, SECRET_KEY, { expiresIn: '1h' });

        const userData = user.toObject();
        delete userData.password;
        userData.managedLocationIds = userData.managed_location_ids;

        res.json({ token, user: userData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Middleware ---

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const auditLogger = async (req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const originalSend = res.send;
        res.send = function (body) {
            res.send = originalSend;
            originalSend.apply(res, arguments);
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    const logEntry = new AuditLog({
                        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        userId: req.user ? req.user.id : 'anonymous',
                        action: req.method,
                        resource: req.path.split('/')[2] || 'unknown',
                        resourceId: req.params.id || null,
                        details: { body: req.body, query: req.query },
                        ipAddress: req.ip,
                        tenant_id: req.user ? req.user.tenantId : null
                    });
                    if (logEntry.details.body && logEntry.details.body.password) {
                        logEntry.details.body.password = '[REDACTED]';
                    }
                    logEntry.save().catch(err => console.error("Audit Log Error:", err));
                } catch (e) {
                    console.error("Audit middleware error", e);
                }
            }
        };
    }
    next();
};

app.use(auditLogger);

// --- Interlinking / Global Stock Check ---

app.get('/api/inventory/global-check', authenticateToken, async (req, res) => {
    try {
        const { sku } = req.query;
        if (!sku) return res.status(400).json({ error: 'SKU is required' });

        // Search ALL products with this SKU, regardless of tenant
        // usage: specific SKU lookup across the network
        const products = await Product.find({ sku: sku });

        const networkStock = [];

        for (const p of products) {
            // Skip if stock is empty
            if (!p.stock || p.stock.size === 0) continue;

            // Resolve Tenant/Location info
            // We need to know which Location the stock is in.
            // p.stock is Map<LocationID, Quantity>
            for (const [locId, qty] of p.stock.entries()) {
                if (qty <= 0) continue;

                const location = await Location.findOne({ id: locId });
                const locName = location ? location.name : 'Unknown Location';

                // Determine if this is "My Warehouse" or "External"
                // Determine if this is "My Warehouse" or "External"
                const isLocal = (String(p.tenant_id) === String(req.user.tenantId));

                // Simulation: Logistics Calculation
                // In a real app, calculate using coordinates (Haversine) or Google Maps API
                // Here we use a deterministic "mock" based on location name length + id to keep it consistent per session
                // excluding "My Warehouse" which is 0 km
                let distance = 0;
                let eta = '0 min';

                if (!isLocal) {
                    // Mock algorithm: (Location Name Length * 2) + last digit of ID
                    const seed = (locName.length * 3) + (locId.charCodeAt(locId.length - 1) % 10);
                    distance = 5 + seed; // Range approx 5 - 40km

                    // Assume avg speed 40 km/h in city traffic
                    const timeInMinutes = Math.round((distance / 35) * 60);
                    const hours = Math.floor(timeInMinutes / 60);
                    const mins = timeInMinutes % 60;
                    eta = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;
                }

                networkStock.push({
                    locationName: locName,
                    quantity: qty,
                    isLocal: isLocal,
                    tenantId: p.tenant_id,
                    distance: isLocal ? '0 km' : `${distance} km`,
                    eta: isLocal ? 'Immediate' : eta
                });
            }
        }

        res.json(networkStock);

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// --- Data Routes ---

const getTenantQuery = (req) => {
    if (req.user.role === 'SUPER_ADMIN') return {};
    return { tenant_id: req.user.tenantId };
};

const getTenantIdForSave = (req) => {
    if (req.user.role === 'SUPER_ADMIN' && req.body.tenantId) return req.body.tenantId;
    return req.user.tenantId;
};

// --- Data Routes ---

app.get('/api/products', authenticateToken, async (req, res) => {
    try {
        const query = getTenantQuery(req);
        const products = await Product.find(query);
        res.json(products);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/products', authenticateToken, async (req, res) => {
    try {
        const tenantId = getTenantIdForSave(req);
        const product = new Product({ ...req.body, tenant_id: tenantId });
        await product.save();
        res.status(201).json(product);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const query = { id, ...getTenantQuery(req) };
        const updated = await Product.findOneAndUpdate(query, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Product not found' });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const query = { id, ...getTenantQuery(req) };
        const product = await Product.findOne(query);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        await new DeletedItem({
            id: `del-${Date.now()}-${id}`,
            originalId: id,
            collectionName: 'Product',
            document: product.toObject(),
            deletedBy: req.user.id
        }).save();

        await Product.deleteOne(query);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Locations
app.get('/api/locations', authenticateToken, async (req, res) => {
    try {
        const query = getTenantQuery(req);
        const locs = await Location.find(query);
        res.json(locs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Customers
app.get('/api/customers', authenticateToken, async (req, res) => {
    try {
        const query = getTenantQuery(req);
        const customers = await Customer.find(query);
        res.json(customers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/customers', authenticateToken, async (req, res) => {
    try {
        const tenantId = getTenantIdForSave(req);
        const newCust = new Customer({ ...req.body, tenant_id: tenantId });
        await newCust.save();
        res.status(201).json(newCust);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Suppliers
app.get('/api/suppliers', authenticateToken, async (req, res) => {
    try {
        const query = getTenantQuery(req);
        const suppliers = await Supplier.find(query);
        res.json(suppliers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/suppliers', authenticateToken, async (req, res) => {
    try {
        const tenantId = getTenantIdForSave(req);
        const newSup = new Supplier({ ...req.body, tenant_id: tenantId });
        await newSup.save();
        res.status(201).json(newSup);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// Sales
app.get('/api/sales', authenticateToken, async (req, res) => {
    try {
        const query = getTenantQuery(req);
        const sales = await Sale.find(query);
        res.json(sales);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/sales', authenticateToken, async (req, res) => {
    try {
        const tenantId = getTenantIdForSave(req);
        const newSale = new Sale({ ...req.body, tenant_id: tenantId });
        await newSale.save();
        res.status(201).json(newSale);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Transfers
app.get('/api/transfers', authenticateToken, async (req, res) => {
    try {
        const query = getTenantQuery(req);
        const transfers = await Transfer.find(query);
        res.json(transfers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/transfers', authenticateToken, async (req, res) => {
    try {
        const tenantId = getTenantIdForSave(req);
        const newTransfer = new Transfer({ ...req.body, tenant_id: tenantId });
        await newTransfer.save();
        res.status(201).json(newTransfer);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Tax Tiers
app.get('/api/tax-tiers', authenticateToken, async (req, res) => {
    try {
        const query = getTenantQuery(req);
        const tiers = await TaxTier.find(query);
        res.json(tiers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/tax-tiers', authenticateToken, async (req, res) => {
    try {
        const tenantId = getTenantIdForSave(req);
        const tier = new TaxTier({ ...req.body, tenant_id: tenantId });
        await tier.save();
        res.status(201).json(tier);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// --- External Services Routes ---

app.get('/api/market-price', authenticateToken, async (req, res) => {
    try {
        const { name } = req.query;
        if (!name) return res.status(400).json({ error: 'Product name required' });

        const cleanName = name.replace(/\s*\(.*?\)\s*/g, '').trim();
        const query = `${cleanName} price per kg india online grocery`;
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

        console.log(`[MarketPrice] Searching for: ${cleanName} | URL: ${url}`);

        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        const $ = cheerio.load(data);
        const results = [];

        $('.result__snippet').each((i, el) => {
            const text = $(el).text();
            const priceMatch = text.match(/(?:₹|Rs\.?|INR)\s?(\d+(?:,\d+)*(?:\.\d{1,2})?)/i);
            if (priceMatch && priceMatch[1]) {
                const price = parseFloat(priceMatch[1].replace(/,/g, ''));
                if (price > 10 && price < 10000) results.push(price);
            }
        });

        if (results.length > 0) {
            const valid = results.slice(0, 5);
            const sum = valid.reduce((a, b) => a + b, 0);
            const avg = Math.round(sum / valid.length);
            return res.json({ marketPrice: avg, source: 'Aggregated Online Sources' });
        }

        res.json({ marketPrice: null });
    } catch (e) {
        console.error("Market price fetch failed:", e.message);
        res.status(500).json({ error: "Failed to fetch market price" });
    }
});

app.get('/api/market-price-v2', authenticateToken, async (req, res) => {
    try {
        const { name } = req.query;
        if (!name) return res.status(400).json({ error: 'Product name required' });

        const cleanName = name.replace(/\s*\(.*?\)\s*/g, '').trim();
        const query = `${cleanName} price per kg india online grocery`;
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

        console.log(`[MarketPriceV2] Searching for: ${cleanName} | URL: ${url}`);

        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        const $ = cheerio.load(data);
        const results = [];

        $('.result__snippet, .result__body').each((i, el) => {
            const text = $(el).text();
            const priceMatch = text.match(/(?:₹|Rs\.?|INR)\s?(\d+(?:,\d+)*(?:\.\d{1,2})?)/i);
            if (priceMatch && priceMatch[1]) {
                const price = parseFloat(priceMatch[1].replace(/,/g, ''));
                if (price > 10 && price < 10000) {
                    results.push(price);
                }
            }
        });

        if (results.length > 0) {
            results.sort((a, b) => a - b);
            const mid = Math.floor(results.length / 2);
            const median = results.length % 2 !== 0 ? results[mid] : (results[mid - 1] + results[mid]) / 2;
            return res.json({ marketPrice: median });
        }
        res.json({ marketPrice: null });
    } catch (e) {
        console.error("Market price v2 fetch failed:", e.message);
        res.status(500).json({ error: "Failed to fetch market price" });
    }
});

// --- User Management Routes ---

app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'SUPER_ADMIN') {
            query = {}; // All
        } else if (req.user.role === 'WAREHOUSE_OWNER' || req.user.role === 'WAREHOUSE_MANAGER') {
            query.tenant_id = req.user.tenantId;
        } else {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const users = await User.find(query);
        const parsedUsers = users.map(u => {
            const obj = u.toObject();
            obj.managedLocationIds = obj.managed_location_ids;
            return obj;
        });
        res.json(parsedUsers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/users', authenticateToken, async (req, res) => {
    try {
        const { name, email, password, role, locationId, permissions } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: 'Email already registered' });

        const passwordHash = await bcrypt.hash(password, 10);
        const userId = `u-${Date.now()}`;

        // Tenant Logic for User Creation
        let tenantId = getTenantIdForSave(req);

        const newUser = new User({
            id: userId,
            name,
            email,
            password: passwordHash,
            role,
            tenant_id: tenantId,
            managed_location_ids: locationId ? [locationId] : [],
            permissions: permissions || []
        });

        await newUser.save();

        const responseUser = newUser.toObject();
        delete responseUser.password;
        responseUser.managedLocationIds = responseUser.managed_location_ids;

        res.status(201).json(responseUser);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, locationId, permissions } = req.body;

        const user = await User.findOne({ id });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (req.user.role !== 'SUPER_ADMIN' && user.tenant_id !== req.user.tenantId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        user.name = name;
        user.email = email;
        user.role = role;
        user.permissions = permissions || [];
        if (locationId) user.managed_location_ids = [locationId];

        await user.save();
        res.json({ success: true, message: 'User updated' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete self' });

        const user = await User.findOne({ id });
        if (!user) return res.status(404).json({ error: 'Not found' });

        if (req.user.role !== 'SUPER_ADMIN' && user.tenant_id !== req.user.tenantId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await new DeletedItem({
            id: `del-${Date.now()}-${id}`,
            originalId: id,
            collectionName: 'User',
            document: user.toObject(),
            deletedBy: req.user.id
        }).save();

        await User.deleteOne({ id });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Role Management Routes ---

app.get('/api/roles', authenticateToken, async (req, res) => {
    try {
        const roles = await Role.find({});
        const parsedRoles = roles.map(r => {
            const obj = r.toObject();
            obj.isSystem = obj.is_system;
            return obj;
        });
        res.json(parsedRoles);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/roles', authenticateToken, async (req, res) => {
    try {
        const { name, permissions } = req.body;
        if (!name) return res.status(400).json({ error: 'Role name required' });

        const roleId = `role-${Date.now()}`;
        const newRole = new Role({
            id: roleId,
            name,
            permissions: permissions || [],
            is_system: false
        });

        await newRole.save();
        res.status(201).json({ id: roleId, name, permissions: newRole.permissions, isSystem: false });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/roles/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, permissions } = req.body;
        const role = await Role.findOne({ id });
        if (!role) return res.status(404).json({ error: 'Role not found' });
        if (role.is_system && name !== role.name) return res.status(400).json({ error: 'Cannot rename system role' });

        role.name = name;
        role.permissions = permissions || [];
        await role.save();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/roles/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const role = await Role.findOne({ id });
        if (!role) return res.status(404).json({ error: 'Role not found' });
        if (role.is_system) return res.status(403).json({ error: 'Cannot delete system role' });

        await new DeletedItem({
            id: `del-${Date.now()}-${id}`,
            originalId: id,
            collectionName: 'Role',
            document: role.toObject(),
            deletedBy: req.user.id
        }).save();

        await Role.deleteOne({ id });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Trash Management Routes ---

app.get('/api/trash', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'WAREHOUSE_OWNER') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        // In full multi-tenant, we should filter trash by tenant too if we want perfect isolation.
        // For now, if we stored full doc, we can filter in memory or rely on Super Admin only.
        // Let's stick to existing behavior (All Trash) but usually Owners should only see their own.
        // TODO: Isolate Trash in future if needed.
        const items = await DeletedItem.find({}).sort({ deletedAt: -1 });
        res.json(items);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/trash/:id/restore', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'WAREHOUSE_OWNER') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const deletedItem = await DeletedItem.findOne({ id });
        if (!deletedItem) return res.status(404).json({ error: 'Item not found' });

        let Model;
        try {
            Model = mongoose.model(deletedItem.collectionName);
        } catch (e) {
            return res.status(400).json({ error: `Unknown collection: ${deletedItem.collectionName}` });
        }

        const docToRestore = deletedItem.document;
        const existing = await Model.findOne({ id: docToRestore.id });
        if (existing) return res.status(409).json({ error: 'ID collision in active records' });

        await new Model(docToRestore).save();
        await DeletedItem.deleteOne({ id });
        res.json({ success: true, message: 'Restored successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
