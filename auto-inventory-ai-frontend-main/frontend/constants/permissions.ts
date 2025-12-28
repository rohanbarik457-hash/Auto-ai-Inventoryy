export const APP_MODULES = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'inventory', label: 'Inventory Management' },
    { id: 'sales', label: 'Sales & Billing' },
    { id: 'customers', label: 'Customer Management' },
    { id: 'suppliers', label: 'Supplier Management' },
    { id: 'reports', label: 'GST & Reports' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'users', label: 'User Management' },
    { id: 'settings', label: 'Settings' }
];

export const DEFAULT_PERMISSIONS = {
    SUPER_ADMIN: ['dashboard', 'inventory', 'sales', 'customers', 'suppliers', 'reports', 'analytics', 'users', 'settings'],
    WAREHOUSE_OWNER: ['dashboard', 'inventory', 'sales', 'customers', 'suppliers', 'reports', 'analytics', 'users', 'settings'],
    WAREHOUSE_MANAGER: ['dashboard', 'inventory', 'sales', 'customers', 'suppliers', 'reports'],
    STAFF: ['dashboard', 'inventory', 'sales']
};
