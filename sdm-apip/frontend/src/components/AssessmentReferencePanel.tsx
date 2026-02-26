import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    BarChart3,
    AlertTriangle,
    CheckCircle2,
    Users,
    ChevronDown,
    ChevronUp,
    Loader2,
    Info
} from 'lucide-react';

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
    relationType: string | null;  // only show for 'Atasan'
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

const ProgressBar: React.FC<{ value: number; color?: string }> = ({ value, color = 'bg-primary-500' }) => (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
            className={`h-full rounded-full transition-all duration-700 ${color}`}
            style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
    </div>
);

const ScoreBadge: React.FC<{ value: number; label: string }> = ({ value, label }) => {
    const color = value >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
        : value >= 65 ? 'text-amber-600 bg-amber-50 border-amber-200'
            : value > 0 ? 'text-slate-600 bg-slate-50 border-slate-200'
                : 'text-slate-300 bg-slate-50 border-slate-100';

    return (
        <div className={`flex flex-col items-center px-3 py-2 rounded-xl border ${color}`}>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-70">{label}</span>
            <span className="text-lg font-black leading-tight">
                {value > 0 ? value.toFixed(1) : '-'}
            </span>
        </div>
    );
};

const AssessmentReferencePanel: React.FC<Props> = ({ targetUserId, periodId, relationType }) => {
    const [data, setData] = useState<AssessmentReference | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(true);

    // Only relevant for Atasan evaluators
    const isAtasan = relationType === 'Atasan';

    useEffect(() => {
        if (!isAtasan || !targetUserId || !periodId) return;

        const fetchReference = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await api.get(
                    `/user/assessments/reference/${targetUserId}?period_id=${periodId}`
                );
                setData(res.data?.data || null);
            } catch (err: any) {
                // 403 means not Atasan — hide panel silently
                if (err?.response?.status === 403) {
                    setData(null);
                } else {
                    setError('Tidak dapat memuat data referensi saat ini.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchReference();
    }, [targetUserId, periodId, isAtasan]);

    // Don't render for non-Atasan evaluators
    if (!isAtasan) return null;

    // Loading state
    if (loading) {
        return (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-100 rounded-[2rem] p-8 flex items-center gap-4">
                <Loader2 size={24} className="text-indigo-400 animate-spin shrink-0" />
                <div>
                    <p className="font-black text-indigo-900 text-sm uppercase tracking-widest">
                        Memuat Referensi Penilaian...
                    </p>
                    <p className="text-xs text-indigo-500 font-medium mt-0.5">
                        Mengambil akumulasi nilai dari rekan dan bawahan
                    </p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex items-start gap-4 p-6 bg-red-50 border-2 border-red-100 rounded-[2rem]">
                <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-red-700">{error}</p>
            </div>
        );
    }

    // No data (not authorized or no assessments yet — show placeholder)
    if (!data) {
        return (
            <div className="flex items-start gap-4 p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem]">
                <Info size={20} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-black text-slate-600 uppercase tracking-widest">
                        Panel Referensi Tidak Tersedia
                    </p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Belum ada penilaian Peer/Bawahan yang masuk untuk pegawai ini pada periode ini.
                    </p>
                </div>
            </div>
        );
    }

    const barColor = (val: number) =>
        val >= 80 ? 'bg-emerald-500' : val >= 65 ? 'bg-amber-400' : 'bg-primary-500';

    return (
        <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-2 border-indigo-100 rounded-[2rem] overflow-hidden shadow-lg">
            {/* Header */}
            <div
                className="flex items-center justify-between px-8 py-5 cursor-pointer hover:bg-indigo-50/50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                        <BarChart3 size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                            Panel Referensi Inspektur
                        </p>
                        <h4 className="font-black text-slate-900 text-base">
                            Akumulasi Nilai Peer &amp; Bawahan
                        </h4>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {data.is_ready ? (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-widest">
                            <CheckCircle2 size={12} /> Data Lengkap
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-widest">
                            <AlertTriangle size={12} /> Sebagian
                        </span>
                    )}
                    {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
            </div>

            {expanded && (
                <div className="px-8 pb-8 space-y-6 border-t border-indigo-100">

                    {/* Warning if not ready */}
                    {!data.is_ready && data.warning && (
                        <div className="flex items-start gap-3 mt-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs font-semibold text-amber-700">{data.warning}</p>
                        </div>
                    )}

                    {/* Summary Stats */}
                    <div className="mt-5 grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-sm text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-2">
                                <Users size={14} className="text-blue-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">
                                    Peer ({data.summary.peer_count} penilai)
                                </span>
                            </div>
                            <p className="text-3xl font-black text-blue-600">
                                {data.summary.peer_avg > 0 ? data.summary.peer_avg.toFixed(1) : '-'}
                            </p>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">rata-rata</span>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-sm text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-2">
                                <Users size={14} className="text-purple-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-purple-500">
                                    Bawahan ({data.summary.bawahan_count} penilai)
                                </span>
                            </div>
                            <p className="text-3xl font-black text-purple-600">
                                {data.summary.bawahan_avg > 0 ? data.summary.bawahan_avg.toFixed(1) : '-'}
                            </p>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">rata-rata</span>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-4 border-0 shadow-lg text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-2">
                                <BarChart3 size={14} className="text-indigo-200" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-200">
                                    Gabungan
                                </span>
                            </div>
                            <p className="text-3xl font-black text-white">
                                {data.summary.overall_avg > 0 ? data.summary.overall_avg.toFixed(1) : '-'}
                            </p>
                            <span className="text-[9px] text-indigo-200 font-bold uppercase">rata-rata total</span>
                        </div>
                    </div>

                    {/* Indicators Breakdown */}
                    <div className="bg-white rounded-[1.5rem] border border-indigo-100 overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                Rincian Per Indikator BerAKHLAK
                            </p>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {INDICATOR_ORDER.map((ind) => {
                                const indData = data.indicators[ind];
                                if (!indData) return null;
                                return (
                                    <div key={ind} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-black text-slate-800">{ind}</span>
                                            <div className="flex gap-2">
                                                <ScoreBadge value={indData.peer_avg} label="Peer" />
                                                <ScoreBadge value={indData.bawahan_avg} label="Bwhn" />
                                                <ScoreBadge value={indData.overall_avg} label="Total" />
                                            </div>
                                        </div>
                                        <ProgressBar
                                            value={indData.overall_avg}
                                            color={barColor(indData.overall_avg)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                        <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-semibold text-indigo-600 leading-relaxed">
                            Data referensi ini berasal dari penilaian anonim oleh Peer dan Bawahan.
                            Penilaian Anda sebagai Atasan bersifat <strong>independen dan rahasia</strong>.
                            Gunakan data ini sebagai panduan, bukan patokan mutlak.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssessmentReferencePanel;
