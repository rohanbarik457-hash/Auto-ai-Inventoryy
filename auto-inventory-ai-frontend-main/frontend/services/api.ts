export const API_URL = 'http://localhost:5000/api';

export const login = async (email, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
    }

    return response.json();
};

export const getProducts = async (token) => {
    const response = await fetch(`${API_URL}/products`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.json();
};

export const createProduct = async (token: string, data: any) => {
    const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create product');
    return response.json();
};

export const updateProduct = async (token: string, productId: string, data: any) => {
    const response = await fetch(`${API_URL}/products/${productId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update product');
    return response.json();
};

export const deleteProduct = async (token: string, productId: string) => {
    const response = await fetch(`${API_URL}/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to delete product');
    return response.json();
};

export const getLocations = async (token) => {
    const response = await fetch(`${API_URL}/locations`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.json();
};

export const getUsers = async (token) => {
    const response = await fetch(`${API_URL}/users`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch users');
    }
    return response.json();
};

export const createUser = async (token, userData) => {
    const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
    }

    return response.json();
};

export const deleteUser = async (token, userId) => {
    const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
    }

    return response.json();
};

export const updateUser = async (token: string, userId: string, userData: any) => {
    const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
    }

    return response.json();
};

export const getRoles = async (token: string) => {
    const response = await fetch(`${API_URL}/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch roles');
    }
    return response.json();
};

export const createRole = async (token: string, roleData: any) => {
    const response = await fetch(`${API_URL}/roles`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roleData)
    });
    if (!response.ok) throw new Error('Failed to create role');
    return response.json();
};

export const updateRole = async (token: string, roleId: string, roleData: any) => {
    const response = await fetch(`${API_URL}/roles/${roleId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roleData)
    });
    if (!response.ok) throw new Error('Failed to update role');
    return response.json();
};

export const deleteRole = async (token: string, roleId: string) => {
    const response = await fetch(`${API_URL}/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to delete role');
    }
    return response.json();
};

export const getCustomers = async (token: string) => {
    const response = await fetch(`${API_URL}/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
};

export const createCustomer = async (token: string, data: any) => {
    const response = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create customer');
    return response.json();
};

export const getSuppliers = async (token: string) => {
    const response = await fetch(`${API_URL}/suppliers`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
};

export const getSales = async (token: string) => {
    const response = await fetch(`${API_URL}/sales`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
};

export const createSale = async (token: string, data: any) => {
    const response = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create sale');
    return response.json();
};

export const getTransfers = async (token: string) => {
    const response = await fetch(`${API_URL}/transfers`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
};

export const createTransfer = async (token: string, data: any) => {
    const response = await fetch(`${API_URL}/transfers`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create transfer');
    return response.json();
};

export const getTaxTiers = async (token: string) => {
    const response = await fetch(`${API_URL}/tax-tiers`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
};

export const getTrash = async (token: string) => {
    const response = await fetch(`${API_URL}/trash`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
};

export const restoreItem = async (token: string, id: string) => {
    const response = await fetch(`${API_URL}/trash/${id}/restore`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to restore item');
    }
    return response.json();
};
export const checkGlobalStock = async (token: string, sku: string) => {
    const response = await fetch(`${API_URL}/inventory/global-check?sku=${encodeURIComponent(sku)}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to check global stock');
    }
    return response.json();
};
