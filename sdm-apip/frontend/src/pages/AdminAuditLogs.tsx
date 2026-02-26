import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getAllAuditLogs, AuditLog } from '../services/auditService';
import { Pagination } from '../types';
import {
    Activity,
    Shield,
    RotateCcw,
    Filter,
    ChevronLeft,
    ChevronRight,
    Terminal,
    AlertCircle,
    CheckCircle2,
    Monitor,
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminAuditLogs: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        fetchLogs();
    }, [page, actionFilter, statusFilter]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await getAllAuditLogs(page, 15, actionFilter, statusFilter);
            setLogs(response.data || []);
            setPagination(response.pagination);
        } catch (error) {
            toast.error('Gagal memuat log audit');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status.toLowerCase()) {
            case 'success':
                return 'bg-green-50 text-green-700 ring-green-600/20';
            case 'failed':
                return 'bg-red-50 text-red-700 ring-red-600/20';
            case 'pending':
                return 'bg-amber-50 text-amber-700 ring-amber-600/20';
            default:
                return 'bg-slate-50 text-slate-700 ring-slate-600/20';
        }
    };

    const getActionLabel = (action: string) => {
        return action.replace(/_/g, ' ').toUpperCase();
    };

    return (
        <Layout
            title="Log Audit Keamanan"
            subtitle="Monitor seluruh aktivitas krusial dan rekaman keamanan sistem secara real-time."
        >
            <div className="space-y-6">
                {/* Statistics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card p-6 border-l-4 border-l-slate-900 bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                                <Activity size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Aktivitas</p>
                                <h3 className="text-2xl font-black text-slate-900">{pagination?.total_items || 0}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="card p-6 border-l-4 border-l-primary-500 bg-white">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                                <Shield size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status Sistem</p>
                                <h3 className="text-2xl font-black text-slate-900 italic">SECURE</h3>
                            </div>
                        </div>
                    </div>
                    <div className="card p-6 border-l-4 border-l-accent-500 bg-white">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center">
                                <Terminal size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Sesi Terpantau</p>
                                <h3 className="text-2xl font-black text-slate-900 uppercase">ACTIVE</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="relative flex-1 group">
                        <Filter size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                        <select
                            className="form-input pl-11 bg-slate-50 border-slate-200 text-xs font-black uppercase tracking-widest appearance-none cursor-pointer"
                            value={actionFilter}
                            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">Semua Aktivitas</option>
                            <option value="login">Login</option>
                            <option value="login_failed">Login Gagal</option>
                            <option value="user_update">Update User</option>
                            <option value="role_change">Perubahan Role</option>
                            <option value="status_change">Perubahan Status</option>
                            <option value="admin_reset">Admin Reset</option>
                            <option value="password_change">Ganti Password</option>
                        </select>
                    </div>

                    <div className="relative w-full md:w-64 group">
                        <Filter size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                        <select
                            className="form-input pl-11 bg-slate-50 border-slate-200 text-xs font-black uppercase tracking-widest appearance-none cursor-pointer"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">Semua Status</option>
                            <option value="success">✓ Berhasil</option>
                            <option value="failed">✕ Gagal</option>
                            <option value="pending">⋯ Proses</option>
                        </select>
                    </div>

                    <button
                        onClick={() => { setActionFilter(''); setStatusFilter(''); setPage(1); }}
                        className="p-3 text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all rounded-xl"
                        title="Reset Filter"
                    >
                        <RotateCcw size={20} />
                    </button>
                </div>

                {/* Logs Table */}
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 w-48">Timestamp</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Aktor</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Aktivitas</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Target / Detail</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Koneksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="px-6 py-8"><div className="h-4 bg-slate-50 rounded w-full"></div></td>
                                        </tr>
                                    ))
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-30">
                                                <Activity size={48} />
                                                <p className="text-sm font-bold">Tidak ada rekaman log ditemukan</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900 font-mono tracking-tighter">
                                                    {new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 font-mono">
                                                    {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">
                                                    {log.user?.email ? log.user.email[0].toUpperCase() : 'S'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-900 truncate max-w-[120px]">
                                                        {log.user?.name || log.user?.email || 'SYSTEM'}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {log.user?.nip ? `NIP: ${log.user.nip}` : 'Root'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black tracking-widest border border-slate-200 uppercase">
                                                {getActionLabel(log.action)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col max-w-xs">
                                                <p className="text-[10px] font-bold text-slate-600 leading-relaxed italic">
                                                    {log.details || '-'}
                                                </p>
                                                {log.target_user && (
                                                    <p className="text-[9px] font-black text-primary-600 mt-1 uppercase tracking-tight">
                                                        Target: {log.target_user.name || log.target_user.email}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] ring-1 ring-inset ${getStatusStyle(log.status)}`}>
                                                {log.status === 'success' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <Monitor size={10} />
                                                    <span className="text-[10px] font-bold font-mono text-primary-700">{log.ip_address}</span>
                                                </div>
                                                <div className="mt-1 text-[9px] text-slate-400 font-medium truncate max-w-[150px]" title={log.user_agent}>
                                                    {log.user_agent || 'Unknown UA'}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.total_pages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Halaman {page} / {pagination.total_pages}</span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95"
                                    disabled={page === 1}
                                    onClick={() => { setPage(page - 1); window.scrollTo(0, 0); }}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95"
                                    disabled={page === pagination.total_pages}
                                    onClick={() => { setPage(page + 1); window.scrollTo(0, 0); }}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default AdminAuditLogs;
