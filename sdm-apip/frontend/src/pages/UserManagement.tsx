import React, { useState, useEffect } from 'react';
import { formatRelativeTime, formatAbsoluteTime } from '../hooks/useRelativeTime';
import Layout from '../components/Layout';
import { getAllUsers, updateUserStatus, updateUserRole, deleteUser, adminDisableMFA } from '../services/userService';
import { User, Pagination } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
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
            <div className="space-y-8 animate-fade-in">
                {/* ═══════════════════════════════════════════
                    Highlights Bento
                ═══════════════════════════════════════════ */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="md:col-span-4 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl group border border-slate-800"
                    >
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                                <ShieldCheck size={24} className="text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50 mb-1">Akun Terdaftar</p>
                                <h3 className="text-5xl font-black tracking-tighter group-hover:scale-105 transition-transform origin-left duration-500">
                                    {pagination?.total_items || 0}
                                </h3>
                            </div>
                        </div>
                        <ShieldCheck size={160} className="absolute -right-12 -bottom-12 text-white/5 rotate-12 transition-transform duration-1000 group-hover:rotate-0" />
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="md:col-span-8 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/60 shadow-[0_10px_40px_rgb(0,0,0,0.04)] flex flex-col justify-center"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="space-y-2">
                                <h4 className="text-xl font-black text-slate-900 tracking-tight">Keamanan & Otoritas</h4>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-md">Kelola otorisasi akses, monitor status keamanan akun, dan konfigurasi multi-faktor otentikasi (MFA) personil.</p>
                            </div>
                            <div className="flex gap-4 shrink-0 bg-emerald-50 border border-emerald-100 p-5 rounded-[1.8rem] items-center">
                                <div className="h-10 w-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-600">
                                    <CheckCircle size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70 mb-0.5">Status Sistem</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <h3 className="text-lg font-black text-emerald-900 tracking-tight leading-none">Optimal</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Toolbar Glass Bento */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center bg-white/70 backdrop-blur-3xl p-5 rounded-[2.2rem] border border-white/60 shadow-[0_10px_40px_rgb(0,0,0,0.05)]">
                    <div className="relative flex-1 group">
                        <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari NIP atau email personil..."
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>

                    <div className="flex items-center gap-3 px-3">
                        <div className="relative group">
                            <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none" />
                            <select
                                className="w-full pl-12 pr-10 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer hover:bg-slate-50 shadow-sm"
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            >
                                <option value="">Semua Status</option>
                                <option value="active">✓ Aktif</option>
                                <option value="pending">⋯ Pending</option>
                                <option value="inactive">✕ Nonaktif</option>
                            </select>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronRight size={16} className="rotate-90" />
                            </span>
                        </div>
                    </div>
                </div>

                {/* Users List */}
                <div className="bg-white/70 backdrop-blur-3xl rounded-[2.5rem] border border-white/60 shadow-[0_20px_50px_rgb(0,0,0,0.05)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-white/40">
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('nip')}>
                                        <div className="flex items-center gap-2">Identitas <ArrowUpDown size={12} className="opacity-50" /></div>
                                    </th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Otoritas</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Keamanan</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('status')}>
                                        <div className="flex items-center gap-2">Status <ArrowUpDown size={12} className="opacity-50" /></div>
                                    </th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Aktivitas Terakhir</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/50">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="px-8 py-8"><div className="h-4 bg-slate-200/50 rounded-full w-full"></div></td>
                                        </tr>
                                    ))
                                ) : users.map((user, idx) => {
                                    const status = getStatusInfo(user.status);
                                    const StatusIcon = status.icon;
                                    return (
                                        <motion.tr 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={user.id} 
                                            className="group hover:bg-slate-50/80 transition-all duration-300"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center font-bold text-slate-400 shadow-sm border border-slate-100 overflow-hidden group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                                                        {user.foto ? (
                                                            <img src={user.foto} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <UserCircle2 size={24} strokeWidth={2.5} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                                                            {user.name || 'Tanpa Nama'}
                                                        </p>
                                                        <p className="text-[11px] font-bold text-slate-500 mt-1">
                                                            {user.nip ? `#${user.nip}` : 'ADMIN'} <span className="opacity-50 mx-1">•</span> {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                {user.role === 'super admin' ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-[10px] font-black text-white uppercase tracking-widest shadow-sm">
                                                        <Shield size={12} className="text-indigo-400" /> Admin
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-[10px] font-black text-slate-600 uppercase tracking-widest border border-slate-200 shadow-sm">
                                                        Personil
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                {user.mfa_enabled ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700 uppercase tracking-widest border border-emerald-100">
                                                        <ShieldCheck size={14} /> 2FA Aktif
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-200">
                                                        <Shield size={14} className="opacity-40" /> Non-Aktif
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${status.color.replace('ring-', 'border-').replace('/20', '')}`}>
                                                    <StatusIcon size={14} /> {status.label}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                {user.last_activity_at ? (
                                                    <div className="flex flex-col">
                                                        <span
                                                            className="text-xs font-black text-indigo-600 cursor-help"
                                                            title={formatAbsoluteTime(user.last_activity_at)}
                                                        >
                                                            {formatRelativeTime(user.last_activity_at)}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold tracking-widest mt-1 uppercase">
                                                            {new Date(user.last_activity_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 italic font-bold text-[11px] uppercase tracking-widest">Belum Aktif</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                                    <button onClick={() => openEditModal(user)} className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100">
                                                        <Edit2 size={16} strokeWidth={2.5} />
                                                    </button>
                                                    <button onClick={() => { setDeletingUser(user); setShowDeleteModal(true); }} className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100">
                                                        <Trash2 size={16} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.total_pages > 1 && (
                        <div className="px-8 py-6 border-t border-slate-100/50 flex items-center justify-between bg-slate-50/30">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Halaman <span className="text-indigo-600">{page}</span> dari {pagination.total_pages}</span>
                            <div className="flex items-center gap-2">
                                <button
                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-700 disabled:hover:bg-white transition-all shadow-sm"
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)}
                                >
                                    <ChevronLeft size={18} strokeWidth={2.5} />
                                </button>
                                <button
                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-700 disabled:hover:bg-white transition-all shadow-sm"
                                    disabled={page === pagination.total_pages}
                                    onClick={() => setPage(page + 1)}
                                >
                                    <ChevronRight size={18} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Access Modal Premium */}
            <AnimatePresence>
                {showEditModal && editingUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => !saving && setShowEditModal(false)}/>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.35)] overflow-hidden"
                        >
                            <div className="bg-slate-900 px-10 py-10 text-white text-center relative overflow-hidden border-b border-white/5">
                                <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12">
                                    <UserCog size={100} />
                                </div>
                                <h3 className="text-3xl font-black italic tracking-tight relative z-10 uppercase">Konfigurasi Akses</h3>
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 relative z-10 italic">Manajemen Izin Sistem</p>
                            </div>
                            <div className="p-10 space-y-8">
                                <div className="flex items-center gap-5 p-5 rounded-[2rem] bg-slate-50 border border-slate-100 shadow-inner">
                                    <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-indigo-600 shadow-sm text-lg">
                                        {editingUser.nip ? editingUser.nip.slice(-2) : 'AD'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-mono text-sm font-black text-slate-900 tracking-widest">{editingUser.nip || 'ADMINISTRATOR'}</p>
                                        <p className="text-xs font-bold text-slate-500 truncate mt-1">{editingUser.email}</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">Status Akun</label>
                                        <div className="relative hover:shadow-sm transition-shadow rounded-2xl">
                                            <select
                                                className="w-full bg-slate-50 border-2 border-slate-50 focus:border-indigo-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-black text-slate-800 transition-all outline-none appearance-none cursor-pointer"
                                                value={newStatus}
                                                onChange={(e) => setNewStatus(e.target.value)}
                                                disabled={saving}
                                            >
                                                <option value="active">✓ Aktif (Diberikan Akses)</option>
                                                <option value="pending">⋯ Pending (Menunggu Verifikasi)</option>
                                                <option value="inactive">✕ Nonaktif (Blokir Akses)</option>
                                            </select>
                                            <ChevronRight size={18} className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">Level Otoritas</label>
                                        <div className="relative hover:shadow-sm transition-shadow rounded-2xl">
                                            <select
                                                className="w-full bg-slate-50 border-2 border-slate-50 focus:border-indigo-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-black text-slate-800 transition-all outline-none appearance-none cursor-pointer"
                                                value={newRole}
                                                onChange={(e) => setNewRole(parseInt(e.target.value))}
                                                disabled={saving}
                                            >
                                                <option value={2}>Personil APIP (Regular)</option>
                                                <option value={1}>Administrator (Full Control)</option>
                                            </select>
                                            <ChevronRight size={18} className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {editingUser.mfa_enabled && (
                                        <div className="pt-4 border-t border-slate-100">
                                            <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2 mb-3">
                                                <ShieldAlert size={14} /> Keamanan Akun Lapisan Ganda
                                            </label>
                                            <div className="p-5 rounded-[2rem] bg-rose-50 border border-rose-100 flex items-center justify-between shadow-inner">
                                                <div>
                                                    <p className="text-[11px] font-black uppercase text-rose-700 tracking-widest mb-1">MFA Sedang Aktif</p>
                                                    <p className="text-[10px] text-rose-500 font-bold">Opsi reset untuk kehilangan akses.</p>
                                                </div>
                                                <button
                                                    onClick={handleResetMFA}
                                                    disabled={saving}
                                                    className="px-4 py-2.5 bg-white text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-rose-200 hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"
                                                >
                                                    MFA Reset
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button onClick={() => setShowEditModal(false)} className="flex-1 py-5 rounded-2xl bg-white border-2 border-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all">Batalkan</button>
                                    <button onClick={handleUpdate} className="flex-[2] py-5 rounded-3xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95" disabled={saving}>
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : 'Simpan Perubahan'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Modal Premium */}
            <AnimatePresence>
                {showDeleteModal && deletingUser && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => !saving && setShowDeleteModal(false)}/>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            <div className="bg-rose-600 px-10 py-10 text-white text-center relative overflow-hidden">
                                <div className="h-24 w-24 rounded-[2.2rem] bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-6 border-2 border-white/30 shadow-2xl relative z-10"><AlertTriangle size={40} strokeWidth={2.5} /></div>
                                <h3 className="text-3xl font-black italic tracking-tighter relative z-10 uppercase">HAPUS AKUN</h3>
                                <p className="text-rose-200 text-[10px] font-black uppercase tracking-[0.3em] mt-2 relative z-10 font-bold">Peringatan Penghapusan Data</p>
                            </div>
                            <div className="p-10 space-y-8">
                                <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] space-y-4">
                                    <p className="text-[13px] font-bold text-rose-700 leading-relaxed text-center">
                                        Seluruh data akses dan riwayat aktivitas untuk <strong className="text-rose-900 font-mono tracking-widest">{deletingUser.nip ? `#${deletingUser.nip}` : 'ADMINISTRATOR'}</strong> akan dihapus permanen dari sistem.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-3 pt-4">
                                    <button onClick={handleDelete} className="w-full py-5 rounded-3xl bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-rose-200 hover:bg-rose-600 transition-all active:scale-95 flex items-center justify-center gap-3" disabled={saving}>
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : 'Yakin, Hapus Permanen'}
                                    </button>
                                    <button onClick={() => { setShowDeleteModal(false); setDeletingUser(null); }} className="w-full py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-colors">Batalkan Operasi</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
};

export default UserManagement;
