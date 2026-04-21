import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { questionService, Question } from '../services/questionService';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Plus, Search, Trash2, Edit2, Loader2, Upload, Download, X, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const INDICATORS = [
    'Berorientasi Pelayanan', 'Akuntabel', 'Kompeten', 'Harmonis', 'Loyal', 'Adaptif', 'Kolaboratif'
];

const AdminQuestionManagement: React.FC = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterIndicator, setFilterIndicator] = useState('Semua');

    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [importing, setImporting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ indicator: 'Berorientasi Pelayanan', text: '', is_active: true });

    // Import state
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importPreview, setImportPreview] = useState<{ indicator: string; text: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchQuestions(); }, []);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const res = await questionService.getQuestions(true);
            setQuestions(res.data.data || []);
        } catch {
            toast.error('Gagal memuat daftar kuesioner');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ indicator: 'Berorientasi Pelayanan', text: '', is_active: true });
        setShowModal(true);
    };

    const handleOpenEdit = (q: Question) => {
        setEditingId(q.id);
        setFormData({ indicator: q.indicator, text: q.text, is_active: q.is_active });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.text.trim()) { toast.error('Pertanyaan tidak boleh kosong'); return; }
        setSaving(true);
        try {
            if (editingId) {
                await questionService.updateQuestion(editingId, formData);
                toast.success('Pertanyaan diperbarui');
            } else {
                await questionService.createQuestion(formData);
                toast.success('Pertanyaan berhasil ditambahkan');
            }
            setShowModal(false);
            fetchQuestions();
        } catch {
            toast.error('Terjadi kesalahan saat menyimpan data');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Yakin ingin menghapus pertanyaan ini secara permanen?')) return;
        try {
            await questionService.deleteQuestion(id);
            toast.success('Pertanyaan dihapus');
            fetchQuestions();
        } catch {
            toast.error('Gagal menghapus pertanyaan');
        }
    };

    const toggleStatus = async (q: Question) => {
        try {
            await questionService.updateQuestion(q.id, { is_active: !q.is_active });
            toast.success(`Status pertanyaan diubah menjadi ${!q.is_active ? 'Aktif' : 'Non-aktif'}`);
            fetchQuestions();
        } catch {
            toast.error('Gagal mengubah status');
        }
    };

    // ── Import Logic ──────────────────────────────────────
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportFile(file);

        // CSV preview (client-side)
        if (file.name.endsWith('.csv')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = ev.target?.result as string;
                const lines = text.split('\n').slice(1); // skip header
                const preview = lines
                    .filter(l => l.trim())
                    .slice(0, 5)
                    .map(l => {
                        const parts = l.split(',');
                        return { indicator: parts[0]?.trim() || '', text: parts.slice(1).join(',').trim() };
                    });
                setImportPreview(preview);
            };
            reader.readAsText(file, 'utf-8');
        } else {
            setImportPreview([]);
        }
    };

    const handleImport = async () => {
        if (!importFile) { toast.error('Pilih file terlebih dahulu'); return; }
        setImporting(true);
        try {
            const res = await questionService.importQuestionsExcel(importFile);
            const count = res.data.data?.imported ?? 0;
            toast.success(`${count} pertanyaan berhasil diimport!`);
            setShowImportModal(false);
            setImportFile(null);
            setImportPreview([]);
            fetchQuestions();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Import gagal');
        } finally {
            setImporting(false);
        }
    };

    const filteredQuestions = questions.filter(q => {
        const matchSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase());
        const matchInd = filterIndicator === 'Semua' || q.indicator === filterIndicator;
        return matchSearch && matchInd;
    });

    // Group by indicator for count badge
    const countByIndicator = INDICATORS.reduce<Record<string, number>>((acc, ind) => {
        acc[ind] = questions.filter(q => q.indicator === ind && q.is_active).length;
        return acc;
    }, {});

    return (
        <Layout title="Kuesioner Dinamis" subtitle="Kelola daftar pertanyaan penilaian kinerja BerAKHLAK.">
            <div className="space-y-8 animate-fade-in">
                {/* Header Cards */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="md:col-span-4 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl group border border-slate-800"
                    >
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                                <FileText size={24} className="text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70 mb-2">Total Pertanyaan Aktif</p>
                                <h3 className="text-6xl font-black tracking-tighter group-hover:scale-105 transition-transform origin-left duration-500">
                                    {questions.filter(q => q.is_active).length}
                                </h3>
                                <p className="text-white/60 text-sm mt-3 font-semibold">dari {questions.length} total pertanyaan</p>
                            </div>
                        </div>
                        <FileText size={160} className="absolute -right-12 -bottom-12 text-white/5 rotate-12 transition-transform duration-1000 group-hover:rotate-0" />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="md:col-span-8 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/60 shadow-[0_10px_40px_rgb(0,0,0,0.04)] flex flex-col justify-center"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <h4 className="text-xl font-black text-slate-900 tracking-tight">Kuesioner BerAKHLAK</h4>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-md">
                                    Tambahkan pertanyaan satu per satu, atau impor sekaligus dari file Excel/CSV.
                                </p>
                            </div>
                            <div className="flex gap-3 shrink-0 flex-wrap">
                                <button
                                    onClick={() => questionService.downloadTemplate()}
                                    className="px-5 py-4 rounded-[1.5rem] bg-white border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                                >
                                    <Download size={16} strokeWidth={2.5} /> Unduh Template
                                </button>
                                <button
                                    onClick={() => { setImportFile(null); setImportPreview([]); setShowImportModal(true); }}
                                    className="px-5 py-4 rounded-[1.5rem] bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
                                >
                                    <Upload size={16} strokeWidth={2.5} /> Import Excel
                                </button>
                                <button
                                    onClick={handleOpenCreate}
                                    className="px-5 py-4 rounded-[1.5rem] bg-primary-600 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-primary-100 flex items-center gap-2"
                                >
                                    <Plus size={18} strokeWidth={3} /> Buat Pertanyaan
                                </button>
                            </div>
                        </div>
                        {/* Indicator badge counts */}
                        <div className="mt-6 flex flex-wrap gap-2">
                            {INDICATORS.map(ind => (
                                <span
                                    key={ind}
                                    onClick={() => setFilterIndicator(filterIndicator === ind ? 'Semua' : ind)}
                                    className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filterIndicator === ind ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-primary-50 hover:text-primary-600'}`}
                                >
                                    {ind} ({countByIndicator[ind]})
                                </span>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Search Toolbar */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center bg-white/70 backdrop-blur-3xl p-5 rounded-[2.2rem] border border-white/60 shadow-[0_10px_40px_rgb(0,0,0,0.05)]">
                    <div className="relative flex-1 group">
                        <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari teks pertanyaan..."
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-inner"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-slate-50 border border-slate-200 rounded-2xl flex-1 max-w-sm ml-auto overflow-hidden shadow-inner p-1">
                        <select
                            className="w-full bg-transparent p-3 text-sm font-black text-slate-700 outline-none cursor-pointer"
                            value={filterIndicator}
                            onChange={e => setFilterIndicator(e.target.value)}
                        >
                            <option value="Semua">Semua Indikator</option>
                            {INDICATORS.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                        </select>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[1, 2].map(i => <div key={i} className="bg-white/50 h-32 rounded-[2.5rem] animate-pulse border border-white/50" />)}
                    </div>
                ) : filteredQuestions.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 text-center bg-white/40 backdrop-blur-3xl rounded-[3rem] border-4 border-dashed border-white/60">
                        <FileText size={80} className="mx-auto text-slate-300 mb-6 drop-shadow-sm" />
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Belum ada pertanyaan.</h3>
                        <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.3em] mt-3">Buat pertanyaan baru atau import dari file Excel.</p>
                    </motion.div>
                ) : (
                    <div className="bg-white/70 backdrop-blur-3xl rounded-[2.5rem] border border-white/60 shadow-[0_20px_50px_rgb(0,0,0,0.05)] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-white/40">
                                        <th className="px-6 py-5 text-xs font-black uppercase tracking-[0.15em] text-slate-700 w-24 text-center">Status</th>
                                        <th className="px-6 py-5 text-xs font-black uppercase tracking-[0.15em] text-slate-700 w-1/4">Indikator</th>
                                        <th className="px-6 py-5 text-xs font-black uppercase tracking-[0.15em] text-slate-700">Pertanyaan / Kriteria</th>
                                        <th className="px-6 py-5 text-xs font-black uppercase tracking-[0.15em] text-slate-700 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/50">
                                    {INDICATORS.map((ind) => {
                                        const groupQuestions = filteredQuestions.filter(q => q.indicator === ind);
                                        if (groupQuestions.length === 0) return null;
                                        
                                        return (
                                            <React.Fragment key={ind}>
                                                {/* Group Header - High Contrast for 7 Blocks */}
                                                <tr className="bg-primary-900 border-b-2 border-primary-800">
                                                    <td colSpan={4} className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-2 w-8 bg-sky-400 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.5)]"></div>
                                                            <span className="text-sm font-black uppercase tracking-[0.25em] text-white">
                                                                {ind} <span className="ml-2 text-primary-300 opacity-80 text-xs">({groupQuestions.length} Pertanyaan)</span>
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {/* Group Items */}
                                                {groupQuestions.map((q, idx) => (
                                                    <motion.tr
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: Math.min(idx, 10) * 0.03 }}
                                                        key={q.id}
                                                        className={`group hover:bg-slate-50/80 transition-all duration-300 ${!q.is_active ? 'opacity-60 grayscale' : ''}`}
                                                    >
                                                        <td className="px-6 py-5 text-center align-middle">
                                                            <button
                                                                onClick={() => toggleStatus(q)}
                                                                className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${q.is_active ? 'bg-primary-600' : 'bg-slate-400'}`}
                                                                title={q.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                            >
                                                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${q.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-6 text-base font-black text-primary-900 tracking-tight">{q.indicator}</td>
                                                        <td className="px-6 py-6 text-base text-slate-900 font-bold max-w-xl leading-relaxed">{q.text}</td>
                                                        <td className="px-6 py-5 gap-2 text-right">
                                                            <button onClick={() => handleOpenEdit(q)} className="h-10 w-10 inline-flex items-center justify-center text-slate-500 hover:text-primary-700 hover:bg-primary-100 rounded-xl transition-all">
                                                                <Edit2 size={18} strokeWidth={2.5} />
                                                            </button>
                                                            <button onClick={() => handleDelete(q.id)} className="h-10 w-10 inline-flex items-center justify-center text-slate-500 hover:text-rose-700 hover:bg-rose-100 rounded-xl transition-all">
                                                                <Trash2 size={18} strokeWidth={2.5} />
                                                            </button>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-5 border-t border-slate-200 text-sm font-bold text-slate-500 bg-slate-50/50">
                            Menampilkan {filteredQuestions.length} dari {questions.length} pertanyaan
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {/* ── Create/Edit Modal ── */}
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => setShowModal(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="relative bg-white w-full max-w-md rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.35)] overflow-hidden"
                        >
                            <div className="bg-slate-900 px-10 py-10 text-white text-center relative overflow-hidden">
                                <h3 className="text-2xl font-black tracking-tight relative z-10 uppercase">
                                    {editingId ? 'Edit Pertanyaan' : 'Tambah Pertanyaan'}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 h-10 w-10 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-rose-500 transition-all">
                                    <X size={18} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-10 space-y-6 bg-slate-50/50">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">Indikator BerAKHLAK</label>
                                    <select
                                        className="w-full bg-white border border-slate-200 focus:border-primary-500 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 transition-all outline-none shadow-sm cursor-pointer"
                                        value={formData.indicator}
                                        onChange={e => setFormData({ ...formData, indicator: e.target.value })}
                                        disabled={saving}
                                    >
                                        {INDICATORS.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">Pertanyaan / Kriteria</label>
                                    <textarea
                                        className="w-full bg-white border border-slate-200 focus:border-primary-500 rounded-2xl px-6 py-4 text-sm font-medium text-slate-800 transition-all outline-none shadow-sm min-h-[120px]"
                                        placeholder="Tuliskan pernyataan perilaku secara spesifik..."
                                        value={formData.text}
                                        onChange={e => setFormData({ ...formData, text: e.target.value })}
                                        disabled={saving}
                                        required
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all">Batal</button>
                                    <button type="submit" className="flex-[2] py-5 rounded-3xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest hover:bg-primary-600 transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95" disabled={saving}>
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : 'Simpan Pertanyaan'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* ── Import Excel Modal ── */}
                {showImportModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => !importing && setShowImportModal(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.35)] overflow-hidden"
                        >
                            <div className="bg-emerald-700 px-10 py-10 text-white relative">
                                <h3 className="text-2xl font-black tracking-tight uppercase">Import dari Excel</h3>
                                <p className="text-emerald-200 text-xs font-bold mt-2">Upload file .xlsx atau .csv berisi daftar pertanyaan</p>
                                <button onClick={() => setShowImportModal(false)} className="absolute top-8 right-8 h-10 w-10 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-red-500 transition-all" disabled={importing}>
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-10 space-y-6">
                                {/* Format info */}
                                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-xs font-medium text-slate-600 space-y-2">
                                    <p className="font-black text-slate-800 uppercase tracking-widest text-[10px] mb-3">Format File yang Diperlukan</p>
                                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px] bg-white rounded-xl p-4 border border-slate-100">
                                        <span className="font-black text-slate-700">Kolom A: Indikator</span>
                                        <span className="font-black text-slate-700">Kolom B: Pertanyaan</span>
                                        <span className="text-primary-600">Akuntabel</span>
                                        <span className="text-slate-500">Pegawai ini bertanggung jawab...</span>
                                        <span className="text-primary-600">Loyal</span>
                                        <span className="text-slate-500">Pegawai ini mengutamakan...</span>
                                    </div>
                                    <button onClick={() => questionService.downloadTemplate()} className="flex items-center gap-2 text-primary-600 font-black text-[10px] uppercase tracking-widest hover:text-primary-800 transition-colors mt-2">
                                        <Download size={12} /> Unduh Template CSV
                                    </button>
                                </div>

                                {/* Drop zone */}
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-3 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${importFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-primary-400 hover:bg-primary-50/50'}`}
                                >
                                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                                    {importFile ? (
                                        <div className="space-y-2">
                                            <CheckCircle size={40} className="mx-auto text-emerald-500" />
                                            <p className="font-black text-emerald-700 text-sm">{importFile.name}</p>
                                            <p className="text-emerald-500 text-xs font-medium">Klik untuk pilih file lain</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Upload size={40} className="mx-auto text-slate-300" />
                                            <p className="font-black text-slate-600 text-sm">Klik untuk pilih file Excel / CSV</p>
                                            <p className="text-slate-400 text-xs">Format: .xlsx, .xls, .csv</p>
                                        </div>
                                    )}
                                </div>

                                {/* Preview */}
                                {importPreview.length > 0 && (
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pratinjau (5 baris pertama)</p>
                                        {importPreview.map((row, i) => (
                                            <div key={i} className="flex gap-3 text-xs">
                                                <span className="font-black text-primary-600 w-40 shrink-0">{row.indicator}</span>
                                                <span className="text-slate-600 truncate">{row.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setShowImportModal(false)} className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all" disabled={importing}>
                                        Batal
                                    </button>
                                    <button onClick={handleImport} disabled={!importFile || importing} className="flex-[2] py-4 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
                                        {importing ? <Loader2 size={18} className="animate-spin" /> : <><Upload size={16} /> Import Sekarang</>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
};

export default AdminQuestionManagement;
