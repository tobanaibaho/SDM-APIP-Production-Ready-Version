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
    Search
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
        target_user_id: number | '';
        relation_type: string;
        createReciprocal: boolean;
    }>({
        evaluator_id: '',
        target_user_id: '',
        relation_type: 'Peer',
        createReciprocal: true,
    });

    const [selectedEvaluator, setSelectedEvaluator] = useState<UserOption | null>(null);
    const [selectedTarget, setSelectedTarget] = useState<UserOption | null>(null);

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
        u.id !== (form.target_user_id || 0) &&
        (u.name?.toLowerCase().includes(evaluatorSearch.toLowerCase()) ||
            u.nip?.includes(evaluatorSearch) ||
            u.email?.toLowerCase().includes(evaluatorSearch.toLowerCase()))
    ).slice(0, 8);

    const filteredTargets = allUsers.filter(u =>
        u.id !== (form.evaluator_id || 0) &&
        (u.name?.toLowerCase().includes(targetSearch.toLowerCase()) ||
            u.nip?.includes(targetSearch) ||
            u.email?.toLowerCase().includes(targetSearch.toLowerCase()))
    ).slice(0, 8);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPeriodId || !form.evaluator_id || !form.target_user_id) {
            toast.error('Lengkapi semua field terlebih dahulu');
            return;
        }
        if (form.evaluator_id === form.target_user_id) {
            toast.error('Penilai dan target tidak boleh sama');
            return;
        }

        setSaving(true);
        try {
            const reciprocalType = RECIPROCAL_MAP[form.relation_type] || 'Peer';

            // Create main relation: A → B
            await groupService.createCrossGroupRelation({
                period_id: Number(selectedPeriodId),
                evaluator_id: Number(form.evaluator_id),
                target_user_id: Number(form.target_user_id),
                relation_type: form.relation_type,
                target_position: reciprocalType,
            });

            // Create reciprocal relation: B → A (if enabled)
            if (form.createReciprocal) {
                await groupService.createCrossGroupRelation({
                    period_id: Number(selectedPeriodId),
                    evaluator_id: Number(form.target_user_id),
                    target_user_id: Number(form.evaluator_id),
                    relation_type: reciprocalType,
                    target_position: form.relation_type,
                });
            }

            toast.success(`Relasi berhasil ${form.createReciprocal ? 'dua arah ' : ''}dibuat`);
            setForm({ evaluator_id: '', target_user_id: '', relation_type: 'Peer', createReciprocal: true });
            setSelectedEvaluator(null);
            setSelectedTarget(null);
            setEvaluatorSearch('');
            setTargetSearch('');
            loadCrossRelations();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal membuat relasi');
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
            <div className="space-y-6">
                {/* Info Card */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex gap-4">
                    <Info size={22} className="text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                        <p className="font-bold mb-1">Panduan Relasi Lintas Grup</p>
                        <ul className="space-y-1 list-disc list-inside text-xs leading-relaxed">
                            <li>Gunakan halaman ini untuk menghubungkan pegawai dari <strong>Grup yang berbeda</strong> sebagai penilai satu sama lain.</li>
                            <li>Rekomendasi: Sesama <strong>Dalnis ↔ Dalnis</strong>, <strong>KT ↔ KT</strong>, atau <strong>AT ↔ AT</strong> dikategorikan sebagai <strong>Peer</strong>.</li>
                            <li>Aktifkan <strong>"Buat Relasi Timbal-Balik"</strong> agar sistem otomatis membuat relasi kebalikannya (A→B dan B→A sekaligus).</li>
                            <li>Relasi intra-grup (dalam satu grup) dikelola di halaman <strong>Manajemen Grup</strong>.</li>
                        </ul>
                    </div>
                </div>

                {/* Period Selector */}
                <div className="card p-5 flex items-center gap-4">
                    <Filter size={20} className="text-primary-500 shrink-0" />
                    <div className="flex-1">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Periode Aktif</label>
                        <select
                            className="form-input text-sm font-bold"
                            value={selectedPeriodId}
                            onChange={e => setSelectedPeriodId(Number(e.target.value) || '')}
                        >
                            <option value="">-- Pilih Periode Penilaian --</option>
                            {periods.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} {p.is_active ? '(Aktif)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    {/* Form Add Relation */}
                    <div className="xl:col-span-2 card p-6 h-fit">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="h-10 w-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                                <Link2 size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900">Tambah Relasi Baru</h3>
                                <p className="text-xs text-slate-500">Hubungkan dua pegawai lintas grup</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Evaluator Picker */}
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                    Penilai (Evaluator)
                                </label>
                                <div className="relative">
                                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        className="form-input pl-10"
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
                                        <div className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                                            {filteredEvaluators.length === 0 ? (
                                                <div className="p-3 text-xs text-slate-400 text-center">Tidak ditemukan</div>
                                            ) : filteredEvaluators.map(u => (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors border-b border-slate-50 last:border-0"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setSelectedEvaluator(u);
                                                        setForm(f => ({ ...f, evaluator_id: u.id }));
                                                        setShowEvaluatorDropdown(false);
                                                    }}
                                                >
                                                    <p className="text-xs font-black text-slate-900">{u.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono">{u.nip} · {u.jabatan || u.email}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {selectedEvaluator && (
                                    <p className="text-[10px] text-primary-600 font-bold">✓ {selectedEvaluator.email}</p>
                                )}
                            </div>

                            {/* Relation Type */}
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                    Tipe Relasi Penilai
                                </label>
                                <select
                                    className="form-input font-bold"
                                    value={form.relation_type}
                                    onChange={e => setForm(f => ({ ...f, relation_type: e.target.value }))}
                                >
                                    {RELATION_TYPES.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                                {selectedRelationType && (
                                    <p className="text-[10px] text-slate-500 italic">{selectedRelationType.desc}</p>
                                )}
                            </div>

                            {/* Arrow indicator */}
                            <div className="flex items-center justify-center gap-3 py-2">
                                <div className="h-px flex-1 bg-slate-200"></div>
                                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-wider">
                                    <span className="text-primary-600">{form.relation_type || '?'}</span>
                                    <ArrowRight size={16} className="text-slate-300" />
                                    <span className="text-slate-500">{reciprocalLabel}</span>
                                </div>
                                <div className="h-px flex-1 bg-slate-200"></div>
                            </div>

                            {/* Target Picker */}
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                    Target yang Dinilai
                                </label>
                                <div className="relative">
                                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        className="form-input pl-10"
                                        placeholder="Cari nama / NIP..."
                                        value={selectedTarget ? `${selectedTarget.name} (${selectedTarget.nip})` : targetSearch}
                                        onChange={e => {
                                            setTargetSearch(e.target.value);
                                            setSelectedTarget(null);
                                            setForm(f => ({ ...f, target_user_id: '' }));
                                            setShowTargetDropdown(true);
                                        }}
                                        onFocus={() => setShowTargetDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowTargetDropdown(false), 150)}
                                    />
                                    {showTargetDropdown && targetSearch && !selectedTarget && (
                                        <div className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                                            {filteredTargets.length === 0 ? (
                                                <div className="p-3 text-xs text-slate-400 text-center">Tidak ditemukan</div>
                                            ) : filteredTargets.map(u => (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors border-b border-slate-50 last:border-0"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setSelectedTarget(u);
                                                        setForm(f => ({ ...f, target_user_id: u.id }));
                                                        setShowTargetDropdown(false);
                                                    }}
                                                >
                                                    <p className="text-xs font-black text-slate-900">{u.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono">{u.nip} · {u.jabatan || u.email}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {selectedTarget && (
                                    <p className="text-[10px] text-primary-600 font-bold">✓ {selectedTarget.email}</p>
                                )}
                            </div>

                            {/* Reciprocal toggle */}
                            <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <input
                                    type="checkbox"
                                    id="reciprocal"
                                    className="w-4 h-4 rounded accent-primary-600 mt-0.5"
                                    checked={form.createReciprocal}
                                    onChange={e => setForm(f => ({ ...f, createReciprocal: e.target.checked }))}
                                />
                                <label htmlFor="reciprocal" className="cursor-pointer">
                                    <p className="text-xs font-black text-slate-800">Buat Relasi Timbal-Balik Otomatis</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        Akan membuat 2 relasi: A sebagai <strong>{form.relation_type}</strong> B, dan B sebagai <strong>{reciprocalLabel}</strong> A. Direkomendasikan untuk relasi Peer.
                                    </p>
                                </label>
                            </div>

                            {!selectedPeriodId && (
                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl text-xs font-bold border border-amber-100">
                                    <AlertCircle size={14} />
                                    Pilih periode terlebih dahulu
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={saving || !selectedPeriodId || !form.evaluator_id || !form.target_user_id}
                                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                                {saving ? 'Menyimpan...' : 'Tambah Relasi'}
                            </button>
                        </form>
                    </div>

                    {/* Relations List */}
                    <div className="xl:col-span-3 card overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center">
                                    <ArrowLeftRight size={18} className="text-slate-600" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-sm">Relasi Lintas Grup Aktif</h3>
                                    <p className="text-[10px] text-slate-400">{crossRelations.length} relasi terdaftar</p>
                                </div>
                            </div>
                            <button onClick={loadCrossRelations} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-xl transition-all" title="Refresh">
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {!selectedPeriodId ? (
                            <div className="py-16 text-center">
                                <Filter size={40} className="mx-auto text-slate-200 mb-3" />
                                <p className="text-sm font-bold text-slate-400">Pilih periode untuk melihat relasi</p>
                            </div>
                        ) : loading ? (
                            <div className="divide-y divide-slate-50">
                                {Array(5).fill(0).map((_, i) => (
                                    <div key={i} className="px-6 py-4 animate-pulse flex items-center gap-4">
                                        <div className="h-8 w-8 bg-slate-100 rounded-lg"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                                            <div className="h-2 bg-slate-50 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : crossRelations.length === 0 ? (
                            <div className="py-16 text-center">
                                <Users size={40} className="mx-auto text-slate-200 mb-3" />
                                <p className="text-sm font-bold text-slate-400">Belum ada relasi lintas grup</p>
                                <p className="text-xs text-slate-300 mt-1">Tambah relasi menggunakan form di sebelah kiri</p>
                            </div>
                        ) : (
                            <div className="overflow-auto max-h-[520px]">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Penilai</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Relasi</th>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Target</th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {crossRelations.map(rel => (
                                            <tr key={rel.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-black">
                                                            {(rel.evaluator?.name || rel.evaluator?.email || 'U')[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-900 truncate max-w-[120px]">
                                                                {rel.evaluator?.name || rel.evaluator?.email || `User #${rel.evaluator_id}`}
                                                            </p>
                                                            <p className="text-[9px] font-mono text-slate-400">{rel.evaluator?.nip}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getRelationBadge(rel.relation_type)}`}>
                                                            {rel.relation_type}
                                                        </span>
                                                        <ArrowRight size={12} className="text-slate-300" />
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getRelationBadge(rel.target_position)}`}>
                                                            {rel.target_position}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-accent-100 text-accent-700 flex items-center justify-center text-xs font-black">
                                                            {(rel.target_user?.name || rel.target_user?.email || 'U')[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-900 truncate max-w-[120px]">
                                                                {rel.target_user?.name || rel.target_user?.email || `User #${rel.target_user_id}`}
                                                            </p>
                                                            <p className="text-[9px] font-mono text-slate-400">{rel.target_user?.nip}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <button
                                                        onClick={() => handleDelete(rel.id)}
                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Hapus relasi ini"
                                                    >
                                                        <Trash2 size={15} />
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

                {/* Bobot System Info */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                        <div className="h-10 w-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900">Sistem Pembobotan Adaptif (7 Status)</h3>
                            <p className="text-xs text-slate-500">Bobot penilaian dihitung otomatis berdasarkan ketersediaan rater dari semua grup</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {[
                            { s: 1, a: true, p: true, b: true, wA: '60%', wP: '20%', wB: '20%' },
                            { s: 2, a: false, p: true, b: true, wA: '-', wP: '50%', wB: '50%' },
                            { s: 3, a: true, p: false, b: true, wA: '60%', wP: '-', wB: '40%' },
                            { s: 4, a: true, p: true, b: false, wA: '60%', wP: '40%', wB: '-' },
                            { s: 5, a: false, p: false, b: true, wA: '-', wP: '-', wB: '100%' },
                            { s: 6, a: false, p: true, b: false, wA: '-', wP: '100%', wB: '-' },
                            { s: 7, a: true, p: false, b: false, wA: '100%', wP: '-', wB: '-' },
                        ].map(stat => (
                            <div key={stat.s} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status {stat.s}</p>
                                <div className="space-y-1">
                                    <div className={`text-[9px] font-black rounded px-1.5 py-0.5 ${stat.a ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-300 line-through'}`}>
                                        Atasan: {stat.wA}
                                    </div>
                                    <div className={`text-[9px] font-black rounded px-1.5 py-0.5 ${stat.p ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-300 line-through'}`}>
                                        Peer: {stat.wP}
                                    </div>
                                    <div className={`text-[9px] font-black rounded px-1.5 py-0.5 ${stat.b ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-300 line-through'}`}>
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
