
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Role, User } from '../types';
import { getUsers, createUser, deleteUser, updateUser, getRoles, createRole, updateRole, deleteRole } from '../services/api';
import { Plus, Trash2, Shield, Search, User as UserIcon, X, Loader2, Check, Edit2, GripVertical, ArrowRight, Settings } from 'lucide-react';
import { APP_MODULES, DEFAULT_PERMISSIONS } from '../constants/permissions';
import { ConfirmationModal } from './ConfirmationModal';

export const UsersComp: React.FC = () => {
    const { token, currentUser, locations, addNotification } = useApp();
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        console.log('UsersComp mounted. Current User:', currentUser, 'Token present:', !!token);
    }, [currentUser, token]);
    const [roles, setRoles] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
    const [loading, setLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<string>(Role.WAREHOUSE_MANAGER); // Now string to support custom roles
    const [newLocationId, setNewLocationId] = useState('');
    const [newPermissions, setNewPermissions] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Role Form State
    const [roleName, setRoleName] = useState('');
    const [rolePermissions, setRolePermissions] = useState<string[]>([]);
    const [editingRole, setEditingRole] = useState<any | null>(null);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'user' | 'role' } | null>(null);

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, [token]);

    const fetchRoles = async () => {
        if (!token) { console.log('UsersComp: No token for fetchRoles'); return; }
        try {
            console.log('UsersComp: Fetching roles...');
            const data = await getRoles(token);
            console.log('UsersComp: Roles fetched:', data);
            setRoles(data);
        } catch (error) {
            console.error('UsersComp: Error fetching roles', error);
        }
    }

    const fetchUsers = async () => {
        if (!token) { console.log('UsersComp: No token for fetchUsers'); return; }
        setLoading(true);
        try {
            console.log('UsersComp: Fetching users...');
            const data = await getUsers(token);
            console.log('UsersComp: Users fetched:', data);
            setUsers(data);
        } catch (err: any) {
            console.error('UsersComp: Error fetching users', err);
            addNotification('ERROR', 'Failed to fetch users', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setIsSubmitting(true);
        try {
            const payload = {
                name: newName,
                email: newEmail,
                password: newPassword,
                role: newRole,
                locationId: newLocationId, // Optional based on role
                permissions: newPermissions
            };

            let updatedUser;
            if (editingUser) {
                updatedUser = await updateUser(token, editingUser.id, payload);
                setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...payload } : u));
                addNotification('SUCCESS', 'User Updated', `${updatedUser?.name || 'User'} updated successfully`);
            } else {
                updatedUser = await createUser(token, payload);
                setUsers(prev => [...prev, updatedUser]);
                addNotification('SUCCESS', 'User Created', `${updatedUser.name} added successfully`);
            }

            setIsAddModalOpen(false);
            resetForm();
        } catch (err: any) {
            addNotification('ERROR', 'Failed to save user', err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const initiateDeleteUser = (userId: string) => {
        setDeleteTarget({ id: userId, type: 'user' });
        setIsDeleteModalOpen(true);
    };

    const initiateDeleteRole = (roleId: string) => {
        setDeleteTarget({ id: roleId, type: 'role' });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget || !token) return;

        try {
            if (deleteTarget.type === 'user') {
                await deleteUser(token, deleteTarget.id);
                setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
                addNotification('SUCCESS', 'User Deleted');
            } else {
                await deleteRole(token, deleteTarget.id);
                fetchRoles(); // Refresh roles
                addNotification('SUCCESS', 'Role Deleted');
            }
        } catch (err: any) {
            addNotification('ERROR', `Failed to delete ${deleteTarget.type}`, err.message);
        } finally {
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
        }
    };

    const resetForm = () => {
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewRole(Role.WAREHOUSE_MANAGER);
        setNewLocationId('');
        setNewPermissions(DEFAULT_PERMISSIONS[Role.WAREHOUSE_MANAGER] || []);
        setEditingUser(null);
    };

    const resetRoleForm = () => {
        setRoleName('');
        setRolePermissions([]);
        setEditingRole(null);
    }

    const handleEditClick = (user: User) => {
        setEditingUser(user);
        setNewName(user.name);
        setNewEmail(user.email);
        setNewPassword(''); // Optional update
        setNewRole(user.role);
        setNewLocationId(user.managedLocationIds ? user.managedLocationIds[0] : '');
        setNewPermissions(user.permissions || DEFAULT_PERMISSIONS[user.role as Role] || []);
        setIsAddModalOpen(true);
    };

    const handleEditRoleClick = (role: any) => {
        setEditingRole(role);
        setRoleName(role.name);
        setRolePermissions(role.permissions);
        setIsRoleModalOpen(true);
    }

    const handleSaveRole = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingRole) {
                await updateRole(token, editingRole.id, { name: roleName, permissions: rolePermissions });
                addNotification('SUCCESS', 'Role Updated');
            } else {
                await createRole(token, { name: roleName, permissions: rolePermissions });
                addNotification('SUCCESS', 'Role Created');
            }
            setIsRoleModalOpen(false);
            resetRoleForm();
            fetchRoles();
        } catch (err: any) {
            addNotification('ERROR', 'Failed to save role', err.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    // Drag and Drop Logic
    const handleMovePermission = (moduleId: string, direction: 'add' | 'remove') => {
        if (direction === 'add') {
            if (!newPermissions.includes(moduleId)) {
                setNewPermissions([...newPermissions, moduleId]);
            }
        } else {
            setNewPermissions(newPermissions.filter(p => p !== moduleId));
        }
    };

    // Auto-set default permissions when role changes
    const handleRoleChange = (roleName: string) => {
        setNewRole(roleName);
        // Is it a built-in role or custom?
        const foundRole = roles.find(r => r.name === roleName);
        if (foundRole) {
            setNewPermissions(foundRole.permissions);
        } else if (DEFAULT_PERMISSIONS[roleName as Role]) {
            setNewPermissions(DEFAULT_PERMISSIONS[roleName as Role]);
        } else {
            setNewPermissions([]);
        }
    };

    // RBAC Check: Only Super Admin and Owners can see this page
    if (currentUser?.role !== Role.SUPER_ADMIN && currentUser?.role !== Role.WAREHOUSE_OWNER) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
                <Shield size={48} className="mb-4 text-red-400" />
                <h2 className="text-xl font-bold text-slate-700">Access Denied</h2>
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    const filteredUsers = users.filter(user =>
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Headers and Tabs ... */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <UsersCompIcon className="text-indigo-600 dark:text-indigo-400" /> User & Role Management
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage team access and permissions</p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'}`}
                    >
                        Users
                    </button>
                    <button
                        onClick={() => setActiveTab('roles')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'roles' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'}`}
                    >
                        Roles
                    </button>
                </div>

                <button
                    onClick={() => activeTab === 'users' ? setIsAddModalOpen(true) : setIsRoleModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all active:scale-95"
                >
                    <Plus size={18} /> {activeTab === 'users' ? 'Add New User' : 'Add New Role'}
                </button>
            </div>

            {activeTab === 'users' ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase font-semibold text-xs">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Access Scope</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="animate-spin inline text-indigo-600 dark:text-indigo-400" /></td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">No users found.</td></tr>
                                ) : (
                                    filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold">
                                                        {(user.name || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-800 dark:text-slate-200">{user.name || 'Unnamed User'}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">{user.email || 'No Email'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium 
                                                ${user.role === Role.SUPER_ADMIN ? 'bg-purple-100 text-purple-700' :
                                                        user.role === Role.WAREHOUSE_OWNER ? 'bg-blue-100 text-blue-700' :
                                                            'bg-green-100 text-green-700'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                {user.role === Role.SUPER_ADMIN ? 'Full System Access' :
                                                    user.role === Role.WAREHOUSE_OWNER ? 'Tenant Wide' :
                                                        user.managedLocationIds && user.managedLocationIds.length > 0 ?
                                                            `Location: ${locations.find(l => l.id === user.managedLocationIds![0])?.name || 'Unknown'}` :
                                                            'Limited'}
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEditClick(user)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
                                                    title="Edit User"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                {user.id !== currentUser?.id && (
                                                    <button
                                                        onClick={() => initiateDeleteUser(user.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ROLES TABLE */
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase font-semibold text-xs">
                            <tr>
                                <th className="px-6 py-4">Role Name</th>
                                <th className="px-6 py-4">Permissions (Modules)</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {roles.map(role => (
                                <tr key={role.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{role.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {role.permissions.slice(0, 5).map((p: string) => (
                                                <span key={p} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs border border-indigo-100 dark:border-indigo-800">
                                                    {APP_MODULES.find(m => m.id === p)?.label || p}
                                                </span>
                                            ))}
                                            {role.permissions.length > 5 && (
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded text-xs">
                                                    +{role.permissions.length - 5} more
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {role.isSystem ?
                                            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded text-xs font-bold flex w-fit items-center gap-1"><Shield size={10} /> System</span> :
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs">Custom</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => handleEditRoleClick(role)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-lg"><Edit2 size={16} /></button>
                                        {!role.isSystem && (
                                            <button onClick={() => { if (!role.isSystem) initiateDeleteRole(role.id); }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={16} /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add User Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border dark:border-slate-700">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{editingUser ? 'Edit User Permissions' : 'Add New Team Member'}</h3>
                            <button onClick={() => { setIsAddModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddUser} className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                                <input
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                    required
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                    required
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                                <input
                                    type="password"
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                    required={!editingUser}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Leave blank to keep current password"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                                <select
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={newRole}
                                    onChange={e => handleRoleChange(e.target.value)}
                                >
                                    {roles.map(r => (
                                        <option key={r.id} value={r.name}>{r.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Conditional Location Selection for Managers */}
                            {(newRole === Role.WAREHOUSE_MANAGER || newRole === 'Warehouse Manager') && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assign Location</label>
                                    <select
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={newLocationId}
                                        onChange={e => setNewLocationId(e.target.value)}
                                        required
                                    >
                                        <option value="">Select a location...</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Managers are restricted to manage stock for a single location.</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Module Access & Permissions</label>
                                <PermissionSelector
                                    assigned={newPermissions}
                                    onChange={setNewPermissions}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 bg-indigo-600 rounded-lg text-white font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (editingUser ? <Check size={18} /> : <Plus size={18} />)}
                                    {editingUser ? 'Update User' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Role Modal */}
            {isRoleModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={(e) => { if (e.target === e.currentTarget) setIsRoleModalOpen(false); }}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border dark:border-slate-700">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{editingRole ? 'Edit Role' : 'Create New Role'}</h3>
                            <button onClick={() => { setIsRoleModalOpen(false); resetRoleForm(); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveRole} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role Name</label>
                                <input
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                                    required
                                    value={roleName}
                                    onChange={e => setRoleName(e.target.value)}
                                    placeholder="e.g. Sales Associate"
                                    disabled={editingRole?.isSystem} // Prevent renaming system roles if desired
                                />
                                {editingRole?.isSystem && <p className="text-xs text-amber-600 mt-1">System role names cannot be changed.</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Define Permissions</label>
                                <PermissionSelector
                                    assigned={rolePermissions}
                                    onChange={setRolePermissions}
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsRoleModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium">Save Role</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={`Delete ${deleteTarget?.type === 'user' ? 'User' : 'Role'}`}
                message={`Are you sure you want to delete this ${deleteTarget?.type}? This action cannot be undone.`}
                variant="danger"
            />
        </div>
    );
};

// Reusable Permission Selector (The Drag-and-Drop Logic)
const PermissionSelector = ({ assigned, onChange }: { assigned: string[], onChange: (p: string[]) => void }) => {

    const handleMove = (moduleId: string, direction: 'add' | 'remove') => {
        if (direction === 'add') {
            if (!assigned.includes(moduleId)) onChange([...assigned, moduleId]);
        } else {
            onChange(assigned.filter(p => p !== moduleId));
        }
    };

    return (
        <div className="flex gap-4 h-64">
            {/* Available Modules */}
            <div className="flex-1 flex flex-col border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                <div className="bg-slate-100 dark:bg-slate-900 p-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center border-b border-slate-200 dark:border-slate-700">
                    Available
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {APP_MODULES.filter(m => !assigned.includes(m.id)).map(module => (
                        <div
                            key={module.id}
                            onClick={() => handleMove(module.id, 'add')}
                            className="bg-white dark:bg-slate-700 p-2 rounded shadow-sm border border-slate-200 dark:border-slate-600 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-400 group flex items-center justify-between transition-all"
                        >
                            <span className="text-sm text-slate-700 dark:text-slate-200">{module.label}</span>
                            <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                        </div>
                    ))}
                    {APP_MODULES.filter(m => !assigned.includes(m.id)).length === 0 && (
                        <div className="text-center text-slate-400 text-xs mt-4">All assigned</div>
                    )}
                </div>
            </div>

            {/* Allowed Permissions */}
            <div className="flex-1 flex flex-col border border-indigo-200 dark:border-indigo-800 rounded-lg overflow-hidden bg-indigo-50/30 dark:bg-indigo-900/20">
                <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider text-center border-b border-indigo-200 dark:border-indigo-800">
                    Assigned
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {assigned.map(permId => {
                        const module = APP_MODULES.find(m => m.id === permId);
                        if (!module) return null;
                        return (
                            <div
                                key={module.id}
                                onClick={() => handleMove(module.id, 'remove')}
                                className="bg-white dark:bg-slate-700 p-2 rounded shadow-sm border border-indigo-200 dark:border-indigo-900 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-200 dark:hover:border-red-900 group flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <GripVertical size={14} className="text-slate-300" />
                                    <span className="text-sm text-indigo-900 dark:text-indigo-200 font-medium">{module.label}</span>
                                </div>
                                <X size={14} className="text-slate-300 group-hover:text-red-500" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Icon components wrapper to fix generic type issue if needed
const UsersCompIcon = (props: any) => <UserIcon {...props} />;
