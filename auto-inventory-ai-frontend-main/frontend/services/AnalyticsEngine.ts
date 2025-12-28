
import { Product, Sale, Transfer, Supplier } from '../types';

// ==========================================
// Types & Interfaces
// ==========================================

export interface StrategicInsight {
    id: string;
    type: 'Profit Optimization' | 'Risk Mitigation' | 'Cash Flow' | 'Growth';
    problem: string;
    impact: string;
    recommendedAction: string;
    roiImpact: string;
    confidenceScore: number;
    actionType: 'TRANSFER' | 'LIQUIDATE' | 'REORDER' | 'PRICE_ADJUST';
    metadata?: any;
}

export interface StockHealth {
    status: 'Overstock' | 'Stockout Risk' | 'Healthy' | 'Dead Stock';
    coverDays: number;
    agingScore: number;
}

// ==========================================
// 1. Data Intelligence Preparation
// ==========================================

/**
 * Calculates Demand Velocity: Avg Quantity Sold per Day over N days
 */
export const calculateDemandVelocity = (
    productId: string,
    sales: Sale[],
    days: number = 30
): number => {
    if (!sales || sales.length === 0) return 0;

    const now = new Date();
    const pastDate = new Date();
    pastDate.setDate(now.getDate() - days);

    const relevantSales = sales.filter(s => {
        const saleDate = new Date(s.date);
        return saleDate >= pastDate && saleDate <= now;
    });

    const totalQty = relevantSales.reduce((acc, sale) => {
        const item = sale.items.find(i => i.id === productId);
        return acc + (item ? item.quantity : 0);
    }, 0);

    return totalQty / days;
};

/**
 * Calculates Inventory Cover Days = Current Stock / Demand Velocity
 */
export const calculateInventoryCover = (
    stockQuantity: number,
    velocity: number
): number => {
    if (velocity <= 0) return stockQuantity > 0 ? 999 : 0; // Infinite cover if no sales but has stock
    return stockQuantity / velocity;
};

/**
 * Calculates Stock Aging Score based on last movement
 */
export const calculateAgingScore = (
    lastMovementDate: string | undefined,
    coverDays: number
): number => {
    if (!lastMovementDate) return 0;

    const daysSinceMovement = (new Date().getTime() - new Date(lastMovementDate).getTime()) / (1000 * 3600 * 24);
    const safeCoverDays = coverDays === 0 ? 1 : coverDays;

    return daysSinceMovement / safeCoverDays;
};

// ==========================================
// 2. Core Analytical Algorithms
// ==========================================

/**
 * Classifies Stock Health: Overstock, Stockout Risk, Healthy
 */
export const analyzeStockHealth = (
    coverDays: number,
    optimalCover: number = 30,
    safetyStockDays: number = 7
): 'Overstock' | 'Stockout Risk' | 'Healthy' => {
    if (coverDays > 2 * optimalCover) return 'Overstock';
    if (coverDays < safetyStockDays) return 'Stockout Risk';
    return 'Healthy';
};

/**
 * Detects Dead Stock based on days since last sale
 */
export const detectDeadStock = (
    product: Product,
    sales: Sale[],
    thresholdDays: number = 90
): boolean => {
    const lastSale = sales
        .flatMap(s => s.items)
        .filter(i => i.id === product.id)
    // Assuming sales are roughly ordered, but technically we should sort. 
    // For MVP, checking if ANY sale exists in last thresholdDays is sufficient.

    // Better approach: Find most recent sale date
    let lastSaleDate = new Date(0); // Epoch
    sales.forEach(s => {
        const hasItem = s.items.some(i => i.id === product.id);
        if (hasItem) {
            const d = new Date(s.date);
            if (d > lastSaleDate) lastSaleDate = d;
        }
    });

    const daysSinceLastSale = (new Date().getTime() - lastSaleDate.getTime()) / (1000 * 3600 * 24);

    // Also check if we actually have stock. No dead stock if no stock.
    const totalStock = Object.values(product.stock).reduce((a, b) => a + b, 0);

    return totalStock > 0 && daysSinceLastSale > thresholdDays;
};

// ==========================================
// 3. Multi-Warehouse Transfer Optimization
// ==========================================

