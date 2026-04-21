import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import groupService from '../services/groupService';
import assessmentService, { AssessmentPeriod } from '../services/assessmentService';
import userService from '../services/userService';
import {
    Link2,
    Plus,
    Trash2,
    Users,
    ArrowRight,
    ArrowLeftRight,
    Filter,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Info,
    Search,
    X
} from 'lucide-react';
import toast from 'react-hot-toast';

// ------ Types ------
interface UserOption {
    id: number;
    nip: string;
    name?: string;
    email: string;
    jabatan?: string;
    group_name?: string;
    role?: string;
}

interface CrossRelation {
    id: number;
    evaluator_id: number;
    target_user_id: number;
    relation_type: string;
    target_position: string;
    period_id: number;
    evaluator?: { id: number; nip: string; name?: string; email: string };
    target_user?: { id: number; nip: string; name?: string; email: string };
}

const RELATION_TYPES = [
    { value: 'Peer', label: 'Peer (Sesama Level)', desc: 'Untuk sesama Dalnis, sesama KT, atau sesama AT lintas grup' },
    { value: 'Atasan', label: 'Atasan', desc: 'Penilai berperan sebagai Atasan dari target' },
    { value: 'Bawahan', label: 'Bawahan', desc: 'Penilai berperan sebagai Bawahan dari target' },
];

const RECIPROCAL_MAP: Record<string, string> = {
    'Peer': 'Peer',
    'Atasan': 'Bawahan',
    'Bawahan': 'Atasan',
};

