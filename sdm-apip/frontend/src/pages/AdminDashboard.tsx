import React, { useState, useEffect } from 'react';
import { formatRelativeTime } from '../hooks/useRelativeTime';
import { NavLink } from 'react-router-dom';
import Layout from '../components/Layout';
import { getDashboardStats } from '../services/sdmService';
import { DashboardStats } from '../types';
import auditService, { AuditLog } from '../services/auditService';
import {
    Users,
    ShieldAlert,
    Clock,
    Activity,
    Plus,
    Link2,
    FileText,
    UserPlus,
    Database,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────
   Helper: format 'YYYY-MM' → 'Jan', 'Feb', etc.
───────────────────────────────────────────── */
const formatMonth = (ym: string): string => {
    const parts = ym.split('-');
    if (parts.length < 2) return ym;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return ym;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    return months[m - 1];
};

/* ─────────────────────────────────────────────
   Mini Sparkline bar chart (no external lib)
───────────────────────────────────────────── */
const SparkBar: React.FC<{ value: number; max: number; label: string }> = ({ value, max, label }) => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <div className="relative w-full" style={{ height: '64px' }}>
                <div
                    className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-700"
                    style={{
                        height: `${Math.max(4, pct)}%`,
                        background: pct >= 80 ? '#10b981' : pct >= 50 ? '#2563eb' : '#94a3b8',
                    }}
                />
            </div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight leading-none whitespace-nowrap">{label}</span>
            <span className="text-[10px] font-black text-slate-700 leading-none">{value}</span>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Circular Progress
───────────────────────────────────────────── */
const CircleProgress: React.FC<{ pct: number; size?: number; strokeWidth?: number; color?: string }> = ({
    pct, size = 80, strokeWidth = 8, color = '#2563eb'
}) => {
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
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
    
    // tick every 30s to refresh relative timestamps
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 30_000);
        return () => clearInterval(id);
    }, []);

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

    if (loading) {
        return (
            <Layout title="Dashboard Admin" subtitle="Memuat pusat kendali...">
                <div className="flex justify-center items-center h-64">
                    <div className="loading-spinner" />
                </div>
            </Layout>
        );
    }

    const prog = stats?.assessment_progress;
    const groupProg = stats?.group_progress ?? [];
    const trend = stats?.monthly_trend ?? [];
    const maxTrend = trend.length > 0 ? Math.max(...trend.map(t => t.count), 1) : 1;

    return (
        <Layout
            title="Pusat Kendali Admin"
            subtitle="Bento Grid Architecture — Tampilan dashboard yang struktural, dinamis, dan terintegrasi penuh."
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 auto-rows-min animate-fade-in pb-10">

                {/* ══════════════════════════════════════════
                    BENTO 1: HERO WIDGET (COL-SPAN 8)
                ══════════════════════════════════════════ */}
                <div className="lg:col-span-8 bg-gradient-to-br from-slate-900 via-primary-900 to-primary-900 rounded-[2rem] p-8 md:p-10 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8 border border-white/10">
                    <div className="relative z-10 flex-1 w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black tracking-widest uppercase border border-white/20">
                                {stats?.active_period ? 'Periode Aktif' : 'Standby Mode'}
                            </span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black mb-3 tracking-tighter leading-tight">
                            {stats?.active_period_name || 'Tidak ada periode penilaian'}
                        </h2>
                        
                        {prog && stats?.active_period ? (
                            <div className="mt-8 flex items-end gap-8 border-t border-white/10 pt-8">
                                <div>
                                    <p className="text-[10px] text-white/90 uppercase tracking-widest font-black mb-2">Target Form Tersubmit</p>
                                    <p className="text-5xl font-black tracking-tighter leading-none">{prog.total_submitted}<span className="text-2xl text-white/80">/{prog.total_required}</span></p>
                                </div>
                                <div className="flex-1 max-w-[200px]">
                                    <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" 
                                            style={{ width: `${prog.completion_pct}%` }} 
                                        />
                                    </div>
                                    <p className="text-[10px] text-emerald-300 font-bold mt-3 tracking-widest uppercase">
                                        {prog.completion_pct >= 100 ? 'SELESAI 100%' : `BERJALAN ${prog.completion_pct}%`}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-white mt-4 max-w-md leading-relaxed">Aktifkan periode baru untuk mulai melacak progress penilaian kinerja secara langsung.</p>
                        )}
                    </div>
                    
                    {prog && stats?.active_period && (
                        <div className="relative z-10 shrink-0 bg-white/5 p-6 rounded-[2.5rem] backdrop-blur-2xl border border-white/10 shadow-2xl">
                            <CircleProgress pct={prog.completion_pct} size={150} strokeWidth={14} color="#34d399" />
                            <span className="absolute inset-0 flex items-center justify-center text-4xl font-black text-white tracking-tighter">
                                {prog.completion_pct}%
                            </span>
                        </div>
                    )}

                    {/* Decorative Modern Background */}
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-[100px] opacity-40"></div>
                    <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500 rounded-full mix-blend-overlay filter blur-[100px] opacity-50"></div>
                </div>

                {/* ══════════════════════════════════════════
                    BENTO 2: QUICK ACTIONS (COL-SPAN 4)
                ══════════════════════════════════════════ */}
                <div className="lg:col-span-4 grid grid-cols-2 gap-5">
                    <NavLink to="/super-admin/periods" className="bg-white/70 backdrop-blur-3xl border border-white/60 rounded-[2rem] p-6 hover:bg-white hover:scale-[1.03] transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col items-center justify-center text-center gap-4">
                        <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-blue-100 to-primary-100 flex items-center justify-center text-primary-600 shadow-inner"><Plus size={28} /></div>
                        <div><h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Buat Periode</h4></div>
                    </NavLink>
                    <NavLink to="/super-admin/users" className="bg-white/70 backdrop-blur-3xl border border-white/60 rounded-[2rem] p-6 hover:bg-white hover:scale-[1.03] transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col items-center justify-center text-center gap-4">
                        <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-600 shadow-inner relative">
                            <UserPlus size={28} />
                            {(stats?.pending_users ?? 0) > 0 && <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-rose-500 rounded-full animate-pulse border-2 border-white shadow-sm" />}
                        </div>
                        <div><h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Verifikasi</h4></div>
                    </NavLink>
                    <NavLink to="/super-admin/groups" className="bg-white/70 backdrop-blur-3xl border border-white/60 rounded-[2rem] p-6 hover:bg-white hover:scale-[1.03] transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col items-center justify-center text-center gap-4">
                        <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center text-blue-600 shadow-inner"><Users size={28} /></div>
                        <div><h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Tim & Grup</h4></div>
                    </NavLink>
                    <NavLink to="/super-admin/report" className="bg-white/70 backdrop-blur-3xl border border-white/60 rounded-[2rem] p-6 hover:bg-white hover:scale-[1.03] transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col items-center justify-center text-center gap-4">
                        <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center text-rose-600 shadow-inner"><FileText size={28} /></div>
                        <div><h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Laporan</h4></div>
                    </NavLink>
                </div>

                {/* ══════════════════════════════════════════
                    BENTO 3: 4 METRIC SQUARES (EACH COL-SPAN 3)
                ══════════════════════════════════════════ */}
                <div className="lg:col-span-3 bg-white/70 backdrop-blur-3xl border border-white/60 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden group">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Total Personil</p>
                    <h3 className="text-5xl font-black text-slate-900 tracking-tighter">{stats?.total_sdm ?? 0}</h3>
                    <Users size={80} className="absolute -bottom-6 -right-6 text-blue-500/10 group-hover:scale-110 group-hover:text-blue-500/20 transition-all duration-500" />
                </div>
                
                <div className="lg:col-span-3 bg-white/70 backdrop-blur-3xl border border-white/60 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden group">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Login Aktif</p>
                    <h3 className="text-5xl font-black text-slate-900 tracking-tighter">{stats?.active_users ?? 0}</h3>
                    <ShieldAlert size={80} className="absolute -bottom-6 -right-6 text-emerald-500/10 group-hover:scale-110 group-hover:text-emerald-500/20 transition-all duration-500" />
                </div>

                <div className="lg:col-span-3 bg-white/70 backdrop-blur-3xl border border-rose-500/20 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden group">
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">Antrian Akun</p>
                    <h3 className="text-5xl font-black text-rose-600 tracking-tighter">{stats?.pending_users ?? 0}</h3>
                    <Clock size={80} className="absolute -bottom-6 -right-6 text-rose-500/10 group-hover:scale-110 group-hover:text-rose-500/20 transition-all duration-500" />
                </div>

                <div className="lg:col-span-3 bg-white/70 backdrop-blur-3xl border border-white/60 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden group">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Grup Terdaftar</p>
                    <h3 className="text-5xl font-black text-slate-900 tracking-tighter">{stats?.total_groups ?? 0}</h3>
                    <Activity size={80} className="absolute -bottom-6 -right-6 text-primary-500/10 group-hover:scale-110 group-hover:text-primary-500/20 transition-all duration-500" />
                </div>

                {/* ══════════════════════════════════════════
                    BENTO 4: PROGRESS DETAIL (COL-SPAN 5)
                ══════════════════════════════════════════ */}
                <div className="lg:col-span-5 bg-white/70 backdrop-blur-3xl border border-white/60 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col h-[420px]">
                    <div className="p-8 pb-5 border-b border-black/5 flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Progress Grup</h3>
                        <Activity size={18} className="text-slate-400" />
                    </div>
                    <div className="p-8 pt-4 overflow-y-auto flex-1 space-y-5">
                        {groupProg.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold uppercase tracking-wider">Belum ada grup aktif</div>
                        ) : (
                            groupProg.map(g => (
                                <div key={g.group_id}>
                                    <div className="flex items-center justify-between text-sm mb-2.5">
                                        <span className="font-bold text-slate-700 truncate pr-4">{g.group_name}</span>
                                        <span className={`font-black tracking-widest ${g.pct >= 100 ? 'text-blue-600' : 'text-slate-600'}`}>
                                            {g.pct}%
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000"
                                            style={{
                                                width: `${g.pct}%`,
                                                background: g.pct >= 100 ? '#2563eb' : g.pct > 0 ? '#3b82f6' : '#e2e8f0'
                                            }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ══════════════════════════════════════════
                    BENTO 5: AUDIT LOGS (COL-SPAN 4)
                ══════════════════════════════════════════ */}
                <div className="lg:col-span-4 bg-white/70 backdrop-blur-3xl border border-white/60 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col h-[420px]">
                    <div className="p-8 pb-5 border-b border-black/5 flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Aktivitas Live</h3>
                        <Link2 size={18} className="text-slate-400" />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {recentLogs.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold uppercase tracking-wider">Sunyi Senyap</div>
                        ) : (
                            recentLogs.map(log => (
                                <div key={log.id} className="p-4 rounded-2xl hover:bg-white transition-colors flex gap-4 items-start shadow-sm border border-transparent hover:border-slate-100">
                                    <div className={`mt-1.5 h-3 w-3 rounded-full shrink-0 ${log.action.includes('LOGIN') ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : log.action.includes('DELETE') ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]'}`} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-black text-slate-800 truncate mb-1">{log.user?.name || log.user?.nip || 'Robot Sistem'}</p>
                                        <p className="text-[11px] text-slate-500 leading-snug line-clamp-2"><span className="font-bold text-slate-700">[{log.action}]</span> {log.details}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap mt-1">{formatRelativeTime(log.created_at).replace('yang ','')}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ══════════════════════════════════════════
                    BENTO 6: SERVER & TREND (COL-SPAN 3)
                ══════════════════════════════════════════ */}
                <div className="lg:col-span-3 flex flex-col gap-5 h-[420px]">
                    {/* Trend Sparkline */}
                    <div className="flex-1 bg-white/70 backdrop-blur-3xl border border-white/60 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Tren Transaksi</h3>
                        {trend.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-[10px] font-bold uppercase text-slate-300">Kosong</div>
                        ) : (
                            <div className="flex-1 flex items-end gap-2">
                                {trend.map(t => (
                                    <SparkBar key={t.month} value={t.count} max={maxTrend} label={formatMonth(t.month)} />
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Server Status Mini */}
                    <div className="h-40 bg-slate-900 border border-slate-700 text-white rounded-[2rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                        <div className="relative z-10 flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300">Server Health</h4>
                            <div className="h-3 w-3 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-2xl font-black tracking-tighter leading-tight text-white group-hover:text-emerald-300 transition-colors">All Operational</h2>
                        </div>
                        <Database size={100} className="absolute -right-6 -bottom-8 text-white/5 rotate-12 group-hover:text-emerald-400/10 transition-colors duration-500" />
                    </div>
                </div>

            </div>
        </Layout>
    );
};

export default AdminDashboard;
