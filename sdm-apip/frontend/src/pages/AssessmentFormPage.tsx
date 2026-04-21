import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import AssessmentReferencePanel from '../components/AssessmentReferencePanel';
import api from '../services/api';
import { getProfile } from '../services/authService';
import { questionService, Question } from '../services/questionService';
import {
    ArrowRightCircle,
    ArrowLeft,
    Target,
    MessageSquare,
    Star,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    Info,
    Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─────────────────────────── Types ─────────────────────────── */
interface LikertOption {
    label: string;
    points: number;
}

interface DynamicIndicator {
    key: string;
    label: string;
    emoji: string;
    color: string;
    bgColor: string;
    borderColor: string;
    questions: Question[];
}

/* ─────────────────────────── Constants ─────────────────────────── */
const LIKERT_OPTIONS: LikertOption[] = [
    { label: 'Sangat Tidak Setuju', points: 0 },
    { label: 'Tidak Setuju', points: 25 },
    { label: 'Netral', points: 50 },
    { label: 'Setuju', points: 75 },
    { label: 'Sangat Setuju', points: 100 },
];

const UI_CONFIG: Record<string, { emoji: string, color: string, bgColor: string, borderColor: string }> = {
    'Berorientasi Pelayanan': { emoji: '🎯', color: 'text-sky-700', bgColor: 'bg-sky-50', borderColor: 'border-sky-200' },
    'Akuntabel': { emoji: '📋', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
    'Kompeten': { emoji: '🧠', color: 'text-primary-700', bgColor: 'bg-primary-50', borderColor: 'border-primary-200' },
    'Harmonis': { emoji: '🤝', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
    'Loyal': { emoji: '🛡️', color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
    'Adaptif': { emoji: '⚡', color: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
    'Kolaboratif': { emoji: '🔗', color: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-teal-200' },
};

/* ─────────────────────────── Component ─────────────────────────── */
const AssessmentFormPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const targetUserId = searchParams.get('target_id');
    const periodId = searchParams.get('period_id');
    const relationType = searchParams.get('relation');

    const [loading, setLoading] = useState(false);
    const [targetName, setTargetName] = useState('');
    const [periodInfo, setPeriodInfo] = useState<any>(null);
    const [assessmentMonth, setAssessmentMonth] = useState(1);
    const [comment, setComment] = useState('');
    const [activeStep, setActiveStep] = useState(0); 
    
    // Dynamic Questions State
    const [indicators, setIndicators] = useState<DynamicIndicator[]>([]);
    
    // answers[indicatorIndex][questionIndex] = score
    const [answers, setAnswers] = useState<(number | null)[][]>([]);

    useEffect(() => {
        getProfile().catch(() => { });
        if (targetUserId) fetchTargetInfo();
        if (periodId) fetchPeriodInfo();
        fetchQuestions();
    }, [targetUserId, periodId]);

    const fetchQuestions = async () => {
        try {
            const res = await questionService.getQuestionsForUser();
            const qs: Question[] = res.data.data || [];
            
            // Build Indicators
            const grouped: Record<string, Question[]> = {};
            const ORDER = ['Berorientasi Pelayanan', 'Akuntabel', 'Kompeten', 'Harmonis', 'Loyal', 'Adaptif', 'Kolaboratif'];
            
            ORDER.forEach(name => { grouped[name] = []; });
            qs.forEach(q => {
                if (grouped[q.indicator]) {
                    grouped[q.indicator].push(q);
                }
            });

            const dynIndicators = ORDER.filter(name => grouped[name].length > 0).map(name => ({
                key: name.toLowerCase().replace(' ', '_'),
                label: name,
                emoji: UI_CONFIG[name]?.emoji || '📌',
                color: UI_CONFIG[name]?.color || 'text-slate-700',
                bgColor: UI_CONFIG[name]?.bgColor || 'bg-slate-50',
                borderColor: UI_CONFIG[name]?.borderColor || 'border-slate-200',
                questions: grouped[name],
            }));

            setIndicators(dynIndicators);
            const initAnswers = dynIndicators.map(ind => Array(ind.questions.length).fill(null));
            setAnswers(initAnswers);
        } catch (e) {
            toast.error('Gagal memuat kuesioner dari server');
        }
    };

    const fetchPeriodInfo = async () => {
        try {
            const res = await api.get('/user/periods');
            const period = res.data.data.find((p: any) => p.id === parseInt(periodId!));
            if (period) {
                setPeriodInfo(period);
                const startDate = new Date(period.start_date);
                const now = new Date();
                const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 1;
                setAssessmentMonth(Math.max(1, Math.min(monthsDiff, getMaxMonths(period.frequency))));
            }
        } catch (e) {
            console.error('Failed to fetch period info', e);
        }
    };

    const fetchTargetInfo = async () => {
        try {
            const targetsRes = await api.get(`/user/assessments/targets?period_id=${periodId}`);
            const target = targetsRes.data.data.find((t: any) => t.relation.target_user_id === parseInt(targetUserId!));
            if (target) setTargetName(target.relation.target_user.name);
        } catch (e) {
            console.error('Failed to fetch target name', e);
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

    /* ── Scoring helpers ── */
    const getIndicatorScore = (indIdx: number): number => {
        const indAnswers = answers[indIdx] || [];
        if (indAnswers.length === 0) return 0;
        const sum = indAnswers.reduce((acc, val) => (acc || 0) + (val || 0), 0);
        return Math.round((sum || 0) / indAnswers.length);
    };

    const getTotalAvgScore = (): number => {
        if (indicators.length === 0) return 0;
        const total = indicators.reduce((sum, _, i) => sum + getIndicatorScore(i), 0);
        return total / indicators.length;
    };

    const isIndicatorComplete = (indIdx: number) => {
        const indAnswers = answers[indIdx] || [];
        return indAnswers.length > 0 && indAnswers.every(v => v !== null);
    };

    const completedCount = indicators.filter((_, i) => isIndicatorComplete(i)).length;
    const allComplete = indicators.length > 0 && completedCount === indicators.length;
    const totalQuestions = indicators.reduce((sum, ind) => sum + ind.questions.length, 0);
    const answeredCount = answers.flat().filter(v => v !== null).length;

    const getPredikat = (score: number) => {
        if (score >= 90) return { label: 'Sangat Baik', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
        if (score >= 70) return { label: 'Baik', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
        if (score >= 50) return { label: 'Cukup', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
        if (score >= 30) return { label: 'Kurang', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' };
        return { label: 'Sangat Kurang', color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
    };

    const handleAnswer = (indIdx: number, qIdx: number, points: number) => {
        setAnswers(prev => {
            const next = [...prev];
            const updatedInd = [...next[indIdx]];
            updatedInd[qIdx] = points;
            next[indIdx] = updatedInd;
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!allComplete) {
            toast.error('Mohon jawab semua pertanyaan sebelum mengirim.');
            return;
        }

        const answersPayload = [];
        for (let i = 0; i < indicators.length; i++) {
            const ind = indicators[i];
            for (let j = 0; j < ind.questions.length; j++) {
                answersPayload.push({
                    question_id: ind.questions[j].id,
                    score: answers[i][j]
                });
            }
        }

        setLoading(true);
        const toastId = toast.loading('Mengirim penilaian...');
        try {
            await api.post('/user/assessments', {
                target_user_id: parseInt(targetUserId!),
                period_id: parseInt(periodId!),
                assessment_month: assessmentMonth,
                answers: answersPayload,
                comment,
            });
            toast.success('Penilaian berhasil disimpan! 🎉', { id: toastId });
            navigate('/user/assessments');
        } catch (error: any) {
            toast.error('Gagal: ' + (error.response?.data?.error || 'Terjadi kesalahan'), { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    if (indicators.length === 0) {
        return (
            <Layout title="Formulir Penilaian 360°" subtitle="Memuat Kuesioner...">
                <div className="flex items-center justify-center min-h-[50vh]">
                    <Loader2 size={40} className="animate-spin text-primary-500" />
                </div>
            </Layout>
        );
    }

    const currentIndicator = indicators[activeStep];

    return (
        <Layout title="Formulir Penilaian 360°" subtitle={`Kuesioner Dinamis BerAKHLAK — ${totalQuestions} Pernyataan.`}>
            <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-24">
                {/* ══════════════════ Header ══════════════════ */}
                <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-900/50 via-slate-900 to-slate-900 pointer-events-none" />
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Target size={140} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="h-18 w-18 h-16 w-16 rounded-3xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-black text-3xl shadow-xl shrink-0">
                                {targetName ? targetName.charAt(0) : '?'}
                            </div>
                            <div>
                                <p className="text-primary-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Menilai Pegawai</p>
                                <h3 className="text-2xl md:text-3xl font-black tracking-tight">{targetName || 'Memuat...'}</h3>
                                <div className="flex items-center gap-3 mt-3 flex-wrap">
                                    <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5">
                                        <Star size={14} className="text-amber-400" />
                                        <span className="text-sm font-black">{getTotalAvgScore().toFixed(1)}<span className="text-[10px] text-white/50 font-bold ml-1">/100</span></span>
                                    </div>
                                    <span className={`px-3 py-1 rounded-xl text-xs font-black border ${getPredikat(getTotalAvgScore()).bg} ${getPredikat(getTotalAvgScore()).color}`}>
                                        {getPredikat(getTotalAvgScore()).label}
                                    </span>
                                    <span className="text-white/40 text-xs font-bold">{completedCount}/{indicators.length} Indikator Selesai</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/user/assessments')}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold shrink-0"
                        >
                            <ArrowLeft size={18} /> Kembali
                        </button>
                    </div>
                </div>

                {/* ══════════════════ Period Selector ══════════════════ */}
                {periodInfo && getMaxMonths(periodInfo.frequency) > 1 && (
                    <div className="bg-white/70 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/60 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Bulan Penilaian</h4>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    Periode {periodInfo.frequency === 'quarterly' ? 'Triwulan' : periodInfo.frequency === 'semi_annual' ? 'Semester' : 'Tahunan'} ({getMaxMonths(periodInfo.frequency)} bulan)
                                </p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {Array.from({ length: getMaxMonths(periodInfo.frequency) }, (_, i) => i + 1).map(m => (
                                    <button
                                        key={m} type="button" onClick={() => setAssessmentMonth(m)}
                                        className={`px-4 py-2 rounded-xl font-black text-xs transition-all ${assessmentMonth === m ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        Bulan {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Reference Panel */}
                <AssessmentReferencePanel
                    targetUserId={targetUserId}
                    periodId={periodId}
                    relationType={relationType}
                />

                <form onSubmit={handleSubmit}>
                    {/* ══════════════════ Indicator Tabs (Stepper) ══════════════════ */}
                    <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mb-6">
                        {indicators.map((ind, i) => (
                            <button
                                key={ind.key}
                                type="button"
                                onClick={() => setActiveStep(i)}
                                className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 border-2 transition-all ${activeStep === i
                                    ? `${ind.bgColor} ${ind.borderColor} shadow-lg`
                                    : isIndicatorComplete(i)
                                        ? 'bg-emerald-50 border-emerald-200'
                                        : 'bg-white/60 border-slate-100 hover:bg-slate-50'
                                    }`}
                            >
                                <span className="text-xl leading-none">{ind.emoji}</span>
                                {isIndicatorComplete(i) && activeStep !== i
                                    ? <CheckCircle2 size={14} className="text-emerald-500" />
                                    : <span className="text-[8px] font-black text-slate-500 uppercase tracking-tight text-center leading-tight hidden sm:block">
                                        {ind.label.split(' ')[0]}
                                    </span>
                                }
                                <div className={`h-1 w-full rounded-full transition-all ${isIndicatorComplete(i) ? 'bg-emerald-400' : activeStep === i ? 'bg-primary-400' : 'bg-slate-100'}`} />
                            </button>
                        ))}
                    </div>

                    {/* ══════════════════ Questionnaire Card ══════════════════ */}
                    <div className={`bg-white/80 backdrop-blur-3xl rounded-[2.5rem] border-2 ${currentIndicator.borderColor} shadow-[0_20px_50px_rgb(0,0,0,0.06)] overflow-hidden`}>
                        {/* Card Header */}
                        <div className={`${currentIndicator.bgColor} px-8 py-6 border-b ${currentIndicator.borderColor}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-4xl leading-none">{currentIndicator.emoji}</span>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Indikator {activeStep + 1} dari {indicators.length}</p>
                                        <h2 className={`text-2xl font-black ${currentIndicator.color}`}>{currentIndicator.label}</h2>
                                    </div>
                                </div>
                                {isIndicatorComplete(activeStep) && (
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skor</p>
                                        <p className={`text-3xl font-black ${currentIndicator.color}`}>
                                            {getIndicatorScore(activeStep)}<span className="text-sm text-slate-300 ml-1">/100</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Questions */}
                        <div className="px-8 py-6 space-y-8">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <Info size={14} className="text-slate-400 shrink-0" />
                                <p className="text-[10px] font-bold text-slate-500">Pilih satu jawaban yang paling sesuai untuk setiap pernyataan di bawah ini.</p>
                            </div>

                            {currentIndicator.questions.map((q, qIdx) => {
                                const currentVal = answers[activeStep][qIdx];
                                return (
                                    <div key={q.id} className="space-y-4">
                                        <div className="flex gap-4">
                                            <span className={`shrink-0 h-8 w-8 rounded-xl ${currentIndicator.bgColor} ${currentIndicator.color} border ${currentIndicator.borderColor} flex items-center justify-center text-sm font-black`}>
                                                {qIdx + 1}
                                            </span>
                                            <p className="text-sm font-bold text-slate-800 leading-relaxed pt-1">{q.text}</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 ml-12">
                                            {LIKERT_OPTIONS.map((opt) => {
                                                const isSelected = currentVal === opt.points;
                                                return (
                                                    <label
                                                        key={opt.points}
                                                        className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 cursor-pointer transition-all select-none
                                                            ${isSelected
                                                                ? `${currentIndicator.bgColor} ${currentIndicator.borderColor} shadow-md`
                                                                : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                                                            }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={`${currentIndicator.key}_q${qIdx}`}
                                                            value={opt.points}
                                                            checked={isSelected}
                                                            onChange={() => handleAnswer(activeStep, qIdx, opt.points)}
                                                            className="sr-only"
                                                        />
                                                        {/* Custom radio dot */}
                                                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                                                            ? `${currentIndicator.borderColor} bg-gradient-to-br from-current to-current`
                                                            : 'border-slate-200 bg-white'
                                                            }`}>
                                                            {isSelected && <div className={`h-2.5 w-2.5 rounded-full ${currentIndicator.bgColor.replace('bg-', 'bg-').replace('-50', '-400')}`} style={{ backgroundColor: 'currentColor' }} />}
                                                        </div>
                                                        <span className={`text-[10px] font-black text-center leading-tight ${isSelected ? currentIndicator.color : 'text-slate-400'}`}>
                                                            {opt.label}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Navigation Footer */}
                        <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <button
                                type="button"
                                onClick={() => setActiveStep(s => Math.max(0, s - 1))}
                                disabled={activeStep === 0}
                                className="flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all disabled:opacity-30"
                            >
                                <ChevronLeft size={16} /> Sebelumnya
                            </button>

                            <div className="flex items-center gap-1.5 hidden sm:flex">
                                {indicators.map((_, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setActiveStep(i)}
                                        className={`h-2 rounded-full cursor-pointer transition-all ${i === activeStep ? 'w-6 bg-slate-900' : isIndicatorComplete(i) ? 'w-2 bg-emerald-400' : 'w-2 bg-slate-200'}`}
                                    />
                                ))}
                            </div>

                            {activeStep < indicators.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setActiveStep(s => Math.min(indicators.length - 1, s + 1))}
                                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all ${isIndicatorComplete(activeStep)
                                        ? `${currentIndicator.bgColor} ${currentIndicator.color} hover:opacity-80`
                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                        }`}
                                >
                                    Selanjutnya <ChevronRight size={16} />
                                </button>
                            ) : (
                                <span className="text-[10px] font-bold text-slate-400">Langkah Terakhir</span>
                            )}
                        </div>
                    </div>

                    {/* ══════════════════ Summary Scorecard ══════════════════ */}
                    <div className="mt-6 bg-white/70 backdrop-blur-3xl rounded-[2rem] border border-white/60 shadow-sm p-6">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Rekap Skor Sementara</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                            {indicators.map((ind, i) => {
                                const score = getIndicatorScore(i);
                                const done = isIndicatorComplete(i);
                                return (
                                    <button
                                        key={ind.key}
                                        type="button"
                                        onClick={() => setActiveStep(i)}
                                        className={`rounded-2xl p-3 text-center border-2 transition-all ${done ? `${ind.bgColor} ${ind.borderColor}` : activeStep === i ? 'bg-white border-primary-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-200'}`}
                                    >
                                        <span className="text-xl block mb-1">{ind.emoji}</span>
                                        {done ? (
                                            <p className={`text-lg font-black ${ind.color}`}>{score}</p>
                                        ) : (
                                            <p className="text-lg font-black text-slate-200">—</p>
                                        )}
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight leading-tight mt-0.5">{ind.label}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ══════════════════ Comment & Submit ══════════════════ */}
                    <div className="mt-6 bg-white/70 backdrop-blur-3xl rounded-[2rem] border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-9 w-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                                <MessageSquare size={18} />
                            </div>
                            <label className="text-sm font-black text-slate-900">Ulasan & Masukan Konstruktif <span className="text-slate-400 font-normal text-xs">(Opsional)</span></label>
                        </div>
                        <textarea
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-none"
                            rows={4}
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Berikan contoh perilaku positif atau area pengembangan..."
                        />
                    </div>

                    {/* Submit */}
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-4 p-2">
                        {!allComplete && (
                            <p className="text-xs font-bold text-amber-600 flex items-center gap-2">
                                <Info size={14} />
                                Jawab semua {totalQuestions} pertanyaan lalu kirim ({answeredCount}/{totalQuestions} terjawab)
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={loading || !allComplete}
                            className="flex items-center justify-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.15em] hover:bg-primary-600 hover:shadow-2xl hover:shadow-primary-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRightCircle size={20} />}
                            {loading ? 'Mengirim...' : 'Kirim Penilaian BerAKHLAK'}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default AssessmentFormPage;
