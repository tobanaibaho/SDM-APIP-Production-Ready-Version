import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Layout from '../components/Layout';
import { getDashboardStats } from '../services/sdmService';
import { DashboardStats } from '../types';
import auditService, { AuditLog } from '../services/auditService';
import {
    Users,
    Calendar,
    ShieldAlert,
    Clock,
    Activity,
    ArrowRight,
    Plus,
    Link2,
    FileText,
    UserPlus,
    Database,
    BarChart3,
    AlertTriangle,
    CheckCircle2,
    TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────
   Helper: format 'YYYY-MM' → 'Jan', 'Feb', etc.
───────────────────────────────────────────── */
const formatMonth = (ym: string): string => {
    const [y, m] = ym.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('id-ID', { month: 'short' });
};

/* ─────────────────────────────────────────────
   Mini Sparkline bar chart (no external lib)
───────────────────────────────────────────── */
const SparkBar: React.FC<{ value: number; max: number; label: string }> = ({ value, max, label }) => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="w-full flex items-end h-16 rounded-t overflow-hidden">
                <div
                    className="w-full bg-primary-500 rounded-t transition-all duration-700"
                    style={{ height: `${Math.max(4, pct)}%` }}
                />
            </div>
            <span className="text-[9px] font-bold text-slate-500 uppercase">{label}</span>
            <span className="text-[10px] font-black text-slate-700">{value}</span>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Circular Progress
───────────────────────────────────────────── */
const CircleProgress: React.FC<{ pct: number; size?: number; strokeWidth?: number; color?: string }> = ({
    pct, size = 80, strokeWidth = 8, color = '#6366f1'
}) => {
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
            <circle
                cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={color} strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease' }}
            />
        </svg>
    );
};

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [statsData, logsData] = await Promise.all([
                getDashboardStats(),
                auditService.getAllAuditLogs(1, 6),
            ]);
            setStats(statsData);
            setRecentLogs(logsData.data);
        } catch (error) {
            console.error('Dashboard load error:', error);
            toast.error('Gagal memuat data dashboard');
        } finally {
            setLoading(false);
        }
    };

    const QuickAction = ({ to, label, icon: Icon, color, desc }: any) => (
        <NavLink to={to} className="group p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary-200 hover:shadow-lg hover:shadow-primary-500/5 transition-all flex items-center gap-3">
            <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform shrink-0`}>
                <Icon size={20} className={color.replace('bg-', 'text-')} />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-800 group-hover:text-primary-700 truncate">{label}</h4>
                <p className="text-[10px] text-slate-400 truncate">{desc}</p>
            </div>
            <ArrowRight size={14} className="text-slate-300 group-hover:text-primary-400 -translate-x-1 group-hover:translate-x-0 transition-transform" />
        </NavLink>
    );

    if (loading) {
        return (
            <Layout title="Dashboard Admin" subtitle="Memuat pusat kendali...">
                <div className="flex justify-center items-center h-64">
                    <div className="loading-spinner" />
                </div>
            </Layout>
        );
    }

    // Derived
    const prog = stats?.assessment_progress;
    const groupProg = stats?.group_progress ?? [];
    const neverLogin = stats?.never_login_users ?? [];
    const trend = stats?.monthly_trend ?? [];
    const maxTrend = trend.length > 0 ? Math.max(...trend.map(t => t.count), 1) : 1;

    return (
        <Layout
            title="Pusat Kendali Admin"
            subtitle={`Halo Administrator — Sistem SDM APIP berjalan normal.`}
        >
            <div className="space-y-6 animate-fade-in">

                {/* ══════════════════════════════════════════
                    ROW 1: 5 Stat Cards
                ══════════════════════════════════════════ */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {/* Total Personil */}
                    <div className="card p-5 border-l-4 border-l-blue-500 relative overflow-hidden group col-span-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Personil</p>
                        <h3 className="text-3xl font-black text-slate-900">{stats?.total_sdm ?? 0}</h3>
                        <p className="text-[9px] text-slate-400 mt-1">Data Master SDM</p>
                        <Users size={48} className="absolute -right-2 -bottom-3 text-blue-50 group-hover:-rotate-12 transition-all" />
                    </div>

                    {/* User Aktif */}
                    <div className="card p-5 border-l-4 border-l-emerald-500 relative overflow-hidden group col-span-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Akun Aktif</p>
                        <h3 className="text-3xl font-black text-slate-900">{stats?.active_users ?? 0}</h3>
                        <p className="text-[9px] text-slate-400 mt-1">Dapat login ke sistem</p>
                        <ShieldAlert size={48} className="absolute -right-2 -bottom-3 text-emerald-50 group-hover:-rotate-12 transition-all" />
                    </div>

                    {/* Registrasi Baru */}
                    <div className="card p-5 border-l-4 border-l-amber-500 relative overflow-hidden group col-span-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Registrasi Baru</p>
                        <h3 className="text-3xl font-black text-slate-900">{stats?.pending_users ?? 0}</h3>
                        <p className="text-[9px] text-slate-400 mt-1">Menunggu verifikasi</p>
                        {(stats?.pending_users ?? 0) > 0 && (
                            <span className="absolute top-3 right-3 h-2 w-2 bg-amber-400 rounded-full animate-pulse" />
                        )}
                        <Clock size={48} className="absolute -right-2 -bottom-3 text-amber-50 group-hover:-rotate-12 transition-all" />
                    </div>

                    {/* Total Grup */}
                    <div className="card p-5 border-l-4 border-l-purple-500 relative overflow-hidden group col-span-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Grup</p>
                        <h3 className="text-3xl font-black text-slate-900">{stats?.total_groups ?? 0}</h3>
                        <p className="text-[9px] text-slate-400 mt-1">Tim aktif berjalan</p>
                        <Users size={48} className="absolute -right-2 -bottom-3 text-purple-50 group-hover:-rotate-12 transition-all" />
                    </div>

                    {/* Periode */}
                    <div className={`card p-5 border-l-4 ${stats?.active_period ? 'border-l-green-500' : 'border-l-slate-300'} relative overflow-hidden group col-span-1`}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Periode</p>
                        <div className="flex items-center gap-2">
                            <h3 className={`text-2xl font-black ${stats?.active_period ? 'text-green-600' : 'text-slate-400'}`}>
                                {stats?.active_period ? 'AKTIF' : 'NON-AKTIF'}
                            </h3>
                            {stats?.active_period && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1 truncate">{stats?.active_period_name || '—'}</p>
                        <Calendar size={48} className="absolute -right-2 -bottom-3 text-slate-50 group-hover:-rotate-12 transition-all" />
                    </div>
                </div>

                {/* ══════════════════════════════════════════
                    ROW 2: Progress Penilaian + Trend
                ══════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Progress Penilaian Besar */}
                    <div className="card p-6 flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 size={16} className="text-primary-600" />
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Progress Penilaian Aktif</h3>
                        </div>
                        {prog && stats?.active_period ? (
                            <>
                                <p className="text-xs font-bold text-slate-400 -mt-2">{prog.period_name}</p>
                                <div className="flex items-center gap-5">
                                    <div className="relative shrink-0">
                                        <CircleProgress
                                            pct={prog.completion_pct}
                                            size={96}
                                            strokeWidth={10}
                                            color={prog.completion_pct >= 80 ? '#10b981' : prog.completion_pct >= 40 ? '#f59e0b' : '#6366f1'}
                                        />
                                        <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-slate-900">
                                            {prog.completion_pct}%
                                        </span>
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Tersubmit</p>
                                            <p className="text-2xl font-black text-slate-900">
                                                {prog.total_submitted}
                                                <span className="text-sm font-bold text-slate-400"> / {prog.total_required}</span>
                                            </p>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000"
                                                style={{
                                                    width: `${prog.completion_pct}%`,
                                                    background: prog.completion_pct >= 80 ? '#10b981' : prog.completion_pct >= 40 ? '#f59e0b' : '#6366f1'
                                                }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400">
                                            {prog.months_required > 1 ? `Periode ${prog.months_required} bulan` : 'Periode bulanan'}
                                            &nbsp;· sisa {prog.total_required - prog.total_submitted} formulir
                                        </p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                                <Calendar size={36} className="text-slate-200" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tidak ada periode aktif</p>
                                <NavLink to="/super-admin/periods" className="text-[10px] font-bold text-primary-600 hover:underline">
                                    Buat Periode Baru →
                                </NavLink>
                            </div>
                        )}
                    </div>

                    {/* Progress Per Grup */}
                    <div className="card overflow-hidden lg:col-span-2">
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <Activity size={14} className="text-primary-600" />
                                <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider">Progress Per Grup</h3>
                            </div>
                            <NavLink to="/super-admin/groups" className="text-[10px] font-bold text-primary-600 hover:underline">
                                Kelola Grup →
                            </NavLink>
                        </div>
                        <div className="p-4 space-y-3 max-h-52 overflow-y-auto">
                            {groupProg.length === 0 ? (
                                <p className="text-center text-xs text-slate-400 py-8">
                                    {stats?.active_period ? 'Belum ada relasi penilaian dikonfigurasi' : 'Aktifkan periode terlebih dahulu'}
                                </p>
                            ) : (
                                groupProg.map(g => (
                                    <div key={g.group_id}>
                                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                                            <span className="font-bold text-slate-700 truncate max-w-[160px]">{g.group_name}</span>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {g.pct >= 100
                                                    ? <CheckCircle2 size={12} className="text-emerald-500" />
                                                    : g.pct > 0
                                                        ? <TrendingUp size={12} className="text-amber-500" />
                                                        : <Clock size={12} className="text-slate-300" />
                                                }
                                                <span className={`font-black ${g.pct >= 100 ? 'text-emerald-600' : g.pct > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                    {g.pct}%
                                                </span>
                                                <span className="text-slate-400">({g.submitted}/{g.required})</span>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${g.pct}%`,
                                                    background: g.pct >= 100 ? '#10b981' : g.pct > 0 ? '#f59e0b' : '#e2e8f0'
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════
                    ROW 3: Main Content (3 col)
                ══════════════════════════════════════════ */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* LEFT: Quick Actions + Trend Chart */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* Quick Actions */}
                        <section>
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <Activity size={16} className="text-primary-600" />
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Aksi Cepat</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <QuickAction to="/super-admin/periods" label="Buat Periode Baru" desc="Mulai siklus penilaian 360°"
                                    icon={Plus} color="bg-purple-500 text-purple-600" />
                                <QuickAction to="/super-admin/users" label="Verifikasi User" desc={`${stats?.pending_users ?? 0} pendaftar menunggu`}
                                    icon={UserPlus} color="bg-emerald-500 text-emerald-600" />
                                <QuickAction to="/super-admin/cross-group-relations" label="Relasi Lintas Grup" desc="Hubungkan penilai antar unit"
                                    icon={Link2} color="bg-blue-500 text-blue-600" />
                                <QuickAction to="/super-admin/report" label="Unduh Laporan" desc="Export nilai akhir ke Excel/PDF"
                                    icon={FileText} color="bg-rose-500 text-rose-600" />
                            </div>
                        </section>

                        {/* Monthly Trend Sparkline */}
                        <section className="card p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={14} className="text-primary-600" />
                                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider">Tren Pengisian Penilaian (6 Bulan Terakhir)</h3>
                                </div>
                            </div>
                            {trend.length === 0 ? (
                                <div className="flex items-center justify-center h-20 text-xs text-slate-400">
                                    Belum ada data penilaian
                                </div>
                            ) : (
                                <div className="flex items-end gap-2 h-20">
                                    {trend.map(t => (
                                        <SparkBar key={t.month} value={t.count} max={maxTrend} label={formatMonth(t.month)} />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Recent Audit Logs */}
                        <section className="card overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider">Aktivitas Sistem Terkini</h3>
                                <NavLink to="/super-admin/audit-logs" className="text-[10px] font-bold text-primary-600 hover:underline">
                                    Lihat Semua Log
                                </NavLink>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {recentLogs.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <Activity size={32} className="mx-auto text-slate-200 mb-2" />
                                        <p className="text-xs text-slate-400">Belum ada aktivitas tercatat</p>
                                    </div>
                                ) : (
                                    recentLogs.map(log => (
                                        <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors group">
                                            <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${log.action.includes('LOGIN') ? 'bg-green-500 ring-2 ring-green-100' :
                                                log.action.includes('DELETE') ? 'bg-red-500 ring-2 ring-red-100' :
                                                    log.action.includes('UPDATE') ? 'bg-amber-500 ring-2 ring-amber-100' : 'bg-blue-500 ring-2 ring-blue-100'
                                                }`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[11px] font-bold text-slate-800">{log.user?.name || log.user?.nip || 'System'}</span>
                                                    <span className="text-[9px] font-mono text-slate-400 px-1 rounded bg-slate-100">{log.ip_address}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 truncate group-hover:text-slate-700 group-hover:whitespace-normal transition-all">
                                                    <span className="font-bold text-slate-600 mr-1">[{log.action}]</span>{log.details}
                                                </p>
                                            </div>
                                            <span className="text-[9px] text-slate-400 whitespace-nowrap mt-1">
                                                {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>

                    {/* RIGHT: Server status + Unit kerja + Never-login users */}
                    <div className="space-y-6">
                        {/* Server Status */}
                        <div className="card p-5 bg-slate-800 text-white relative overflow-hidden">
                            <div className="relative z-10 space-y-4">
                                <div>
                                    <h4 className="font-bold text-sm">Status Server</h4>
                                    <p className="text-[10px] text-slate-400">Real-time monitoring</p>
                                </div>
                                <div className="space-y-2">
                                    {[['Database', true], ['API Gateway', true], ['Auth Service', true]].map(([label, ok]) => (
                                        <div key={label as string} className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400">{label as string}</span>
                                            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <div className="h-1 w-1 bg-emerald-400 rounded-full animate-pulse" />
                                                {ok ? 'Online' : 'Offline'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Database size={60} className="absolute -right-2 -bottom-6 text-white/5 rotate-12" />
                        </div>


                        {/* Belum Pernah Login */}
                        <div className="card overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 bg-amber-50/50 flex items-center gap-2">
                                <AlertTriangle size={13} className="text-amber-500" />
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Belum Pernah Login</h4>
                                {neverLogin.length > 0 && (
                                    <span className="ml-auto text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                        {neverLogin.length}
                                    </span>
                                )}
                            </div>
                            {neverLogin.length === 0 ? (
                                <div className="p-6 text-center">
                                    <CheckCircle2 size={28} className="mx-auto text-emerald-300 mb-2" />
                                    <p className="text-xs text-slate-400">Semua akun sudah login</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                                    {neverLogin.map(u => (
                                        <div key={u.user_id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-amber-50/30 transition-colors">
                                            <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                                                {u.nama?.charAt(0) || u.nip?.slice(-1)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[11px] font-bold text-slate-800 truncate">{u.nama || 'N/A'}</p>
                                                <p className="text-[9px] text-slate-400 truncate">{u.jabatan || u.nip}</p>
                                            </div>
                                            <NavLink
                                                to="/super-admin/users"
                                                className="shrink-0 text-[9px] font-black text-primary-600 hover:underline uppercase tracking-wider"
                                            >
                                                Cek
                                            </NavLink>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AdminDashboard;