const CrossGroupRelationPage: React.FC = () => {
    const [periods, setPeriods] = useState<AssessmentPeriod[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<number | ''>('');
    const [allUsers, setAllUsers] = useState<UserOption[]>([]);
    const [crossRelations, setCrossRelations] = useState<CrossRelation[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Search states
    const [evaluatorSearch, setEvaluatorSearch] = useState('');
    const [targetSearch, setTargetSearch] = useState('');
    const [showEvaluatorDropdown, setShowEvaluatorDropdown] = useState(false);
    const [showTargetDropdown, setShowTargetDropdown] = useState(false);

    const [form, setForm] = useState<{
        evaluator_id: number | '';
        target_user_ids: number[];
        relation_type: string;
        createReciprocal: boolean;
    }>({
        evaluator_id: '',
        target_user_ids: [],
        relation_type: 'Peer',
        createReciprocal: true,
    });

    const [selectedEvaluator, setSelectedEvaluator] = useState<UserOption | null>(null);
    const [selectedTargets, setSelectedTargets] = useState<UserOption[]>([]);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedPeriodId) {
            loadCrossRelations();
        } else {
            setCrossRelations([]);
        }
    }, [selectedPeriodId]);

    const loadInitialData = async () => {
        try {
            const [periodsData, usersResponse] = await Promise.all([
                assessmentService.getAllPeriods(),
                userService.getAllUsers(1, 500, '', '', 'name', 'asc'),
            ]);
            setPeriods(periodsData || []);
            const active = periodsData?.find(p => p.is_active);
            if (active) setSelectedPeriodId(active.id);

            // Map user data from paginated response
            const usersData = usersResponse?.data || [];
            // Filter out admin/super admin (role 'admin'/'super admin' or ID 1)
            const mapped: UserOption[] = usersData
                .filter((u: any) => {
                    const r = u.role?.toLowerCase() || '';
                    return r !== 'admin' && r !== 'super admin' && u.id !== 1;
                })
                .map((u: any) => ({
                    id: u.id,
                    nip: u.nip,
                    name: u.name || u.nip,
                    email: u.email,
                    jabatan: u.jabatan || '',
                    group_name: u.group_name || '-',
                    role: u.role,
                }));
            setAllUsers(mapped);
        } catch {
            toast.error('Gagal memuat data awal');
        }
    };

    const loadCrossRelations = useCallback(async () => {
        if (!selectedPeriodId) return;
        setLoading(true);
        try {
            const data = await groupService.getCrossGroupRelations(Number(selectedPeriodId));
            setCrossRelations(data || []);
        } catch {
            toast.error('Gagal memuat relasi lintas grup');
        } finally {
            setLoading(false);
        }
    }, [selectedPeriodId]);

    const filteredEvaluators = allUsers.filter(u =>
        !form.target_user_ids.includes(u.id) &&
        (u.name?.toLowerCase().includes(evaluatorSearch.toLowerCase()) ||
            u.nip?.includes(evaluatorSearch) ||
            u.email?.toLowerCase().includes(evaluatorSearch.toLowerCase()))
    ).slice(0, 8);

    const filteredTargets = allUsers.filter(u =>
        u.id !== (form.evaluator_id || 0) &&
        !form.target_user_ids.includes(u.id) &&
        (u.name?.toLowerCase().includes(targetSearch.toLowerCase()) ||
            u.nip?.includes(targetSearch) ||
            u.email?.toLowerCase().includes(targetSearch.toLowerCase()))
    ).slice(0, 8);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPeriodId || !form.evaluator_id || form.target_user_ids.length === 0) {
            toast.error('Lengkapi semua field terlebih dahulu');
            return;
        }

        setSaving(true);
        try {
            const reciprocalType = RECIPROCAL_MAP[form.relation_type] || 'Peer';

            const promises = form.target_user_ids.map(async (targetId) => {
                // Create main relation: A → B
                await groupService.createCrossGroupRelation({
                    period_id: Number(selectedPeriodId),
                    evaluator_id: Number(form.evaluator_id),
                    target_user_id: targetId,
                    relation_type: form.relation_type,
                    target_position: reciprocalType,
                });

                // Create reciprocal relation: B → A (if enabled)
                if (form.createReciprocal) {
                    await groupService.createCrossGroupRelation({
                        period_id: Number(selectedPeriodId),
                        evaluator_id: targetId,
                        target_user_id: Number(form.evaluator_id),
                        relation_type: reciprocalType,
                        target_position: form.relation_type,
                    });
                }
            });

            await Promise.all(promises);

            toast.success(`Relasi berhasil ${form.createReciprocal ? 'dua arah ' : ''}dibuat`);
            setForm({ evaluator_id: '', target_user_ids: [], relation_type: form.relation_type, createReciprocal: form.createReciprocal });
            setSelectedEvaluator(null);
            setSelectedTargets([]);
            setEvaluatorSearch('');
            setTargetSearch('');
            loadCrossRelations();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Sedikitnya satu relasi gagal dibuat. Cek daftar relasi aktif.');
            loadCrossRelations();
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Hapus relasi ini? Jika relasi ini berpasangan, Anda perlu menghapus relasi kebalikannya juga secara terpisah.')) return;
        try {
            await groupService.deleteCrossGroupRelation(id);
            toast.success('Relasi berhasil dihapus');
            loadCrossRelations();
        } catch {
            toast.error('Gagal menghapus relasi');
        }
    };

    const removeTarget = (idToRemove: number) => {
        setSelectedTargets(prev => prev.filter(t => t.id !== idToRemove));
        setForm(f => ({ ...f, target_user_ids: f.target_user_ids.filter(id => id !== idToRemove) }));
    };

    const getRelationBadge = (type: string) => {
        const styles: Record<string, string> = {
            'Peer': 'bg-blue-50 text-blue-700 border-blue-200',
            'Atasan': 'bg-amber-50 text-amber-700 border-amber-200',
            'Bawahan': 'bg-purple-50 text-purple-700 border-purple-200',
        };
        return styles[type] || 'bg-slate-50 text-slate-700 border-slate-200';
    };

    const selectedRelationType = RELATION_TYPES.find(r => r.value === form.relation_type);
    const reciprocalLabel = form.relation_type ? RECIPROCAL_MAP[form.relation_type] : '-';

    return (
        <Layout
            title="Relasi Penilaian Lintas Grup"
            subtitle="Atur relasi penilaian antar pegawai dari grup yang berbeda untuk sistem evaluasi 360° yang komprehensif."
        >
            <div className="space-y-8 animate-fade-in">
                {/* ══════════════════════════════════════════
                    Info Card & Period Selector
                ══════════════════════════════════════════ */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Info Card */}
                    <div className="md:col-span-7 flex items-start gap-4 bg-primary-50 border border-primary-100 rounded-[2rem] p-6">
                        <div className="h-10 w-10 bg-primary-100 rounded-2xl flex items-center justify-center shrink-0">
                            <Info size={20} className="text-primary-600" />
                        </div>
                        <div>
                            <p className="font-black text-primary-900 mb-2">Panduan Relasi Lintas Grup</p>
                            <ul className="space-y-1.5 list-disc list-inside text-xs leading-relaxed text-primary-700/80 font-medium">
                                <li>Gunakan halaman ini untuk menghubungkan pegawai dari <strong className="font-black">Grup yang berbeda</strong>.</li>
                                <li>Rekomendasi: Sesama Dalnis, KT, atau AT dikategorikan sebagai <strong className="font-black">Peer</strong>.</li>
                                <li>Aktifkan <strong className="font-black">"Buat Relasi Timbal-Balik"</strong> agar sistem otomatis membuat relasi kebalikannya.</li>
                                <li>Relasi intra-grup dikelola di halaman <strong className="font-black">Manajemen Grup</strong>.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Period Selector */}
                    <div className="md:col-span-5 bg-white/70 backdrop-blur-3xl rounded-[2rem] p-6 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-center gap-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Filter size={16} className="text-primary-500" />
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Periode Aktif</label>
                        </div>
                        <div className="relative group">
                            <select
                                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none transition-all cursor-pointer hover:bg-white pr-10"
                                value={selectedPeriodId}
                                onChange={e => setSelectedPeriodId(Number(e.target.value) || '')}
                            >
                                <option value="">-- Pilih Periode Penilaian --</option>
                                {periods.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} {p.is_active ? '✓' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    {/* ══════════════════════════════════════════
                        Form Add Relation
                    ══════════════════════════════════════════ */}
                    <div className="xl:col-span-2 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/60 shadow-[0_10px_40px_rgb(0,0,0,0.04)] h-fit">
                        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                            <div className="h-14 w-14 rounded-[1.25rem] bg-primary-50 text-primary-600 flex items-center justify-center">
                                <Link2 size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 text-lg">Tambah Relasi Baru</h3>
                                <p className="text-xs font-bold text-slate-400">Hubungkan pegawai lintas grup</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Evaluator Picker */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Penilai (Evaluator)</label>
                                <div className="relative">
                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                                        placeholder="Cari nama / NIP..."
                                        value={selectedEvaluator ? `${selectedEvaluator.name} (${selectedEvaluator.nip})` : evaluatorSearch}
                                        onChange={e => {
                                            setEvaluatorSearch(e.target.value);
                                            setSelectedEvaluator(null);
                                            setForm(f => ({ ...f, evaluator_id: '' }));
                                            setShowEvaluatorDropdown(true);
                                        }}
                                        onFocus={() => setShowEvaluatorDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowEvaluatorDropdown(false), 150)}
                                    />
                                    {showEvaluatorDropdown && evaluatorSearch && !selectedEvaluator && (
                                        <div className="absolute z-30 mt-2 w-full bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden py-2">
                                            {filteredEvaluators.length === 0 ? (
                                                <div className="p-4 text-xs font-bold text-slate-400 text-center">Tidak ditemukan</div>
                                            ) : filteredEvaluators.map(u => (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    className="w-full text-left px-5 py-3 hover:bg-primary-50/50 transition-colors"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setSelectedEvaluator(u);
                                                        setForm(f => ({ ...f, evaluator_id: u.id }));
                                                        setShowEvaluatorDropdown(false);
                                                    }}
                                                >
                                                    <p className="text-xs font-black text-slate-900">{u.name}</p>
                                                    <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{u.nip} · {u.jabatan || u.email}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {selectedEvaluator && (
                                    <p className="text-[10px] text-emerald-600 font-black pl-2">✓ Terpilih: {selectedEvaluator.email}</p>
                                )}
                            </div>

                            {/* Relation Type */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Relasi Penilai</label>
                                <select
                                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-800 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all cursor-pointer"
                                    value={form.relation_type}
                                    onChange={e => setForm(f => ({ ...f, relation_type: e.target.value }))}
                                >
                                    {RELATION_TYPES.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                                {selectedRelationType && (
                                    <p className="text-[10px] text-slate-500 font-bold italic pl-2">{selectedRelationType.desc}</p>
                                )}
                            </div>

                            {/* Arrow indicator */}
                            <div className="flex items-center justify-center gap-4 py-2 opacity-60">
                                <div className="h-px flex-1 bg-slate-200"></div>
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
                                    <span className="text-primary-600">{form.relation_type || '?'}</span>
                                    <ArrowRight size={14} className="text-slate-300 mx-1" />
                                    <span className="text-slate-500">{reciprocalLabel}</span>
                                </div>
                                <div className="h-px flex-1 bg-slate-200"></div>
                            </div>

                            {/* Target Picker */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                    <span>Target yang Dinilai</span>
                                    {selectedTargets.length > 0 && (
                                        <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-lg text-[9px]">{selectedTargets.length} Orang</span>
                                    )}
                                </label>

                                {selectedTargets.length > 0 && (
                                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl max-h-48 overflow-y-auto">
                                        {selectedTargets.map(t => (
                                            <div key={t.id} className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm px-3 py-2 rounded-xl text-[10px] font-black group">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-800">{t.name}</span>
                                                    <span className="text-slate-400 font-mono mt-0.5">{t.nip}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeTarget(t.id)}
                                                    className="ml-2 h-6 w-6 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="relative">
                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                                        placeholder="Ketik untuk menambah target..."
                                        value={targetSearch}
                                        onChange={e => {
                                            setTargetSearch(e.target.value);
                                            setShowTargetDropdown(true);
                                        }}
                                        onFocus={() => setShowTargetDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowTargetDropdown(false), 150)}
                                    />
                                    {showTargetDropdown && targetSearch && (
                                        <div className="absolute z-30 mt-2 w-full bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden py-2 max-h-60 overflow-y-auto">
                                            {filteredTargets.length === 0 ? (
                                                <div className="p-4 text-xs font-bold text-slate-400 text-center">Tidak ditemukan atau sudah ditambahkan</div>
                                            ) : filteredTargets.map(u => (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    className="w-full text-left px-5 py-3 hover:bg-primary-50/50 transition-colors"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        if (!form.target_user_ids.includes(u.id)) {
                                                            setSelectedTargets(prev => [...prev, u]);
                                                            setForm(f => ({ ...f, target_user_ids: [...f.target_user_ids, u.id] }));
                                                        }
                                                        setTargetSearch(''); // Reset search
                                                        setShowTargetDropdown(false);
                                                    }}
                                                >
                                                    <p className="text-xs font-black text-slate-900">{u.name}</p>
                                                    <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{u.nip} · {u.jabatan || u.email}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Reciprocal toggle */}
                            <div className="flex items-start gap-4 bg-slate-50 rounded-2xl p-5 border border-slate-200">
                                <input
                                    type="checkbox"
                                    id="reciprocal"
                                    className="w-5 h-5 rounded-md border-slate-300 text-primary-600 focus:ring-primary-600/20 mt-0.5 cursor-pointer"
                                    checked={form.createReciprocal}
                                    onChange={e => setForm(f => ({ ...f, createReciprocal: e.target.checked }))}
                                />
                                <label htmlFor="reciprocal" className="cursor-pointer flex-1">
                                    <p className="text-xs font-black text-slate-900">Buat Relasi Timbal-Balik Otomatis</p>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1 leading-relaxed">
                                        Akan membuat 2 relasi: A sebagai <span className="text-primary-600 px-1">{form.relation_type}</span> B, dan B sebagai <span className="text-primary-600 px-1">{reciprocalLabel}</span> A.
                                    </p>
                                </label>
                            </div>

                            {!selectedPeriodId && (
                                <div className="flex items-center gap-3 text-amber-700 bg-amber-50 p-4 rounded-2xl text-xs font-black border border-amber-200/50">
                                    <AlertCircle size={16} className="shrink-0" />
                                    Pilih periode terlebih dahulu di atas
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={saving || !selectedPeriodId || !form.evaluator_id || form.target_user_ids.length === 0}
                                className="w-full bg-slate-900 text-white rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest hover:bg-primary-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:bg-slate-900"
                            >
                                {saving ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
                                {saving ? 'Memproses...' : 'Tambah Relasi Baru'}
                            </button>
                        </form>
                    </div>

                    {/* ══════════════════════════════════════════
                        Relations List
                    ══════════════════════════════════════════ */}
                    <div className="xl:col-span-3 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] border border-white/60 shadow-[0_20px_50px_rgb(0,0,0,0.05)] overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-slate-100/50 flex items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-[1rem] bg-primary-50 flex items-center justify-center">
                                    <ArrowLeftRight size={20} className="text-primary-600" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-sm">Daftar Relasi Lintas Grup</h3>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{crossRelations.length} relasi terdaftar</p>
                                </div>
                            </div>
                            <button onClick={loadCrossRelations} className="p-3 text-slate-400 hover:text-primary-600 hover:bg-white rounded-[1rem] shadow-sm border border-transparent hover:border-slate-100 transition-all" title="Segarkan Data">
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col">
                            {!selectedPeriodId ? (
                                <div className="py-24 text-center flex-1">
                                    <Filter size={60} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-sm font-black text-slate-900 tracking-tight">Pilih periode untuk melihat data</p>
                                </div>
                            ) : loading ? (
                                <div className="divide-y divide-slate-100/50">
                                    {Array(5).fill(0).map((_, i) => (
                                        <div key={i} className="px-8 py-5 animate-pulse flex items-center gap-6">
                                            <div className="h-10 w-10 bg-slate-100 rounded-xl"></div>
                                            <div className="flex-1 space-y-3">
                                                <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                                                <div className="h-2 bg-slate-50 rounded w-1/4"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : crossRelations.length === 0 ? (
                                <div className="py-24 text-center flex-1">
                                    <Users size={60} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-sm font-black text-slate-900 tracking-tight">Belum ada relasi lintas grup.</p>
                                    <p className="text-xs text-slate-400 font-bold mt-2">Tambahkan melalui form di samping.</p>
                                </div>
                            ) : (
                                <div className="overflow-auto flex-1 max-h-[600px]">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 sticky top-0 backdrop-blur-md z-10 border-b border-slate-100">
                                            <tr>
                                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Penilai</th>
                                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Status Relasi</th>
                                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 w-full">Target</th>
                                                <th className="px-6 py-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100/50">
                                            {crossRelations.map(rel => (
                                                <tr key={rel.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 rounded-[0.8rem] bg-primary-50 text-primary-700 flex items-center justify-center text-sm font-black group-hover:scale-110 transition-transform">
                                                                {(rel.evaluator?.name || rel.evaluator?.email || 'U')[0].toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-900 truncate max-w-[140px]">
                                                                    {rel.evaluator?.name || rel.evaluator?.email || `User #${rel.evaluator_id}`}
                                                                </p>
                                                                <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{rel.evaluator?.nip}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-5 text-center">
                                                        <div className="flex flex-col items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getRelationBadge(rel.relation_type)}`}>
                                                                {rel.relation_type}
                                                            </span>
                                                            <ArrowRight size={14} className="text-slate-300" />
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getRelationBadge(rel.target_position)}`}>
                                                                {rel.target_position}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-4 flex-row-reverse justify-end text-right sm:flex-row sm:text-left sm:justify-start">
                                                            <div className="h-10 w-10 rounded-[0.8rem] bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-black group-hover:scale-110 transition-transform">
                                                                {(rel.target_user?.name || rel.target_user?.email || 'U')[0].toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-900 truncate max-w-[140px]">
                                                                    {rel.target_user?.name || rel.target_user?.email || `User #${rel.target_user_id}`}
                                                                </p>
                                                                <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{rel.target_user?.nip}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <button
                                                            onClick={() => handleDelete(rel.id)}
                                                            className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                                                            title="Hapus relasi"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════
                    Bobot System Info
                ══════════════════════════════════════════ */}
                <div className="bg-white/70 backdrop-blur-3xl rounded-[2.5rem] border border-white/60 shadow-[0_10px_30px_rgb(0,0,0,0.03)] p-8">
                    <div className="flex items-center gap-4 mb-6 pb-5 border-b border-slate-100">
                        <div className="h-12 w-12 rounded-[1rem] bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 text-base">Sistem Pembobotan Adaptif (7 Status)</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Bobot penilaian dihitung otomatis berdasarkan ketersediaan rater</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {[
                            { s: 1, a: true, p: true, b: true, wA: '60%', wP: '20%', wB: '20%' },
                            { s: 2, a: false, p: true, b: true, wA: '-', wP: '50%', wB: '50%' },
                            { s: 3, a: true, p: false, b: true, wA: '60%', wP: '-', wB: '40%' },
                            { s: 4, a: true, p: true, b: false, wA: '60%', wP: '40%', wB: '-' },
                            { s: 5, a: false, p: false, b: true, wA: '-', wP: '-', wB: '100%' },
                            { s: 6, a: false, p: true, b: false, wA: '-', wP: '100%', wB: '-' },
                            { s: 7, a: true, p: false, b: false, wA: '100%', wP: '-', wB: '-' },
                        ].map(stat => (
                            <div key={stat.s} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 text-center hover:bg-white transition-colors hover:shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Status {stat.s}</p>
                                <div className="space-y-2">
                                    <div className={`text-[10px] font-black rounded-lg px-2 py-1 ${stat.a ? 'bg-amber-100/50 text-amber-700' : 'bg-slate-100/50 text-slate-300 line-through'}`}>
                                        Atasan: {stat.wA}
                                    </div>
                                    <div className={`text-[10px] font-black rounded-lg px-2 py-1 ${stat.p ? 'bg-primary-100/50 text-primary-700' : 'bg-slate-100/50 text-slate-300 line-through'}`}>
                                        Peer: {stat.wP}
                                    </div>
                                    <div className={`text-[10px] font-black rounded-lg px-2 py-1 ${stat.b ? 'bg-violet-100/50 text-violet-700' : 'bg-slate-100/50 text-slate-300 line-through'}`}>
                                        Bawahan: {stat.wB}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default CrossGroupRelationPage;
