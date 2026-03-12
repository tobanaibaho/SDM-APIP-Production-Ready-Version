import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import AssessmentReferencePanel from '../components/AssessmentReferencePanel';
import api from '../services/api';
import {
    Info,
    ArrowRightCircle,
    ArrowLeft,
    Target,
    MessageSquare,
    Lightbulb,
    Star
} from 'lucide-react';
import toast from 'react-hot-toast';

const AssessmentFormPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [targetName, setTargetName] = useState('');
    const [periodInfo, setPeriodInfo] = useState<any>(null);
    const [assessmentMonth, setAssessmentMonth] = useState(1);
    const [scores, setScores] = useState<Record<string, number>>({
        berorientasi_pelayanan: 50,
        akuntabel: 50,
        kompeten: 50,
        harmonis: 50,
        loyal: 50,
        adaptif: 50,
        kolaboratif: 50
    });
    const [ideInovasi, setIdeInovasi] = useState(0);
    const [comment, setComment] = useState('');

    const [searchParams] = useSearchParams();
    const targetUserId = searchParams.get('target_id');
    const periodId = searchParams.get('period_id');
    const relationType = searchParams.get('relation');

    // Hitung total skor + predikat (khusus Atasan)
    const isAtasan = relationType === 'Atasan';
    const baseScore = Object.values(scores).reduce((a, b) => a + b, 0) / 7;
    const totalScore = isAtasan ? baseScore + ideInovasi : baseScore;

    const getPredikat = (score: number) => {
        if (score >= 110) return { label: 'Sangat Baik', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
        if (score >= 90)  return { label: 'Baik', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
        if (score >= 70)  return { label: 'Cukup', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
        if (score >= 50)  return { label: 'Kurang', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' };
        return { label: 'Sangat Kurang', color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
    };

    useEffect(() => {
        if (targetUserId) {
            fetchTargetInfo();
        }
        if (periodId) {
            fetchPeriodInfo();
        }
    }, [targetUserId, periodId]);

    const fetchPeriodInfo = async () => {
        try {
            const res = await api.get('/user/periods');
            const period = res.data.data.find((p: any) => p.id === parseInt(periodId!));
            if (period) {
                setPeriodInfo(period);
                // Calculate current month based on period start date
                const startDate = new Date(period.start_date);
                const now = new Date();
                const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 1;
                setAssessmentMonth(Math.max(1, Math.min(monthsDiff, getMaxMonths(period.frequency))));
            }
        } catch (error) {
            console.error("Failed to fetch period info", error);
        }
    };

    const getMaxMonths = (frequency: string) => {
        switch (frequency) {
            case 'monthly': return 1;
            case 'quarterly': return 3;
            case 'semi_annual': return 6;
            case 'annual': return 12;
            default: return 1;
        }
    };

    const fetchTargetInfo = async () => {
        try {
            // We use a generic endpoint or the matrix itself to find the user name
            await api.get(`/user/profile?id=${targetUserId}`);
            // Note: Since we don't have a direct "get other user profile" easily without admin, 
            // the name is passed in the list page or we could fetch it if available.
            // For now, let's assume we might need a small helper or just rely on the list.
            // Actually, the assessment matrix for user only shows themselves.
            // The targets list has the name. Let's try to get it from the targets list.
            const targetsRes = await api.get(`/user/assessments/targets?period_id=${periodId}`);
            const target = targetsRes.data.data.find((t: any) => t.relation.target_user_id === parseInt(targetUserId!));
            if (target) {
                setTargetName(target.relation.target_user.name);
            }
        } catch (error) {
            console.error("Failed to fetch target name", error);
        }
    };

    const indicators = [
        { key: 'berorientasi_pelayanan', label: 'Berorientasi Pelayanan', desc: 'Memahami dan memenuhi kebutuhan masyarakat / pelanggan.' },
        { key: 'akuntabel', label: 'Akuntabel', desc: 'Bertanggung jawab atas kepercayaan dan tugas yang diberikan.' },
        { key: 'kompeten', label: 'Kompeten', desc: 'Terus belajar dan mengembangkan kapabilitas diri.' },
        { key: 'harmonis', label: 'Harmonis', desc: 'Saling peduli dan menghargai perbedaan rekan kerja.' },
        { key: 'loyal', label: 'Loyal', desc: 'Berdedikasi dan mengutamakan kepentingan institusi.' },
        { key: 'adaptif', label: 'Adaptif', desc: 'Terus berinovasi dan antusias dalam menghadapi perubahan.' },
        { key: 'kolaboratif', label: 'Kolaboratif', desc: 'Membangun kerja sama yang sinergis.' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const allSet = Object.values(scores).every(v => v > 0);
        if (!allSet) {
            toast.error("Mohon berikan nilai untuk semua indikator.");
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading("Mengirim penilaian...");
        try {
            await api.post('/user/assessments', {
                target_user_id: parseInt(targetUserId!),
                period_id: parseInt(periodId!),
                assessment_month: assessmentMonth,
                ...scores,
                ide_inovasi: isAtasan ? ideInovasi : 0,
                comment,
            });
            toast.success("Penilaian berhasil disimpan!", { id: loadingToast });
            navigate('/user/assessments');
        } catch (error: any) {
            toast.error("Gagal: " + (error.response?.data?.error || "Terjadi kesalahan"), { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    const handleIdeInovasiChange = (val: string) => {
        let num = parseInt(val);
        if (isNaN(num)) num = 0;
        if (num > 20) num = 20;
        if (num < 0) num = 0;
        setIdeInovasi(num);
    };

    const handleScoreChange = (key: string, val: string) => {
        let num = parseInt(val);
        if (isNaN(num)) num = 0;
        if (num > 100) num = 100;
        setScores(prev => ({ ...prev, [key]: num }));
    };

    return (
        <Layout title="Formulir Penilaian 360°" subtitle="Objektivitas demi kemajuan bersama.">
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                {/* Header Card */}
                <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Target size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-slate-900 font-black text-3xl shadow-xl">
                                {targetName ? targetName.charAt(0) : '?'}
                            </div>
                            <div>
                                <p className="text-primary-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Menilai Pegawai</p>
                                <h3 className="text-3xl font-black tracking-tight">{targetName || 'Memuat Nama...'}</h3>
                                {/* Live score preview for Atasan */}
                                {isAtasan && (
                                    <div className="flex items-center gap-3 mt-3">
                                        <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-xl px-3 py-1.5">
                                            <Star size={13} className="text-amber-400" />
                                            <span className="text-sm font-black text-white">{totalScore.toFixed(1)}<span className="text-xs text-white/50 font-bold">/120</span></span>
                                        </div>
                                        <span className={`px-3 py-1 rounded-xl text-xs font-black border ${getPredikat(totalScore).bg} ${getPredikat(totalScore).color}`}>
                                            {getPredikat(totalScore).label}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/user/assessments')}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold"
                        >
                            <ArrowLeft size={18} /> Kembali ke Daftar
                        </button>
                    </div>
                </div>

                {/* Month Selector */}
                {periodInfo && getMaxMonths(periodInfo.frequency) > 1 && (
                    <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Bulan Penilaian</h4>
                                <p className="text-xs text-slate-500 font-medium">
                                    Periode {periodInfo.frequency === 'quarterly' ? 'Triwulan' :
                                        periodInfo.frequency === 'semi_annual' ? 'Semester' : 'Tahunan'}
                                    {' '}({getMaxMonths(periodInfo.frequency)} bulan)
                                </p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {Array.from({ length: getMaxMonths(periodInfo.frequency) }, (_, i) => i + 1).map(month => (
                                    <button
                                        key={month}
                                        type="button"
                                        onClick={() => setAssessmentMonth(month)}
                                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${assessmentMonth === month
                                            ? 'bg-slate-900 text-white shadow-lg'
                                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                            }`}
                                    >
                                        Bulan {month}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Inspektur Reference Panel — visible only for Atasan evaluators */}
                <AssessmentReferencePanel
                    targetUserId={targetUserId}
                    periodId={periodId}
                    relationType={relationType}
                />

                {/* Validation Note */}
                <div className="flex items-start gap-4 p-6 bg-blue-50 border-2 border-blue-100 rounded-3xl">
                    <Info size={24} className="text-blue-600 shrink-0" />
                    <div>
                        <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-1">Panduan Pengisian</h4>
                        <p className="text-sm text-blue-700 leading-relaxed font-semibold">
                            Berikan penilaian perilaku kerja yang paling sesuai pada skala 1 - 100.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 pb-20">
                    <div className="space-y-4">
                        {indicators.map((ind, i) => (
                            <div
                                key={ind.key}
                                className="group bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm transition-all hover:border-primary-500 hover:shadow-xl animate-slide-up"
                                style={{ animationDelay: `${i * 0.05}s` }}
                            >
                                <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="h-6 w-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">{i + 1}</span>
                                            <label className="text-xl font-black text-slate-900 leading-tight">
                                                {ind.label}
                                            </label>
                                        </div>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed pr-4">{ind.desc}</p>
                                    </div>

                                    <div className="w-full lg:w-72 space-y-4">
                                        <div className="flex items-end justify-between">
                                            <span className={`text-3xl font-black ${scores[ind.key] >= 80 ? 'text-emerald-500' :
                                                scores[ind.key] >= 60 ? 'text-primary-500' :
                                                    scores[ind.key] >= 40 ? 'text-amber-500' : 'text-slate-300'
                                                }`}>
                                                {scores[ind.key]}
                                                <small className="text-xs font-bold text-slate-300 ml-1 uppercase">Poin</small>
                                            </span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                className="w-16 h-10 text-center bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-sm focus:border-primary-500 transition-all"
                                                value={scores[ind.key]}
                                                onChange={(e) => handleScoreChange(ind.key, e.target.value)}
                                            />
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={scores[ind.key]}
                                            onChange={(e) => handleScoreChange(ind.key, e.target.value)}
                                            className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-primary-600"
                                        />
                                        <div className="flex justify-between px-1">
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Dasar</span>
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Auditif</span>
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Budaya</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ══ ADD-ON: Ide Baru / Inovasi — hanya untuk Inspektur (Atasan) ══ */}
                    {isAtasan && (
                        <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-8 rounded-[2rem] shadow-sm animate-slide-up">
                            {/* Corner badge */}
                            <div className="absolute top-4 right-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow">
                                    <Star size={10} /> Bonus Inspektur
                                </span>
                            </div>
                            <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                                            <Lightbulb size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-amber-900 leading-tight">Ide Baru / Inovasi</h4>
                                            <p className="text-xs text-amber-700 font-bold uppercase tracking-wide mt-0.5">Add-on Eksklusif Inspektur</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-amber-800 font-medium leading-relaxed">
                                        Nilai tambahan atas inisiatif, kreativitas, dan kontribusi inovasi pegawai.
                                        Poin ini dapat mendorong predikat ke level <strong>Sangat Baik</strong> (110–120).
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase">
                                        {[['Sangat Baik','110–120','emerald'], ['Baik','90–<110','blue'], ['Cukup','70–<90','amber'], ['Kurang','50–<70','orange'], ['Sangat Kurang','<50','red']].map(([label, range, color]) => (
                                            <span key={label} className={`px-2 py-1 rounded-lg border bg-${color}-50 border-${color}-200 text-${color}-700`}>
                                                {label}: {range}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="w-full lg:w-64 space-y-4">
                                    <div className="flex items-end justify-between">
                                        <span className={`text-4xl font-black ${ideInovasi >= 15 ? 'text-emerald-500' : ideInovasi >= 10 ? 'text-amber-500' : ideInovasi > 0 ? 'text-orange-400' : 'text-slate-300'}`}>
                                            +{ideInovasi}
                                            <small className="text-xs font-bold text-slate-400 ml-1 uppercase">/ 20</small>
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="20"
                                            className="w-16 h-10 text-center bg-white border-2 border-amber-200 rounded-xl font-black text-sm focus:border-amber-500 transition-all"
                                            value={ideInovasi}
                                            onChange={(e) => handleIdeInovasiChange(e.target.value)}
                                        />
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="20"
                                        value={ideInovasi}
                                        onChange={(e) => handleIdeInovasiChange(e.target.value)}
                                        className="w-full h-3 bg-amber-100 rounded-full appearance-none cursor-pointer accent-amber-500"
                                    />
                                    <div className="flex justify-between px-1">
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Tidak Ada</span>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Signifikan</span>
                                    </div>
                                    {/* Live total preview */}
                                    <div className={`mt-2 p-3 rounded-xl border text-center ${getPredikat(totalScore).bg}`}>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Estimasi Total</p>
                                        <p className={`text-2xl font-black ${getPredikat(totalScore).color}`}>{totalScore.toFixed(1)}</p>
                                        <p className={`text-xs font-black uppercase tracking-widest ${getPredikat(totalScore).color}`}>{getPredikat(totalScore).label}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm focus-within:border-primary-500 transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                                <MessageSquare size={20} />
                            </div>
                            <label className="text-lg font-black text-slate-900">Ulasan & Masukan Konstruktif</label>
                        </div>
                        <textarea
                            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 transition-all"
                            rows={4}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Berikan contoh perilaku positif atau area pengembangan... (Opsional)"
                        ></textarea>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-4 p-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-xs text-center sm:text-right">
                            Dengan menekan tombol simpan, Anda menyatakan penilaian ini diberikan secara jujur dan objektif.
                        </p>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-primary-600 hover:shadow-2xl hover:shadow-primary-600/30 transition-all active:scale-95 disabled:grayscale"
                        >
                            {loading ? 'Mengirim Data...' : 'Kirim Penilaian BerAKHLAK'}
                            <ArrowRightCircle size={20} />
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default AssessmentFormPage;