export const findTransferOpportunities = (
    products: Product[],
    sales: Sale[]
): StrategicInsight[] => {
    const insights: StrategicInsight[] = [];

    // Warehouse Identifiers (simplified for MVP)
    const warehouseIds = ['warehouse-a', 'store-downtown', 'north-branch', 'city-center-store'];

    products.forEach(p => {
        // 1. Map stock and velocity per location
        const locStats = warehouseIds.map(locId => {
            const stock = p.stock[locId] || 0;
            // Filter sales by location to get local velocity
            const localSales = sales.filter(s => s.locationId === locId);
            const velocity = calculateDemandVelocity(p.id, localSales);
            const cover = calculateInventoryCover(stock, velocity);

            return { locId, stock, velocity, cover };
        });

        // 2. Identify Overstock and Stockout locations
        const overstocked = locStats.filter(l => l.cover > 60); // > 60 days
        const starving = locStats.filter(l => l.cover < 10 && l.velocity > 0.1); // < 10 days & sells at least 1/10 days (approx 3/mo)

        // 3. Match
        overstocked.forEach(source => {
            starving.forEach(target => {
                if (source.stock > 10) { // Only transfer if we have meaningful excess
                    const transferQty = Math.floor(Math.min(source.stock * 0.5, (30 - target.cover) * target.velocity));

                    if (transferQty > 0) {
                        const cost = p.cost || 0;
                        const price = p.price || 0;
                        const margin = price - cost;
                        const estimatedGain = margin * transferQty;
                        const transferCost = 50 + (transferQty * 2); // Base + unit cost placeholder

                        if (estimatedGain > transferCost) {
                            insights.push({
                                id: `transfer-${p.id}-${source.locId}-${target.locId}`,
                                type: 'Profit Optimization',
                                problem: `Stock imbalance for ${p.name}`,
                                impact: `Potential missed sales in ${target.locId}`,
                                recommendedAction: `Transfer ${transferQty} units from ${source.locId} to ${target.locId}`,
                                roiImpact: `+₹${Math.floor(estimatedGain - transferCost)}`,
                                confidenceScore: 0.9,
                                actionType: 'TRANSFER',
                                metadata: { productId: p.id, from: source.locId, to: target.locId, qty: transferQty }
                            });
                        }
                    }
                }
            });
        });
    });

    return insights;
};

// ==========================================
// 4. Main Insight Generator
// ==========================================

export const generateStrategicInsights = (
    products: Product[],
    sales: Sale[]
): StrategicInsight[] => {
    const insights: StrategicInsight[] = [];

    // A. Transfer Optimization (Existing)
    const transferInsights = findTransferOpportunities(products, sales);
    insights.push(...transferInsights);

    products.forEach(p => {
        // Calculate Metrics
        const velocity = calculateDemandVelocity(p.id, sales, 30);
        const totalStock = Object.values(p.stock).reduce((a, b) => a + b, 0);
        const coverDays = calculateInventoryCover(totalStock, velocity);

        const margin = p.price > 0 ? (p.price - p.cost) / p.price : 0;

        // B. Dead Stock Liquidation (Refined)
        if (detectDeadStock(p, sales, 90)) {
            const capitalBlocked = totalStock * (p.cost || 0);

            if (capitalBlocked > 500) { // Lower threshold to catch more
                // Find last sale date for context
                let lastSaleDate = new Date(0);
                sales.forEach(s => {
                    if (s.items.some(i => i.id === p.id)) {
                        const d = new Date(s.date);
                        if (d > lastSaleDate) lastSaleDate = d;
                    }
                });
                const daysSince = Math.floor((new Date().getTime() - lastSaleDate.getTime()) / (1000 * 3600 * 24));
                const timeText = daysSince > 365 ? "over a year" : `${daysSince} days ago`;

                insights.push({
                    id: `deadstock-${p.id}`,
                    type: 'Cash Flow',
                    problem: `Dead Stock: ${p.name}`,
                    impact: `₹${capitalBlocked.toLocaleString()} stuck. Last sold ${timeText}.`,
                    recommendedAction: `Liquidate ${totalStock} units. Run clearance sale.`,
                    roiImpact: `Recover ~₹${Math.floor(capitalBlocked * 0.7).toLocaleString()}`,
                    confidenceScore: 0.85,
                    actionType: 'LIQUIDATE',
                    metadata: { productId: p.id, currentStock: totalStock }
                });
            }
        }

        // C. Reorder Risk (Stockout Prediction)
        if (coverDays < 14 && velocity > 0.2 && totalStock > 0) {
            const reorderQty = Math.ceil(velocity * 30);
            insights.push({
                id: `reorder-${p.id}`,
                type: 'Risk Mitigation',
                problem: `Stockout Risk: ${p.name}`,
                impact: `Only ${Math.floor(coverDays)} days inventory remaining`,
                recommendedAction: `Restock ${reorderQty} units immediately`,
                roiImpact: `Protect Revenue`,
                confidenceScore: 0.95,
                actionType: 'REORDER',
                metadata: { productId: p.id, reorderQty }
            });
        }

        // D. Pricing Strategy Checks (New)
        if (velocity > 0.5) {
            // high volume, check margin
            if (margin < 0.10) {
                insights.push({
                    id: `price-margin-${p.id}`,
                    type: 'Profit Optimization',
                    problem: `Low Margin on High Vol: ${p.name}`,
                    impact: `Margin is only ${(margin * 100).toFixed(1)}%`,
                    recommendedAction: `Increase price by 5-10% to improve profitability`,
                    roiImpact: `+₹${Math.floor(velocity * 30 * (p.price * 0.05)).toLocaleString()} / mo`,
                    confidenceScore: 0.8,
                    actionType: 'PRICE_ADJUST',
                    metadata: { productId: p.id }
                });
            }
        } else if (velocity < 0.1 && totalStock > 10 && !detectDeadStock(p, sales, 90)) {
            // Low volume, high margin? Try price drop
            if (margin > 0.40) {
                insights.push({
                    id: `price-elasticity-${p.id}`,
                    type: 'Growth',
                    problem: `Slow Mover (High Margin): ${p.name}`,
                    impact: `High price may be limiting sales volume`,
                    recommendedAction: `Lower price by 10% to boost velocity`,
                    roiImpact: `Volume Growth`,
                    confidenceScore: 0.75,
                    actionType: 'PRICE_ADJUST',
                    metadata: { productId: p.id }
                });
            }
        }

        // E. High Growth (New)
        // (Simplified check: if assumed "New" or high velocity without stockout)
        if (velocity > 1.0 && coverDays > 20) {
            insights.push({
                id: `growth-${p.id}`,
                type: 'Growth',
                problem: `High Demand Item: ${p.name}`,
                impact: `Selling ${velocity.toFixed(1)} units/day consistently`,
                recommendedAction: `Ensure continuous supply & consider bulk buy`,
                roiImpact: `Maximize Sales`,
                confidenceScore: 0.9,
                actionType: 'REORDER', // safe fallback
                metadata: { productId: p.id, reorderQty: Math.ceil(velocity * 45) }
            });
        }
    });

    // Sort by Estimated ROI Value (parsed from string or simplified heuristic)
    // Heuristic: Risk > Profit > Cash Flow > Growth
    const priorityMap = { 'Risk Mitigation': 3, 'Profit Optimization': 2, 'Cash Flow': 1, 'Growth': 0 };

    // Dedup by product ID to avoid overwhelming user with multiple insights for one product
    const insightsMap = new Map();
    insights.forEach(i => {
        const pid = i.metadata?.productId;
        if (!pid || !insightsMap.has(pid)) {
            insightsMap.set(pid || i.id, i);
        } else {
            // Keep the higher priority one
            const existing = insightsMap.get(pid);
            if (priorityMap[i.type] > priorityMap[existing.type]) {
                insightsMap.set(pid, i);
            }
        }
    });

    return Array.from(insightsMap.values())
        .sort((a, b) => priorityMap[b.type] - priorityMap[a.type])
        .slice(0, 6); // Return top 6
};

