import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import assessmentService, { AssessmentPeriod } from '../services/assessmentService';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Plus,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Clock,
    AlertCircle,
    RefreshCw,
    Lock,
    Info,
    Loader2,
    X,
    Edit3
} from 'lucide-react';

/* ── helpers ── */
const isPeriodExpiredByDate = (period: AssessmentPeriod) =>
    new Date() > new Date(period.end_date);

const isPeriodUpcoming = (period: AssessmentPeriod) =>
    new Date() < new Date(period.start_date);

const daysUntilEnd = (period: AssessmentPeriod) =>
    Math.ceil((new Date(period.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

const AssessmentPeriodManagement: React.FC = () => {
    const [periods, setPeriods] = useState<AssessmentPeriod[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<AssessmentPeriod | null>(null);
    const [overrideConfirm, setOverrideConfirm] = useState<AssessmentPeriod | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [newPeriod, setNewPeriod] = useState({
        name: '',
        start_date: '',
        end_date: '',
        frequency: 'monthly'
    });

    useEffect(() => {
        fetchPeriods();
    }, []);

    const fetchPeriods = async () => {
        try {
            setLoading(true);
            const data = await assessmentService.getAllPeriods();
            setPeriods(data);
        } catch (error) {
            toast.error('Gagal mengambil data periode');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await assessmentService.createPeriod(newPeriod);
            toast.success('Periode berhasil dibuat');
            setShowModal(false);
            setNewPeriod({ name: '', start_date: '', end_date: '', frequency: 'monthly' });
            fetchPeriods();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal membuat periode');
        }
    };

    const [editPeriod, setEditPeriod] = useState<AssessmentPeriod | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editPeriod) return;
        try {
            await assessmentService.updatePeriod(editPeriod.id, {
                name: editPeriod.name,
                start_date: typeof editPeriod.start_date === 'string' ? editPeriod.start_date.split('T')[0] : editPeriod.start_date,
                end_date: typeof editPeriod.end_date === 'string' ? editPeriod.end_date.split('T')[0] : editPeriod.end_date,
            });
            toast.success('Periode berhasil diperbarui');
            setShowEditModal(false);
            setEditPeriod(null);
            fetchPeriods();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal memperbarui periode');
        }
    };

    const handleToggleStatus = async (period: AssessmentPeriod) => {
        const expiredByDate = isPeriodExpiredByDate(period);

        // Jika periode sudah expired secara tanggal → tampilkan konfirmasi override
        if (expiredByDate) {
            setOverrideConfirm(period);
            return;
        }

        // Jika periode masih dalam rentang tanggal dan aktif → tidak perlu toggle manual
        if (period.is_active && !expiredByDate) {
            toast('Periode ini masih berjalan. Sistem akan menonaktifkannya otomatis saat tanggal berakhir.', { icon: 'ℹ️', id: 'period-info' });
            return;
        }

        // Untuk periode upcoming (belum mulai) → boleh toggle bebas
        try {
            await assessmentService.updatePeriodStatus(period.id, !period.is_active);
            toast.success('Status periode diperbarui', { id: 'period-toast' });
            fetchPeriods();
        } catch {
            toast.error('Gagal memperbarui status', { id: 'period-toast' });
        }
    };

    const handleOverrideReactivate = async () => {
        if (!overrideConfirm) return;
        try {
            await assessmentService.updatePeriodStatus(overrideConfirm.id, true);
            toast.success(`Periode "${overrideConfirm.name}" diaktifkan kembali oleh Admin.`, { id: 'period-toast' });
            setOverrideConfirm(null);
            fetchPeriods();
        } catch {
            toast.error('Gagal mengaktifkan kembali periode', { id: 'period-toast' });
        }
    };

    const handleDelete = (period: AssessmentPeriod) => {
        setDeleteConfirm(period);
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;
        setDeleting(true);
        try {
            await assessmentService.deletePeriod(deleteConfirm.id);
            toast.success(`Periode "${deleteConfirm.name}" berhasil dihapus`);
            setDeleteConfirm(null);
            fetchPeriods();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal menghapus periode');
        } finally {
            setDeleting(false);
        }
    };

    const getStatusBadge = (period: AssessmentPeriod) => {
        if (isPeriodExpiredByDate(period)) {
            return (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-rose-50 border border-rose-100 text-[10px] font-black text-rose-700 uppercase tracking-widest">
                    <Lock size={12} strokeWidth={3} /> Berakhir
                </div>
            );
        }
        if (isPeriodUpcoming(period)) {
            return (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-primary-50 border border-primary-100 text-[10px] font-black text-primary-700 uppercase tracking-widest">
                    Akan Datang
                </div>
            );
        }
        if (period.is_active) {
            return (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-[10px] font-black text-emerald-700 uppercase tracking-widest shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Berjalan
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Nonaktif
            </div>
        );
    };

    return (
        <Layout
            title="Tata Kelola Periode"
            subtitle="Pengaturan dan pengelolaan siklus penilaian kinerja 360 derajat."
        >
            <div className="space-y-8 animate-fade-in">
                {/* Header Action Bento Banner */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="md:col-span-8 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-start gap-6 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-0">
                            <Calendar size={120} />
                        </div>
                        <div className="h-14 w-14 rounded-[1.5rem] bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 shadow-sm border border-primary-100/50">
                            <Info size={28} strokeWidth={2.5} />
                        </div>
                        <div className="relative z-10 space-y-3">
                            <h4 className="text-xl font-black text-slate-900 tracking-tight">Tata Kelola Otomatis Aktif</h4>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-2xl">
                                Seluruh periode akan terkunci secara otomatis tepat pada <span className="text-slate-900 font-black">pukul 00:00</span> setelah tanggal berakhir terlampaui. Gunakan fitur <span className="text-primary-600 font-black">Override</span> hanya untuk situasi mendesak.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="md:col-span-4 bg-slate-900 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden border border-slate-800"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Plus size={80} className="text-white" />
                        </div>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Administrasi</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-white text-slate-900 w-full py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary-500 hover:text-white transition-all shadow-xl active:scale-95"
                        >
                            <Plus size={20} strokeWidth={3} /> Buat Periode Baru
                        </button>
                    </motion.div>
                </div>

                {/* Periods Grid Bento */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {loading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="bg-white/50 backdrop-blur-sm rounded-[2.5rem] h-[320px] animate-pulse border border-white/50" />
                        ))
                    ) : periods.length === 0 ? (
                        <div className="col-span-full py-32 text-center bg-white/40 backdrop-blur-3xl rounded-[3rem] border-4 border-dashed border-white/60">
                            <Calendar size={80} className="mx-auto text-slate-200 mb-6 drop-shadow-sm" />
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Belum ada periode penilaian.</h3>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em] mt-3">Silakan buat periode penilaian baru</p>
                        </div>
                    ) : (
                        periods.map((period, idx) => {
                            const expired = isPeriodExpiredByDate(period);
                            const upcoming = isPeriodUpcoming(period);
                            const days = daysUntilEnd(period);
                            const nearDeadline = !expired && !upcoming && days >= 0 && days <= 3;

                            return (
                                <motion.div
                                    key={period.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`bg-white/70 backdrop-blur-3xl rounded-[2.8rem] border border-white/60 p-8 shadow-[0_15px_45px_rgba(0,0,0,0.04)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.06)] transition-all flex flex-col justify-between group h-full relative overflow-hidden ${expired ? 'grayscale-[0.5] opacity-80' : ''}`}
                                >
                                    {nearDeadline && (
                                        <div className="absolute top-0 right-0 px-6 py-2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-3xl shadow-lg animate-pulse">
                                            Urgent Deadline
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="h-12 w-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100 shadow-sm transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                                                <Calendar size={24} strokeWidth={2.5} />
                                            </div>
                                            {getStatusBadge(period)}
                                        </div>

                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-3 group-hover:text-primary-600 transition-colors">{period.name}</h3>
                                            <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <RefreshCw size={10} strokeWidth={3} /> {period.frequency.replace('_', ' ')}
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-slate-600 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 shadow-inner">
                                                <Clock size={16} className="text-primary-400" strokeWidth={2.5} />
                                                <span className="text-xs font-black uppercase tracking-widest font-mono">
                                                    {new Date(period.start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} — {new Date(period.end_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>

                                            {!expired && !upcoming && days >= 0 && (
                                                <div className={`text-[10px] font-black tracking-[0.2em] uppercase px-4 py-2 rounded-xl text-center w-full transition-colors ${nearDeadline ? 'bg-rose-500 text-white animate-bounce' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                    {days === 0 ? 'HARI TERAKHIR' : `SISA ${days} HARI LAGI`}
                                                </div>
                                            )}

                                            {expired && (
                                                <div className="text-[10px] font-black tracking-[0.2em] uppercase px-4 py-2 rounded-xl text-center w-full bg-slate-800 text-white italic">
                                                    SYSTEM LOCKED
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
                                        {expired ? (
                                            <button
                                                onClick={() => handleToggleStatus(period)}
                                                className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 active:scale-95"
                                            >
                                                <RefreshCw size={14} strokeWidth={3} /> Override
                                            </button>
                                        ) : upcoming ? (
                                            <button
                                                onClick={() => handleToggleStatus(period)}
                                                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${period.is_active ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-100' : 'bg-white text-slate-400 border-slate-200'}`}
                                            >
                                                {period.is_active ? <ToggleRight size={20} strokeWidth={2.5} /> : <ToggleLeft size={20} strokeWidth={2.5} />}
                                                <span>{period.is_active ? 'ENABLED' : 'DISABLED'}</span>
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                <ToggleRight size={20} strokeWidth={2.5} />
                                                <span>RUNNING</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => { setEditPeriod(period); setShowEditModal(true); }}
                                                className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                                title="Edit Parameter Periode"
                                            >
                                                <Edit3 size={18} strokeWidth={2.5} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(period)}
                                                className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                title="Archive Sequence"
                                            >
                                                <Trash2 size={18} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Premium Modals */}
            <AnimatePresence>
                {overrideConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => setOverrideConfirm(null)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative bg-white w-full max-w-md rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.4)] overflow-hidden"
                        >
                            <div className="bg-amber-500 px-8 py-8 text-white text-center">
                                <div className="h-20 w-20 rounded-[1.8rem] bg-white text-amber-500 flex items-center justify-center mx-auto mb-6 shadow-xl">
                                    <RefreshCw size={40} strokeWidth={3} className="animate-spin-slow" />
                                </div>
                                <h3 className="text-2xl font-black italic tracking-tight">KONTROL OVERRIDE</h3>
                                <p className="text-amber-100 text-[9px] font-black uppercase tracking-[0.3em] mt-2">Daftar Audit Keamanan Diperlukan</p>
                            </div>
                            <div className="p-10 space-y-6">
                                <p className="text-sm font-bold text-slate-600 text-center leading-relaxed">
                                    Membuka kembali akses pada periode <span className="text-slate-900 font-black italic">"{overrideConfirm.name}"</span> memungkinkan personil kembali mengisi data di luar jadwal reguler.
                                </p>
                                <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle size={14} className="text-amber-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white">RESIKO AKSES</span>
                                    </div>
                                    <ul className="text-[11px] font-medium text-slate-400 space-y-2">
                                        <li className="flex items-start gap-2 italic">✓ Penilaian Peer-to-Peer diaktifkan kembali</li>
                                        <li className="flex items-start gap-2 italic">✓ Data terkirim akan ditandai LATE-SUBMISSION</li>
                                        <li className="flex items-start gap-2 italic">✓ Log Admin segera direkam oleh KERNEL</li>
                                    </ul>
                                </div>
                                <div className="flex flex-col gap-3 pt-4">
                                    <button onClick={handleOverrideReactivate} className="w-full py-5 rounded-2xl bg-amber-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-200 hover:bg-amber-600 transition-all active:scale-95">Yakin, Aktifkan Kembali</button>
                                    <button onClick={() => setOverrideConfirm(null)} className="w-full py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-colors">Batal</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {deleteConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => !deleting && setDeleteConfirm(null)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative bg-white w-full max-w-md rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            <div className="bg-rose-600 p-10 text-white text-center">
                                <div className="h-24 w-24 rounded-[2.2rem] bg-white text-rose-600 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                                    <AlertCircle size={48} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-2xl font-black italic tracking-tight uppercase">ELIMINASI PERIODE</h3>
                                <p className="text-rose-200 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Peringatan: Data akan hancur permanen</p>
                            </div>
                            <div className="p-10 space-y-6">
                                <p className="text-sm font-bold text-slate-500 text-center leading-relaxed italic">
                                    Seluruh data penilaian, komentar, dan relasi grup pada <span className="text-slate-900 not-italic font-black">"{deleteConfirm.name}"</span> akan dihapus dari sistem.
                                </p>
                                <div className="flex flex-col gap-3 pt-6">
                                    <button onClick={confirmDelete} className="w-full py-5 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-rose-600 transition-all active:scale-95 flex items-center justify-center gap-2" disabled={deleting}>
                                        {deleting ? <Loader2 size={18} className="animate-spin" /> : 'YA, HAPUS PERMANEN'}
                                    </button>
                                    <button onClick={() => setDeleteConfirm(null)} className="w-full py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-colors" disabled={deleting}>Gagalkan</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {showEditModal && editPeriod && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => setShowEditModal(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Edit Periode</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Ubah Batas Waktu / Grace Period custom</p>
                                </div>
                                <button onClick={() => setShowEditModal(false)} className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors shadow-sm border border-slate-100">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto custom-scrollbar">
                                <form id="editPeriodForm" onSubmit={handleUpdate} className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nama Periode</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                                            value={editPeriod.name}
                                            onChange={e => setEditPeriod({ ...editPeriod, name: e.target.value })}
                                            placeholder="Contoh: Penilaian Q1 2026"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tanggal Mulai</label>
                                            <input
                                                type="date"
                                                required
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                                                value={typeof editPeriod.start_date === 'string' ? editPeriod.start_date.split('T')[0] : editPeriod.start_date}
                                                onChange={e => setEditPeriod({ ...editPeriod, start_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-primary-500 uppercase tracking-widest ml-2">Tenggat Waktu / Selesai</label>
                                            <input
                                                type="date"
                                                required
                                                className="w-full bg-primary-50 border-2 border-primary-100 rounded-2xl px-5 py-4 text-sm font-bold text-primary-900 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                                                value={typeof editPeriod.end_date === 'string' ? editPeriod.end_date.split('T')[0] : editPeriod.end_date}
                                                onChange={e => setEditPeriod({ ...editPeriod, end_date: e.target.value })}
                                            />
                                            <p className="text-[9px] font-bold text-primary-400 mt-2 px-2">Anda bisa mengubah End Date semaunya untuk memberikan waktu tambahan spesifik.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Frekuensi</label>
                                        <input
                                            type="text"
                                            disabled
                                            className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-500 cursor-not-allowed uppercase"
                                            value={editPeriod.frequency.replace('_', ' ')}
                                        />
                                        <p className="text-[9px] font-bold text-slate-400 mt-2 px-2">*Frekuensi tidak dapat diubah setelah dibuat karena terikat struktur porsi penilaian.</p>
                                    </div>
                                </form>
                            </div>

                            <div className="p-8 border-t border-slate-100 bg-slate-50/50 shrink-0 flex items-center justify-end gap-3">
                                <button type="button" onClick={() => setShowEditModal(false)} className="px-6 py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors text-sm">
                                    Batal
                                </button>
                                <button type="submit" form="editPeriodForm" className="px-8 py-3.5 rounded-xl font-black text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all active:scale-95 text-sm uppercase tracking-widest">
                                    Simpan Perubahan
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => setShowModal(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] overflow-hidden border border-white/40"
                        >
                            <div className="bg-slate-900 px-10 py-10 text-white relative border-b border-white/5">
                                <div className="relative z-10">
                                    <h3 className="text-3xl font-black italic tracking-tight">BUAT PERIODE BARU</h3>
                                    <p className="text-primary-400 text-[9px] font-black uppercase tracking-[0.3em] mt-2">Daftarkan Siklus Penilaian Baru</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 h-12 w-12 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-rose-500 transition-all group active:scale-90">
                                    <X size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="p-10 space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">Nama Periode</label>
                                    <input
                                        type="text"
                                        value={newPeriod.name}
                                        onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-black text-slate-800 transition-all outline-none shadow-inner"
                                        placeholder="Contoh: Triwulan I 2024"
                                        required
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">Frekuensi Penilaian</label>
                                    <select
                                        value={newPeriod.frequency}
                                        onChange={(e) => setNewPeriod({ ...newPeriod, frequency: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-black text-slate-800 transition-all outline-none appearance-none cursor-pointer"
                                        required
                                    >
                                        <option value="monthly">Bulanan (1 bulan)</option>
                                        <option value="quarterly">Triwulan (3 bulan)</option>
                                        <option value="semi_annual">Semester (6 bulan)</option>
                                        <option value="annual">Tahunan (12 bulan)</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">Tanggal Mulai</label>
                                        <input
                                            type="date"
                                            value={newPeriod.start_date}
                                            onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-black text-slate-800 transition-all outline-none shadow-inner"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">Tanggal Selesai</label>
                                        <input
                                            type="date"
                                            value={newPeriod.end_date}
                                            onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-black text-slate-800 transition-all outline-none shadow-inner"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4 pt-4">
                                    <button type="submit" className="w-full py-5 rounded-3xl bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary-100 hover:bg-primary-600 transition-all active:scale-95">Buat Periode</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
};

export default AssessmentPeriodManagement;
