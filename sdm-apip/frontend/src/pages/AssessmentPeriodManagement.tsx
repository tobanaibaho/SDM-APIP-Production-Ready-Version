import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import assessmentService, { AssessmentPeriod } from '../services/assessmentService';
import { toast } from 'react-hot-toast';
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
    Info
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

    const handleToggleStatus = async (period: AssessmentPeriod) => {
        const expiredByDate = isPeriodExpiredByDate(period);

        // Jika periode sudah expired dan Admin ingin mengaktifkan kembali → tampilkan konfirmasi
        if (!period.is_active && expiredByDate) {
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
            return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700"><Lock size={10} />Berakhir</span>;
        }
        if (isPeriodUpcoming(period)) {
            return <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">Akan Datang</span>;
        }
        if (period.is_active) {
            return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700"><span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />Berjalan</span>;
        }
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">Nonaktif</span>;
    };

    return (
        <Layout
            title="Periode Penilaian"
            subtitle="Kelola rentang waktu penilaian peer-to-peer 360 derajat"
        >
            <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex justify-end">
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Buat Periode Baru
                    </button>
                </div>

                {/* Info Banner */}
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm">
                    <Info size={18} className="shrink-0 mt-0.5" />
                    <p>
                        <strong>Sistem Auto-Lock aktif:</strong> Periode akan otomatis terkunci saat melewati <em>Tanggal Selesai</em> tanpa perlu tindakan manual.
                        Anda tetap dapat mengaktifkan kembali periode yang sudah berakhir sebagai <strong>Override Darurat</strong> jika dibutuhkan.
                    </p>
                </div>

                {/* Periods List */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="card p-6 animate-pulse">
                                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                                <div className="h-3 bg-slate-100 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                            </div>
                        ))
                    ) : periods.length === 0 ? (
                        <div className="col-span-full py-12 text-center card bg-slate-50 border-dashed">
                            <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900">Belum ada periode</h3>
                            <p className="text-slate-500">Klik tombol "Buat Periode Baru" untuk memulai.</p>
                        </div>
                    ) : (
                        periods.map((period) => {
                            const expired = isPeriodExpiredByDate(period);
                            const upcoming = isPeriodUpcoming(period);
                            const days = daysUntilEnd(period);
                            const nearDeadline = !expired && !upcoming && days >= 0 && days <= 3;

                            return (
                                <div key={period.id} className={`card group relative transition-all ${
                                    expired ? 'opacity-75 border-red-100' :
                                    nearDeadline ? 'border-amber-200 shadow-amber-100' : ''
                                }`}>
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                                <Calendar size={24} />
                                            </div>
                                            {getStatusBadge(period)}
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-1">{period.name}</h3>
                                        <div className="space-y-2 text-sm text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} />
                                                <span>{new Date(period.start_date).toLocaleDateString('id-ID')} — {new Date(period.end_date).toLocaleDateString('id-ID')}</span>
                                            </div>
                                            {/* Countdown / info */}
                                            {!expired && !upcoming && days >= 0 && (
                                                <div className={`flex items-center gap-1.5 text-xs font-bold ${
                                                    nearDeadline ? 'text-amber-600' : 'text-slate-400'
                                                }`}>
                                                    <Clock size={12} />
                                                    {days === 0 ? 'Berakhir hari ini!' : `Sisa ${days} hari`}
                                                </div>
                                            )}
                                            {expired && (
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-red-500">
                                                    <Lock size={12} />
                                                    Dikunci otomatis oleh sistem
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                                            {/* Override button — konteks berbeda tiap kondisi */}
                                            {expired ? (
                                                <button
                                                    onClick={() => handleToggleStatus(period)}
                                                    className="flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors"
                                                    title="Aktifkan kembali sebagai override darurat"
                                                >
                                                    <RefreshCw size={16} /> Aktifkan Kembali
                                                </button>
                                            ) : upcoming ? (
                                                <button
                                                    onClick={() => handleToggleStatus(period)}
                                                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${period.is_active ? 'text-primary-600' : 'text-slate-400'}`}
                                                >
                                                    {period.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                                    {period.is_active ? 'Akan Aktif' : 'Nonaktif'}
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                                                    <ToggleRight size={24} />
                                                    <span>Berjalan Otomatis</span>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handleDelete(period)}
                                                className="text-slate-400 hover:text-red-600 transition-colors"
                                                title="Hapus Periode"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Override Reactivation Confirmation Modal */}
            {overrideConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="card w-full max-w-md animate-slide-up">
                        <div className="px-6 py-4 border-b border-amber-100 flex items-center gap-3">
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                <RefreshCw size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Override Darurat</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-slate-700">
                                Periode <span className="font-semibold text-slate-900">"{overrideConfirm.name}"</span> sudah <span className="text-red-600 font-bold">melewati tanggal berakhir</span> dan dikunci otomatis oleh sistem.
                            </p>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <p className="text-sm font-semibold text-amber-800">⚠️ Dengan mengaktifkan kembali:</p>
                                <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                                    <li>Pegawai dapat kembali mengisi penilaian pada periode ini</li>
                                    <li>Sistem akan mengunci kembali otomatis hanya jika end_date diubah</li>
                                    <li>Tindakan ini tercatat di audit log</li>
                                </ul>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setOverrideConfirm(null)}
                                    className="btn-secondary flex-1"
                                >Batal</button>
                                <button
                                    onClick={handleOverrideReactivate}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors"
                                >
                                    <RefreshCw size={16} /> Ya, Aktifkan Kembali
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="card w-full max-w-md animate-slide-up">
                        <div className="px-6 py-4 border-b border-red-100 flex items-center gap-3">
                            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                <AlertCircle size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Hapus Periode Penilaian</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-slate-700">
                                Anda akan menghapus periode <span className="font-semibold text-slate-900">"{deleteConfirm.name}"</span>.
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                                <p className="text-sm font-semibold text-red-800">⚠️ Peringatan — Tindakan ini akan menghapus secara permanen:</p>
                                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                                    <li>Semua <strong>relasi penilaian</strong> yang terdaftar pada periode ini</li>
                                    <li>Semua <strong>data penilaian</strong> (nilai & komentar) yang sudah disubmit</li>
                                    <li>Periode itu sendiri</li>
                                </ul>
                                <p className="text-xs text-red-600 mt-2 font-medium">Tindakan ini tidak dapat dibatalkan.</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setDeleteConfirm(null)}
                                    disabled={deleting}
                                    className="btn-secondary flex-1"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmDelete}
                                    disabled={deleting}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {deleting ? (
                                        <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Menghapus...</>
                                    ) : (
                                        <><Trash2 size={16} />Ya, Hapus Permanen</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="card w-full max-w-md animate-slide-up">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Buat Periode Baru</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><Plus size={24} className="rotate-45" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="form-label">Nama Periode</label>
                                <input
                                    type="text"
                                    value={newPeriod.name}
                                    onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                                    className="form-input"
                                    placeholder="Contoh: Triwulan I 2024"
                                    required
                                />
                            </div>
                            <div>
                                <label className="form-label">Frekuensi Penilaian</label>
                                <select
                                    value={newPeriod.frequency}
                                    onChange={(e) => setNewPeriod({ ...newPeriod, frequency: e.target.value })}
                                    className="form-input"
                                    required
                                >
                                    <option value="monthly">Bulanan (1 bulan)</option>
                                    <option value="quarterly">Triwulan (3 bulan)</option>
                                    <option value="semi_annual">Semester (6 bulan)</option>
                                    <option value="annual">Tahunan (12 bulan)</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">
                                    User akan melakukan penilaian setiap bulan dalam periode ini
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Tanggal Mulai</label>
                                    <input
                                        type="date"
                                        value={newPeriod.start_date}
                                        onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })}
                                        className="form-input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Tanggal Selesai</label>
                                    <input
                                        type="date"
                                        value={newPeriod.end_date}
                                        onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })}
                                        className="form-input"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-3 flex gap-3 text-amber-800 text-xs">
                                <AlertCircle size={16} className="shrink-0" />
                                <p>Pastikan rentang tanggal tidak tumpang tindih dengan periode aktif lainnya untuk menghindari kebingungan user.</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
                                <button type="submit" className="btn-primary flex-1">Simpan Periode</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default AssessmentPeriodManagement;
