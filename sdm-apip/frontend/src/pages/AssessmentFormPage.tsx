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
    ShieldCheck
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
    const [comment, setComment] = useState('');

    const [searchParams] = useSearchParams();
    const targetUserId = searchParams.get('target_id');
    const periodId = searchParams.get('period_id');
    const relationType = searchParams.get('relation');

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
                                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold border border-white/10">
                                    <ShieldCheck size={14} className="text-primary-400" />
                                    Peran Anda: <span className="text-primary-400 uppercase">{relationType}</span>
                                </div>
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
                            Berikan penilaian perilaku kerja harian yang paling sesuai pada skala 1 - 100.
                            Nilai 80-100 menandakan perilaku yang sudah menjadi budaya konsisten.
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
