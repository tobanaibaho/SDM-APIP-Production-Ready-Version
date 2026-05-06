import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { questionService, Question } from '../services/questionService';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Plus, Search, Trash2, Edit2, Loader2, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import useEscapeKey from '../hooks/useEscapeKey';

const INDICATORS = [
    'Berorientasi Pelayanan', 'Akuntabel', 'Kompeten', 'Harmonis', 'Loyal', 'Adaptif', 'Kolaboratif'
];

const AdminQuestionManagement: React.FC = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterIndicator, setFilterIndicator] = useState('Semua');

    const [showModal, setShowModal] = useState(false);
    useEscapeKey(showModal, () => setShowModal(false));
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ indicator: 'Berorientasi Pelayanan', text: '', texts: [''], is_active: true });


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
        setFormData({ indicator: 'Berorientasi Pelayanan', text: '', texts: [''], is_active: true });
        setShowModal(true);
    };

    const handleOpenEdit = (q: Question) => {
        setEditingId(q.id);
        setFormData({ indicator: q.indicator, text: q.text, texts: [q.text], is_active: q.is_active });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingId) {
                if (!formData.text.trim()) { toast.error('Pertanyaan tidak boleh kosong'); setSaving(false); return; }
                await questionService.updateQuestion(editingId, { indicator: formData.indicator, text: formData.text, is_active: formData.is_active });
                toast.success('Pertanyaan diperbarui');
            } else {
                const validTexts = formData.texts.filter(t => t.trim() !== '');
                if (validTexts.length === 0) { toast.error('Minimal satu pertanyaan harus diisi'); setSaving(false); return; }
                
                await Promise.all(validTexts.map(text => 
                    questionService.createQuestion({ indicator: formData.indicator, text })
                ));
                toast.success(`${validTexts.length} pertanyaan berhasil ditambahkan`);
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


    const filteredQuestions = questions.filter(q => {
        const matchSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase());
        const matchInd = filterIndicator === 'Semua' || q.indicator === filterIndicator;
        return matchSearch && matchInd;
    });

    // Kelompokkan berdasarkan indikator untuk lencana jumlah
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
                        className="md:col-span-4 bg-slate-900 rounded-xl p-5 text-white relative overflow-hidden shadow-2xl group border border-slate-800"
                    >
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                                <FileText size={24} className="text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70 mb-2">Total Pertanyaan Aktif</p>
                                <h3 className="text-2xl font-black tracking-tighter group-hover:scale-105 transition-transform origin-left duration-500">
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
                        className="md:col-span-8 bg-white/70 backdrop-blur-3xl rounded-xl p-5 border border-white/60 shadow-[0_10px_40px_rgb(0,0,0,0.04)] flex flex-col justify-center"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <h4 className="text-xl font-black text-slate-900 tracking-tight">Kuesioner BerAKHLAK</h4>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-md">
                                    Tambahkan dan kelola kriteria penilaian perilaku BerAKHLAK secara dinamis.
                                </p>
                            </div>
                            <div className="flex gap-3 shrink-0 flex-wrap">
                                <button
                                    onClick={handleOpenCreate}
                                    className="px-5 py-4 rounded-md bg-primary-600 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-primary-100 flex items-center gap-2"
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {[1, 2].map(i => <div key={i} className="bg-white/50 h-20 rounded-xl animate-pulse border border-white/50" />)}
                    </div>
                ) : filteredQuestions.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 text-center bg-white/40 backdrop-blur-3xl rounded-2xl border-4 border-dashed border-white/60">
                        <FileText size={80} className="mx-auto text-slate-300 mb-6 drop-shadow-sm" />
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Belum ada pertanyaan.</h3>
                        <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.3em] mt-3">Buat pertanyaan baru atau import dari file Excel.</p>
                    </motion.div>
                ) : (
                    <div className="bg-white/70 backdrop-blur-3xl rounded-xl border border-white/60 shadow-[0_20px_50px_rgb(0,0,0,0.05)] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100/50 border-b border-white/40">
                                        <th className="px-4 py-5 text-xs font-black uppercase tracking-[0.15em] text-slate-700 w-16 text-center">Status</th>
                                        <th className="px-4 py-5 text-xs font-black uppercase tracking-[0.15em] text-slate-700 w-1/4">Indikator</th>
                                        <th className="px-4 py-5 text-xs font-black uppercase tracking-[0.15em] text-slate-700">Pertanyaan / Kriteria</th>
                                        <th className="px-4 py-5 text-xs font-black uppercase tracking-[0.15em] text-slate-700 text-right">Aksi</th>
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
                                                    <td colSpan={4} className="px-4 py-4">
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
                                                        <td className="px-4 py-5 text-center align-middle">
                                                            <button
                                                                onClick={() => toggleStatus(q)}
                                                                className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${q.is_active ? 'bg-primary-600' : 'bg-slate-400'}`}
                                                                title={q.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                            >
                                                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${q.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-6 text-base font-black text-primary-900 tracking-tight">{q.indicator}</td>
                                                        <td className="px-4 py-6 text-base text-slate-900 font-bold max-w-xl leading-relaxed">{q.text}</td>
                                                        <td className="px-4 py-5 gap-2 text-right">
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
                        <div className="px-4 py-5 border-t border-slate-200 text-sm font-bold text-slate-500 bg-slate-100/50">
                            Menampilkan {filteredQuestions.length} dari {questions.length} pertanyaan
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {/* ── Create/Edit Modal ── */}
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => setShowModal(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="relative bg-white w-full max-w-4xl rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.35)] overflow-hidden"
                        >
                            <div className="bg-slate-900 px-4 py-6 text-white flex items-center justify-between relative border-b border-white/5">
                                <h3 className="text-xl font-black italic tracking-tight uppercase">
                                    {editingId ? 'Edit Pertanyaan' : 'Tambah Pertanyaan'}
                                </h3>
                                <button type="button" onClick={() => setShowModal(false)} className="relative z-10 h-10 w-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-rose-500 transition-all active:scale-90">
                                    <X size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-5 space-y-6 bg-slate-100/50 max-h-[85vh] overflow-y-auto">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-900 uppercase tracking-widest block pl-1">Indikator BerAKHLAK</label>
                                    <select
                                        className="w-full bg-white border border-slate-200 focus:border-primary-500 rounded-2xl px-4 py-4 text-sm font-black text-slate-800 transition-all outline-none shadow-sm cursor-pointer"
                                        value={formData.indicator}
                                        onChange={e => setFormData({ ...formData, indicator: e.target.value })}
                                        disabled={saving}
                                    >
                                        {INDICATORS.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                                    </select>
                                </div>
                                
                                {editingId ? (
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest block pl-1">Pertanyaan / Kriteria</label>
                                        <textarea
                                            className="w-full bg-white border border-slate-200 focus:border-primary-500 rounded-2xl px-4 py-4 text-sm font-medium text-slate-800 transition-all outline-none shadow-sm min-h-[120px]"
                                            placeholder="Tuliskan pernyataan perilaku secara spesifik..."
                                            value={formData.text}
                                            onChange={e => setFormData({ ...formData, text: e.target.value })}
                                            disabled={saving}
                                            required
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center pl-1">
                                            <label className="text-xs font-black text-slate-900 uppercase tracking-widest block">Daftar Pertanyaan Baru</label>
                                            <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded-md">{formData.texts.length} Baris</span>
                                        </div>
                                        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                                            {formData.texts.map((txt, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <textarea
                                                        className="w-full bg-white border border-slate-200 focus:border-primary-500 rounded-xl px-4 py-4 text-sm font-medium text-slate-800 transition-all outline-none shadow-sm min-h-[100px]"
                                                        placeholder={`Pertanyaan ke-${index + 1}...`}
                                                        value={txt}
                                                        onChange={e => {
                                                            const newTexts = [...formData.texts];
                                                            newTexts[index] = e.target.value;
                                                            setFormData({ ...formData, texts: newTexts });
                                                        }}
                                                        disabled={saving}
                                                    />
                                                    {formData.texts.length > 1 && (
                                                        <button type="button" onClick={() => {
                                                            const newTexts = formData.texts.filter((_, i) => i !== index);
                                                            setFormData({ ...formData, texts: newTexts });
                                                        }} className="shrink-0 w-10 text-rose-500 hover:bg-rose-100 rounded-xl transition-all self-stretch flex items-center justify-center border border-transparent">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <button type="button" onClick={() => setFormData({ ...formData, texts: [...formData.texts, ''] })} className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition-all font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                                            <Plus size={16} /> Tambah Baris Pertanyaan
                                        </button>
                                    </div>
                                )}
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">Batal</button>
                                    <button type="submit" className="flex-[2] py-5 rounded-3xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-primary-600 transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95" disabled={saving}>
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : 'Simpan Pertanyaan'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
};

export default AdminQuestionManagement;
