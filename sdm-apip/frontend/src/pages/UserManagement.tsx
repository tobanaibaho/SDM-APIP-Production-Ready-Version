import React, { useState, useEffect } from 'react';
import { formatRelativeTime, formatAbsoluteTime } from '../hooks/useRelativeTime';
import Layout from '../components/Layout';
import { getAllUsers, updateUserStatus, updateUserRole, deleteUser, adminDisableMFA } from '../services/userService';
import { User, Pagination } from '../types';
import {
    Search,
    Edit2,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Loader2,
    AlertTriangle,
    UserCog,
    Shield,
    CheckCircle,
    Clock,
    XCircle,
    ArrowUpDown,
    Filter,
    ShieldCheck,
    ShieldAlert,
    UserCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);

    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    // tick every 30s to refresh relative timestamps
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 30_000);
        return () => clearInterval(id);
    }, []);

    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [saving, setSaving] = useState(false);

    const [newStatus, setNewStatus] = useState('');
    const [newRole, setNewRole] = useState<number>(2);

    useEffect(() => {
        fetchData();
    }, [page, search, statusFilter, sortBy, sortOrder]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await getAllUsers(page, 10, search, statusFilter, sortBy, sortOrder);
            setUsers(response.data || []);
            setPagination(response.pagination);
        } catch (error) {
            toast.error('Gagal memuat data pengguna');
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setNewStatus(user.status);
        setNewRole(user.role === 'super admin' ? 1 : 2);
        setShowEditModal(true);
    };

    const handleUpdate = async () => {
        if (!editingUser) return;
        setSaving(true);
        try {
            if (newStatus !== editingUser.status) {
                await updateUserStatus(editingUser.id, newStatus);
            }
            const currentRoleId = editingUser.role === 'super admin' ? 1 : 2;
            if (newRole !== currentRoleId) {
                await updateUserRole(editingUser.id, newRole);
            }
            toast.success('Hak akses pengguna berhasil diperbarui');
            setShowEditModal(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal memperbarui data');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingUser) return;
        setSaving(true);
        try {
            await deleteUser(deletingUser.id);
            toast.success('Akun pengguna telah dihapus');
            setShowDeleteModal(false);
            setDeletingUser(null);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal menghapus pengguna');
        } finally {
            setSaving(false);
        }
    };

    const handleResetMFA = async () => {
        if (!editingUser) return;
        if (!window.confirm(`Apakah Anda yakin ingin menonaktifkan MFA untuk ${editingUser.name}? User harus melakukan setup ulang jika ingin mengaktifkan kembali.`)) return;

        setSaving(true);
        try {
            await adminDisableMFA(editingUser.id);
            toast.success('MFA pengguna telah dinonaktifkan');
            setShowEditModal(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal menonaktifkan MFA');
        } finally {
            setSaving(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'active':
                return { label: 'Aktif', color: 'bg-green-50 text-green-700 ring-green-600/20', icon: CheckCircle };
            case 'pending':
                return { label: 'Pending', color: 'bg-amber-50 text-amber-700 ring-amber-600/20', icon: Clock };
            case 'inactive':
                return { label: 'Nonaktif', color: 'bg-red-50 text-red-700 ring-red-600/20', icon: XCircle };
            default:
                return { label: status, color: 'bg-slate-50 text-slate-700 ring-slate-600/20', icon: UserCog };
        }
    };

    return (
        <Layout title="Hak Akses & Pengguna" subtitle="Kelola izin akses dan status akun personil APIP.">
            <div className="space-y-6">
                {/* Statistics Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="card p-4 bg-primary-900 text-white relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-primary-300">Akun Terdaftar</p>
                            <h3 className="text-3xl font-black mt-1">{pagination?.total_items || 0}</h3>
                        </div>
                        <ShieldCheck size={60} className="absolute -right-4 -bottom-4 text-white/5 rotate-12" />
                    </div>
                    <div className="card p-4 border-l-4 border-l-green-500">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status Sistem</p>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <h3 className="text-xl font-bold text-slate-900">Optimal</h3>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari NIP atau email..."
                            className="form-input pl-11 bg-slate-50 border-slate-200"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                className="form-input pl-9 bg-slate-50 border-slate-200 text-sm font-bold appearance-none cursor-pointer pr-8"
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            >
                                <option value="">Semua Status</option>
                                <option value="active">✓ Aktif</option>
                                <option value="pending">⋯ Pending</option>
                                <option value="inactive">✕ Nonaktif</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Users List */}
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-primary-600 transition-colors" onClick={() => handleSort('nip')}>
                                        <div className="flex items-center gap-2">Identitas <ArrowUpDown size={12} /></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Otoritas</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Keamanan</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-primary-600 transition-colors" onClick={() => handleSort('status')}>
                                        <div className="flex items-center gap-2">Status <ArrowUpDown size={12} /></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Aktivitas Terakhir</th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="px-6 py-8"><div className="h-4 bg-slate-50 rounded w-full"></div></td>
                                        </tr>
                                    ))
                                ) : users.map((user) => {
                                    const status = getStatusInfo(user.status);
                                    const StatusIcon = status.icon;
                                    return (
                                        <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200 overflow-hidden">
                                                        {user.foto ? (
                                                            <img src={user.foto} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <UserCircle2 size={24} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 line-clamp-1">
                                                            {user.name || 'Tanpa Nama'}
                                                        </p>
                                                        <p className="text-[10px] font-mono text-slate-500 tracking-wider mt-0.5">
                                                            {user.nip ? `#${user.nip}` : 'ADMIN'} • {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.role === 'super admin' ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black text-white uppercase tracking-widest ring-1 ring-inset ring-slate-800">
                                                        <Shield size={10} className="text-accent-500" /> Admin
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest ring-1 ring-inset ring-slate-200">
                                                        Personil
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.mfa_enabled ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-black text-green-700 uppercase tracking-widest ring-1 ring-inset ring-green-600/20">
                                                        <ShieldCheck size={12} /> 2FA Aktif
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest ring-1 ring-inset ring-slate-600/10">
                                                        <Shield size={12} className="opacity-30" /> Non-Aktif
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                                                    <StatusIcon size={12} /> {status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.last_activity_at ? (
                                                    <div className="flex flex-col">
                                                        <span
                                                            className="text-xs font-black text-primary-700 cursor-help"
                                                            title={formatAbsoluteTime(user.last_activity_at)}
                                                        >
                                                            {formatRelativeTime(user.last_activity_at)}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                            {new Date(user.last_activity_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 italic font-medium text-xs lowercase">belum pernah aktif</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => openEditModal(user)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all border border-transparent hover:border-primary-100">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => { setDeletingUser(user); setShowDeleteModal(true); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.total_pages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Halaman {page} / {pagination.total_pages}</span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors"
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors"
                                    disabled={page === pagination.total_pages}
                                    onClick={() => setPage(page + 1)}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Access Modal */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="card w-full max-w-md animate-slide-up shadow-2xl overflow-hidden">
                        <div className="px-6 py-6 bg-slate-950 text-white text-center relative">
                            <h3 className="text-xl font-black relative z-10">Konfigurasi Akses</h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] mt-1 relative z-10 font-bold">Izin Penggunaan Sistem</p>
                            <UserCog size={80} className="absolute -right-4 -bottom-4 text-white/5 rotate-12" />
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-2">
                                <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-primary-600 shadow-sm">
                                    {editingUser.nip ? editingUser.nip.slice(-2) : 'AD'}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-mono text-xs font-black text-slate-900 tracking-widest">{editingUser.nip || 'ADMINISTRATOR'}</p>
                                    <p className="text-xs text-slate-500 truncate">{editingUser.email}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="form-label">Status Akun</label>
                                    <select
                                        className="form-input bg-slate-50 font-bold"
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value)}
                                        disabled={saving}
                                    >
                                        <option value="active">Aktif (Diberikan Akses)</option>
                                        <option value="pending">Pending (Menunggu Verifikasi)</option>
                                        <option value="inactive">Nonaktif (Blokir Akses)</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="form-label">Level Otoritas</label>
                                    <select
                                        className="form-input bg-slate-50 font-bold"
                                        value={newRole}
                                        onChange={(e) => setNewRole(parseInt(e.target.value))}
                                        disabled={saving}
                                    >
                                        <option value={2}>Personil APIP (Regular)</option>
                                        <option value={1}>Administrator (Full Control)</option>
                                    </select>
                                </div>

                                {editingUser.mfa_enabled && (
                                    <div className="pt-2">
                                        <label className="form-label text-red-600 flex items-center gap-2">
                                            <ShieldAlert size={14} /> Keamanan Akun
                                        </label>
                                        <div className="mt-1.5 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-red-600 tracking-widest">MFA Aktif</p>
                                                <p className="text-[10px] text-red-500 font-medium">Lindungi dari kehilangan akses.</p>
                                            </div>
                                            <button
                                                onClick={handleResetMFA}
                                                disabled={saving}
                                                className="px-3 py-1.5 bg-white text-red-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-red-200 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                            >
                                                Nonaktifkan 2FA
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowEditModal(false)} className="btn-secondary flex-1">Batal</button>
                                <button onClick={handleUpdate} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && deletingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="card w-full max-w-sm animate-slide-up shadow-2xl p-8 text-center">
                        <div className="h-16 w-16 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Hapus Akun?</h3>
                        <p className="text-sm text-slate-500 mt-2">
                            Seluruh data akses untuk <strong className="text-slate-900 font-mono tracking-wider">{deletingUser.nip ? `#${deletingUser.nip}` : 'ADMINISTRATOR'}</strong> akan dihapus permanen.
                        </p>
                        <div className="mt-8 flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="btn-secondary flex-1">Batal</button>
                            <button onClick={handleDelete} className="btn-danger flex-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl active:scale-95 transition-all shadow-lg shadow-red-200" disabled={saving}>
                                {saving ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Hapus Akun'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default UserManagement;