// ==========================================
// 5. Forecasting & Growth Engine
// ==========================================

export interface ProductForecast {
    productId: string;
    name: string;
    currentMonthlySales: number; // Volume
    previousMonthlySales: number; // Volume
    growthRate: number; // Percentage
    trend: 'High Growth' | 'Stable' | 'Declining' | 'New';
    forecastedSales: number; // Next 30 days volume
    confidence: number;
    history: { date: string; value: number }[]; // For graph
}

export const generateProductForecasts = (products: Product[], sales: Sale[]): ProductForecast[] => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(now.getDate() - 60);

    return products.map(p => {
        // 1. Filter Sales for this product
        const productSales = sales.filter(s => s.items.some(i => i.id === p.id));

        // 2. Split into periods
        let currentQty = 0;
        let previousQty = 0;
        const dailyHistory: Record<string, number> = {};

        productSales.forEach(s => {
            const saleDate = new Date(s.date);
            const item = s.items.find(i => i.id === p.id);
            if (!item) return;

            // Populate History (last 60 days)
            if (saleDate >= sixtyDaysAgo) {
                const dateStr = saleDate.toISOString().split('T')[0];
                dailyHistory[dateStr] = (dailyHistory[dateStr] || 0) + item.quantity;
            }

            if (saleDate >= thirtyDaysAgo) {
                currentQty += item.quantity;
            } else if (saleDate >= sixtyDaysAgo) {
                previousQty += item.quantity;
            }
        });

        // 3. Calculate Growth
        let growthRate = 0;
        if (previousQty > 0) {
            growthRate = ((currentQty - previousQty) / previousQty) * 100;
        } else if (currentQty > 0) {
            growthRate = 100; // New or exploded
        }

        // 4. Determine Trend
        let trend: ProductForecast['trend'] = 'Stable';
        if (previousQty === 0 && currentQty > 0) trend = 'New';
        else if (growthRate >= 20) trend = 'High Growth';
        else if (growthRate <= -20) trend = 'Declining';

        // 5. Forecast (Simple Moving Average + Trend Momentum)
        // If high growth, assume 50% of growth momentum continues.
        // If declining, assume 50% deceleration continues.
        const baseForecast = currentQty;
        const momentumFactor = trend === 'High Growth' ? 1.2 : trend === 'Declining' ? 0.9 : 1.0;
        const forecastedSales = Math.ceil(baseForecast * momentumFactor);

        // 6. Format History for Graph
        const historyArray = Object.entries(dailyHistory)
            .map(([date, value]) => ({ date, value }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
            productId: p.id,
            name: p.name,
            currentMonthlySales: currentQty,
            previousMonthlySales: previousQty,
            growthRate,
            trend,
            forecastedSales,
            confidence: 0.85, // Placeholder for statistical significance calculation
            history: historyArray
        };
    }).sort((a, b) => b.forecastedSales - a.forecastedSales); // Sort by volume importance
};

