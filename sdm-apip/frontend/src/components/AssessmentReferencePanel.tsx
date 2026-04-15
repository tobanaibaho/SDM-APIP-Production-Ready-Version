import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    BarChart3,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Info,
    Eye,
    EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface IndicatorReference {
    peer_avg: number;
    bawahan_avg: number;
    overall_avg: number;
}

interface AssessmentReference {
    target: {
        name: string;
        nip: string;
        jabatan: string;
    };
    period_name: string;
    summary: {
        peer_count: number;
        bawahan_count: number;
        peer_avg: number;
        bawahan_avg: number;
        overall_avg: number;
    };
    indicators: Record<string, IndicatorReference>;
    is_ready: boolean;
    warning: string;
}

interface Props {
    targetUserId: string | null;
    periodId: string | null;
    relationType: string | null;
    evaluatorJabatan?: string | null;
}

const INDICATOR_ORDER = [
    'Berorientasi Pelayanan',
    'Akuntabel',
    'Kompeten',
    'Harmonis',
    'Loyal',
    'Adaptif',
    'Kolaboratif',
];

/* Warna progress bar berdasarkan nilai */
const barBg = (v: number) =>
    v >= 80 ? 'bg-emerald-500' : v >= 65 ? 'bg-amber-400' : 'bg-indigo-400';

/* Warna teks skor */
const scoreColor = (v: number) =>
    v >= 80 ? 'text-emerald-600' : v >= 65 ? 'text-amber-600' : v > 0 ? 'text-slate-700' : 'text-slate-300';

/* Label kategori nilai */
const scoreLabel = (v: number) =>
    v >= 80 ? 'Baik' : v >= 65 ? 'Cukup' : v > 0 ? 'Kurang' : '—';

const AssessmentReferencePanel: React.FC<Props> = ({ targetUserId, periodId, relationType, evaluatorJabatan }) => {
    const { user } = useAuth();
    const [data, setData] = useState<AssessmentReference | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(true);

    const jabatan = evaluatorJabatan || user?.jabatan || '';
    const isAtasan = relationType === 'Atasan' && jabatan.toLowerCase().includes('inspektur');

    useEffect(() => {
        if (!isAtasan || !targetUserId || !periodId) return;
        const fetchReference = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await api.get(`/user/assessments/reference/${targetUserId}?period_id=${periodId}`);
                setData(res.data?.data || null);
            } catch (err: any) {
                if (err?.response?.status === 403) {
                    setData(null);
                } else {
                    setError('Tidak dapat memuat data referensi.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchReference();
    }, [targetUserId, periodId, isAtasan]);

    if (!isAtasan) return null;

    /* ── Loading ── */
    if (loading) {
        return (
            <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <Loader2 size={16} className="text-indigo-400 animate-spin shrink-0" />
                <p className="text-xs font-bold text-indigo-500">Memuat data referensi...</p>
            </div>
        );
    }

    /* ── Error ── */
    if (error) {
        return (
            <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-red-50 rounded-xl border border-red-100">
                <AlertTriangle size={15} className="text-red-400 shrink-0" />
                <p className="text-xs font-semibold text-red-600">{error}</p>
            </div>
        );
    }

    /* ── No data ── */
    if (!data) {
        return (
            <div className="mt-3 flex items-start gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Info size={15} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-xs font-black text-slate-600 uppercase tracking-wide">Referensi Belum Tersedia</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Belum ada penilaian rekan yang masuk pada periode ini.</p>
                </div>
            </div>
        );
    }

    const { summary, indicators, is_ready, warning } = data;
    const totalPenilai = (summary?.peer_count || 0) + (summary?.bawahan_count || 0);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-[2rem] border border-indigo-100 bg-white/60 backdrop-blur-md overflow-hidden shadow-sm"
        >
            {/* ── Header ── */}
            <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between px-6 py-5 hover:bg-white/40 transition-all outline-none"
            >
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                        <BarChart3 size={20} strokeWidth={2.5} />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 leading-none mb-1">Panduan Pengisian</p>
                        <p className="text-lg font-black text-slate-900 leading-tight">Referensi Nilai Kolektif</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {is_ready ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-tight">
                            <CheckCircle2 size={12} strokeWidth={3} /> Trusted
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[10px] font-black uppercase tracking-tight">
                            <AlertTriangle size={12} strokeWidth={3} /> Parsial
                        </span>
                    )}
                    <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                        {expanded
                            ? <EyeOff size={18} strokeWidth={2.5} />
                            : <Eye size={18} strokeWidth={2.5} />
                        }
                    </div>
                </div>
            </button>

            {/* ── Body ── */}
            <AnimatePresence>
                {expanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-slate-100 px-6 pb-6 pt-5 space-y-5">
                            {/* Warning */}
                            {!is_ready && warning && (
                                <div className="flex items-start gap-3 p-4 bg-amber-50/50 border border-amber-200/50 rounded-2xl">
                                    <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                                    <p className="text-[11px] font-bold text-amber-800 leading-relaxed">{warning}</p>
                                </div>
                            )}

                            {/* ── Overall Score Card ── */}
                            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-indigo-50/30 rounded-[2rem] border border-indigo-100/50 relative overflow-hidden group/card">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover/card:scale-110 transition-transform duration-1000">
                                    <BarChart3 size={120} strokeWidth={1} />
                                </div>
                                {/* Score Circle */}
                                <div className="relative shrink-0 flex flex-col items-center justify-center w-24 h-24 rounded-[2rem] bg-indigo-600 text-white shadow-xl shadow-indigo-200">
                                    <p className="text-3xl font-black leading-none">
                                        {summary.overall_avg > 0 ? summary.overall_avg.toFixed(1) : '—'}
                                    </p>
                                    <p className="text-[9px] font-black uppercase tracking-widest mt-1 text-indigo-200">
                                        {scoreLabel(summary.overall_avg)}
                                    </p>
                                </div>
                                <div className="flex-1 text-center sm:text-left">
                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1.5">Skor Agregat Saat Ini</h4>
                                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed mb-4">
                                        Data ditarik dari <strong className="text-slate-900">{totalPenilai} responden</strong>. Gunakan sebagai alat validasi atas persepsi Anda terhadap target.
                                    </p>
                                    <div className="h-2 w-full bg-white/80 rounded-full overflow-hidden shadow-inner">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.max(0, Math.min(100, summary.overall_avg))}%` }}
                                            transition={{ duration: 1.5, ease: 'easeOut' }}
                                            className={`h-full rounded-full ${barBg(summary.overall_avg)}`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Indicators Grid ── */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {INDICATOR_ORDER.map((ind) => {
                                    const d = indicators[ind];
                                    if (!d) return null;
                                    const val = d.overall_avg;
                                    return (
                                        <div key={ind} className="px-5 py-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-2 group/ind hover:border-indigo-200 transition-all">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover/ind:text-slate-900 transition-colors">{ind}</p>
                                                <span className={`text-xs font-black p-1 px-2 rounded-lg bg-slate-50 border border-slate-100 group-hover/ind:border-indigo-100 transition-all ${scoreColor(val)}`}>
                                                    {val > 0 ? val.toFixed(1) : '—'}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${barBg(val)}`}
                                                    style={{ width: `${Math.max(0, Math.min(100, val))}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-slate-900/[0.02] rounded-2xl border border-slate-100 border-dashed">
                                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
                                    <Info size={16} className="shrink-0" strokeWidth={2.5} />
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
                                    Informasi ini bersifat rahasia. Jangan membocorkan nilai ini kepada target penilaian guna menjaga objektivitas sistem.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default AssessmentReferencePanel;