// ==========================================
// 6. System Alerts Engine (Real-time)
// ==========================================

export const isLocationLowStock = (p: Product, locId: string): boolean => {
    const qty = p.stock[locId] || 0;
    if (qty === 0) return false; // Stockout handled by isStockout
    const threshold = p.minStockThresholds?.[locId] ?? p.minStockLevel ?? 10;
    return qty < threshold;
};

export const isLowStock = (p: Product): boolean => {
    // Check global first if no local stock map
    if (!p.stock || Object.keys(p.stock).length === 0) return (p.stock as any || 0) < (p.minStockLevel || 10);

    // Check if ANY location is below its specific threshold
    return Object.keys(p.stock).some(locId => isLocationLowStock(p, locId));
};

export const isStockout = (p: Product): boolean => {
    const totalStock = Object.values(p.stock).reduce((a, b) => a + Number(b || 0), 0);
    return totalStock === 0;
};

export const isExpiringSoon = (p: Product, daysThreshold: number = 30): boolean => {
    if (!p.expiryDate) return false;
    const daysToExpiry = Math.ceil((new Date(p.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return daysToExpiry <= daysThreshold && daysToExpiry > 0;
};

export const isExpired = (p: Product): boolean => {
    if (!p.expiryDate) return false;
    const daysToExpiry = Math.ceil((new Date(p.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return daysToExpiry <= 0;
};

export const isDeadStockProduct = (p: Product): boolean => {
    const totalStock = Object.values(p.stock || {}).reduce((a, b) => a + Number(b), 0);
    if (totalStock === 0) return false;

    if (!p.lastSaleDate) return true; // Has stock but never sold (or no date) -> Dead

    const daysSinceSale = (new Date().getTime() - new Date(p.lastSaleDate).getTime()) / (1000 * 3600 * 24);
    return daysSinceSale > 90;
};

export interface SystemAlert {
    id: string;
    type: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    date: string; // ISO Date
    priority: number; // Higher is more important
}

export const generateSystemAlerts = (products: Product[]): SystemAlert[] => {
    const alerts: SystemAlert[] = [];

    products.forEach(p => {
        const totalStock = Object.values(p.stock).reduce((a, b) => a + Number(b || 0), 0);
        const minStock = p.minStockLevel || 10;

        // 1. Critical Low Stock (Stock < 50% of Min Check or just 0)
        if (isStockout(p)) {
            alerts.push({
                id: `alert-stockout-${p.id}`,
                type: 'critical',
                title: 'Stockout Alert',
                message: `${p.name} is completely out of stock! Restock immediately.`,
                date: new Date().toISOString(),
                priority: 3
            });
        } else if (isLowStock(p)) {
            alerts.push({
                id: `alert-lowstock-${p.id}`,
                type: 'warning',
                title: 'Low Stock Warning',
                message: `${p.name} is below threshold (${totalStock} < ${minStock}).`,
                date: new Date().toISOString(),
                priority: 2
            });
        }

        // 2. Expiry Risk
        if (isExpired(p)) {
            alerts.push({
                id: `alert-expired-${p.id}`,
                type: 'critical',
                title: 'Product Expired',
                message: `${p.name} expired on ${p.expiryDate}. Remove from shelves.`,
                date: new Date().toISOString(),
                priority: 3
            });
        } else if (isExpiringSoon(p)) {
            const daysToExpiry = Math.ceil((new Date(p.expiryDate!).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
            alerts.push({
                id: `alert-expiry-soon-${p.id}`,
                type: 'warning',
                title: 'Expiring Soon',
                message: `${p.name} expires in ${daysToExpiry} days. Promote to clear stock.`,
                date: new Date().toISOString(),
                priority: 2
            });
        }
    });

    // Sort by Priority (High to Low)
    return alerts.sort((a, b) => b.priority - a.priority).slice(0, 10);
};
