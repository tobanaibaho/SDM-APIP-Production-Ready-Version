import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { getAllSDM, createSDM, updateSDM, deleteSDM, importSDM } from '../services/sdmService';
import { SDM, Pagination, SDMCreateRequest } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    X,
    ChevronLeft,
    ChevronRight,
    Loader2,
    AlertTriangle,
    Users,
    Upload,
    ArrowUpDown,
    Mail,
    Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SDMManagement: React.FC = () => {
    const [sdmList, setSdmList] = useState<SDM[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingSDM, setEditingSDM] = useState<SDM | null>(null);
    const [deletingSDM, setDeletingSDM] = useState<SDM | null>(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState<SDMCreateRequest>({
        nip: '',
        nama: '',
        email: '',
        jabatan: '',
        pangkat_golongan: '',
        pendidikan: '',
        nomor_hp: '',
        unit_kerja: 'Inspektorat',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchData();
    }, [page, search, sortBy, sortOrder]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await getAllSDM(page, 10, search, sortBy, sortOrder);
            setSdmList(response.data || []);
            setPagination(response.pagination);
        } catch (error) {
            toast.error('Gagal memuat data SDM');
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const openCreateModal = () => {
        setEditingSDM(null);
        setFormData({
            nip: '', nama: '', email: '',
            jabatan: '', pangkat_golongan: '', pendidikan: '', nomor_hp: '',
            unit_kerja: 'Inspektorat'
        });
        setFormErrors({});
        setShowModal(true);
    };

    const openEditModal = (sdm: SDM) => {
        setEditingSDM(sdm);
        setFormData({
            nip: sdm.nip,
            nama: sdm.nama,
            email: sdm.email,
            jabatan: sdm.jabatan || '',
            pangkat_golongan: sdm.pangkat_golongan || '',
            pendidikan: sdm.pendidikan || '',
            nomor_hp: sdm.nomor_hp || '',
            unit_kerja: sdm.unit_kerja || 'Inspektorat',
        });
        setFormErrors({});
        setShowModal(true);
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!editingSDM && !formData.nip) {
            errors.nip = 'NIP wajib diisi';
        } else if (!editingSDM && !/^\d{18}$/.test(formData.nip)) {
            errors.nip = 'NIP harus 18 digit';
        }
        if (!formData.nama) errors.nama = 'Nama wajib diisi';
        if (!formData.email) {
            errors.email = 'Email wajib diisi';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Format email tidak valid';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
            if (editingSDM) {
                await updateSDM(editingSDM.id, formData);
                toast.success('Data SDM berhasil diperbarui');
            } else {
                await createSDM(formData);
                toast.success('Data SDM berhasil ditambahkan');
            }
            setShowModal(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal menyimpan data');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingSDM) return;
        setSaving(true);
        try {
            await deleteSDM(deletingSDM.id);
            toast.success('Data SDM berhasil dihapus');
            setShowDeleteModal(false);
            setDeletingSDM(null);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal menghapus data');
        } finally {
            setSaving(false);
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const toastId = toast.loading('Mengimpor data...');
        try {
            const result = await importSDM(file);
            toast.dismiss(toastId);
            toast.success(`Berhasil mengimpor ${result.success_count} data SDM`);
            fetchData();
        } catch (error: any) {
            toast.dismiss(toastId);
            toast.error(error.response?.data?.error || 'Gagal mengimpor data');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <Layout title="Database SDM APIP" subtitle="Pusat pengelolaan master data kepegawaian Inspektorat Utama.">
            <div className="space-y-8 animate-fade-in">
                {/* ═══════════════════════════════════════════
                    Highlights Bento
                ═══════════════════════════════════════════ */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="md:col-span-4 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl group border border-slate-800"
                    >
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                                <Users size={24} className="text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50 mb-1">Total Personil Terdaftar</p>
                                <h3 className="text-5xl font-black tracking-tighter group-hover:scale-105 transition-transform origin-left duration-500">
                                    {pagination?.total_items || 0}
                                </h3>
                            </div>
                        </div>
                        <Users size={160} className="absolute -right-12 -bottom-12 text-white/5 rotate-12 transition-transform duration-1000 group-hover:rotate-0" />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="md:col-span-8 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/60 shadow-[0_10px_40px_rgb(0,0,0,0.04)] flex flex-col justify-center"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="space-y-2">
                                <h4 className="text-xl font-black text-slate-900 tracking-tight">Manajemen Data SDM</h4>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-md">Data SDM disinkronisasi langsung dengan sistem penilaian 360 derajat. Pastikan NIP dan Email valid untuk kelancaran akses sistem.</p>
                            </div>
                            <div className="flex gap-4 shrink-0">
                                <div className="text-center px-6 py-4 rounded-3xl bg-slate-100 border border-slate-200 shadow-inner">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Update Status</p>
                                    <p className="text-xs font-black text-primary-600">Terverifikasi</p>
                                </div>
                                <div className="text-center px-6 py-4 rounded-3xl bg-primary-50 border border-primary-100 shadow-inner">
                                    <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest mb-1">Integritas</p>
                                    <p className="text-xs font-black text-primary-700">100% Valid</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Toolbar Glass Bento */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center bg-white/70 backdrop-blur-3xl p-5 rounded-[2.2rem] border border-white/60 shadow-[0_10px_40px_rgb(0,0,0,0.05)]">
                    <div className="relative flex-1 group">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari personil (NIP, Nama, atau Email)..."
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-inner"
                            value={search}
                            onChange={handleSearch}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2.5 px-6 py-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                        >
                            <Upload size={18} className="text-primary-500" strokeWidth={2.5} />
                            <span>Import Master</span>
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-slate-900 border border-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-primary-600 hover:border-primary-600 transition-all shadow-xl shadow-primary-100 active:scale-95"
                        >
                            <Plus size={18} strokeWidth={3} />
                            <span>Tambah Personil</span>
                        </button>
                    </div>
                </div>

                {/* Table Bento Container */}
                <div className="bg-white/70 backdrop-blur-3xl rounded-[2.5rem] border border-white/60 shadow-[0_20px_50px_rgb(0,0,0,0.05)] overflow-hidden">
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-white/40">
                                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 cursor-pointer hover:text-primary-600 transition-colors w-48" onClick={() => handleSort('nip')}>
                                        <div className="flex items-center justify-between">Identitas Pegawai <ArrowUpDown size={12} className="opacity-50" /></div>
                                    </th>
                                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 cursor-pointer hover:text-primary-600 transition-colors" onClick={() => handleSort('nama')}>
                                        <div className="flex items-center justify-between">Nama Lengkap <ArrowUpDown size={12} className="opacity-50" /></div>
                                    </th>
                                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 cursor-pointer hover:text-primary-600 transition-colors" onClick={() => handleSort('pangkat_golongan')}>
                                        <div className="flex items-center justify-between">Kepangkatan <ArrowUpDown size={12} className="opacity-50" /></div>
                                    </th>
                                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 cursor-pointer hover:text-primary-600 transition-colors" onClick={() => handleSort('jabatan')}>
                                        <div className="flex items-center justify-between">Jabatan & Unit <ArrowUpDown size={12} className="opacity-50" /></div>
                                    </th>
                                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 cursor-pointer hover:text-primary-600 transition-colors" onClick={() => handleSort('nomor_hp')}>
                                        <div className="flex items-center justify-between">Akses Kontak <ArrowUpDown size={12} className="opacity-50" /></div>
                                    </th>
                                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right w-24">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/50">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="px-6 py-8"><div className="h-5 bg-slate-100 rounded-full w-full opacity-50"></div></td>
                                        </tr>
                                    ))
                                ) : sdmList.map((sdm) => (
                                    <tr key={sdm.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                                        <td className="px-6 py-6">
                                            <div className="font-mono text-[10px] font-black text-primary-700 bg-primary-50 inline-block px-3 py-1.5 rounded-xl tracking-widest border border-primary-100 shadow-sm">{sdm.nip}</div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="font-black text-slate-900 text-[13px] leading-tight tracking-tight">{sdm.nama}</div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1 opacity-60">{sdm.pangkat_golongan || '-'}</p>
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className="text-[11px] font-black text-slate-700 bg-white border border-slate-100 px-3 py-1.5 rounded-xl shadow-sm">{sdm.pendidikan || 'Akademik'}</span>
                                        </td>
                                        <td className="px-6 py-6 max-w-[220px]">
                                            <span className="text-[12px] font-black text-slate-800 leading-snug block">{sdm.jabatan || '-'}</span>
                                            <span className="text-[10px] text-primary-500 font-black uppercase tracking-widest mt-1 block opacity-80">{sdm.unit_kerja || 'Inspektorat'}</span>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-600">
                                                    <Mail size={12} className="text-primary-400 shrink-0" strokeWidth={3} />
                                                    <span className="truncate max-w-[140px] italic">{sdm.email}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-600">
                                                    <Phone size={12} className="text-primary-400 shrink-0" strokeWidth={3} />
                                                    <span>{sdm.nomor_hp || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                                                <button onClick={() => openEditModal(sdm)} className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-primary-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100 shadow-none hover:shadow-lg" title="Edit Data">
                                                    <Edit2 size={16} strokeWidth={2.5} />
                                                </button>
                                                <button onClick={() => { setDeletingSDM(sdm); setShowDeleteModal(true); }} className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100 shadow-none hover:shadow-lg" title="Hapus Data">
                                                    <Trash2 size={16} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Glass */}
                    {pagination && pagination.total_pages > 1 && (
                        <div className="px-8 py-6 border-t border-slate-100/50 flex items-center justify-between bg-slate-50/30">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Halaman {page} / {pagination.total_pages}</span>
                            <div className="flex items-center gap-3">
                                <button
                                    className="h-10 w-10 flex items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95 shadow-sm"
                                    disabled={page === 1}
                                    onClick={() => { setPage(page - 1); window.scrollTo(0, 0); }}
                                >
                                    <ChevronLeft size={20} strokeWidth={2.5} />
                                </button>
                                {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                                    .filter(p => Math.abs(p - page) <= 1 || p === 1 || p === pagination.total_pages)
                                    .map((p, i, arr) => (
                                        <React.Fragment key={p}>
                                            {i > 0 && arr[i - 1] !== p - 1 && <span className="text-slate-300 font-black">···</span>}
                                            <button
                                                className={`h-10 w-10 rounded-2xl text-xs font-black transition-all ${page === p ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-white border border-slate-100 text-slate-500 hover:border-primary-400 hover:text-primary-600 shadow-sm'}`}
                                                onClick={() => setPage(p)}
                                            >
                                                {p}
                                            </button>
                                        </React.Fragment>
                                    ))
                                }
                                <button
                                    className="h-10 w-10 flex items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95 shadow-sm"
                                    disabled={page === pagination.total_pages}
                                    onClick={() => { setPage(page + 1); window.scrollTo(0, 0); }}
                                >
                                    <ChevronRight size={20} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal Premium */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0"
                            onClick={() => !saving && setShowModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="relative bg-white w-full max-w-3xl rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.35)] overflow-hidden"
                        >
                            <div className="bg-slate-900 px-10 py-10 text-white relative flex items-center justify-between border-b border-white/5">
                                <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12">
                                    <Plus size={100} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-3xl font-black italic tracking-tight">{editingSDM ? 'Edit Profil Pegawai' : 'Registrasi Personil'}</h3>
                                    <p className="text-primary-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Sinkronisasi Basis Data Master APIP</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="relative z-10 h-14 w-14 flex items-center justify-center rounded-[1.5rem] bg-white/10 text-white hover:bg-rose-500 transition-all active:scale-90">
                                    <X size={24} strokeWidth={3} />
                                </button>
                            </div>

                            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">Identitas NIP (18 DIGIT)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-black text-slate-800 transition-all outline-none shadow-inner"
                                        placeholder="000000000000000000"
                                        value={formData.nip}
                                        onChange={(e) => setFormData({ ...formData, nip: e.target.value.replace(/\D/g, '').slice(0, 18) })}
                                        disabled={!!editingSDM || saving}
                                    />
                                    {formErrors.nip && <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest mt-1.5 pl-1 italic">{formErrors.nip}</p>}
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">Nama Lengkap Sesuai SK</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-black text-slate-800 transition-all outline-none shadow-inner"
                                        placeholder="Masukkan Nama Lengkap"
                                        value={formData.nama}
                                        onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                    />
                                    {formErrors.nama && <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest mt-1.5 pl-1 italic">{formErrors.nama}</p>}
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">Pangkat / Golongan</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-black text-slate-800 transition-all outline-none shadow-inner"
                                        placeholder="Contoh: Penata / III-c"
                                        value={formData.pangkat_golongan}
                                        onChange={(e) => setFormData({ ...formData, pangkat_golongan: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">Pendidikan Terakhir</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-black text-slate-800 transition-all outline-none shadow-inner"
                                        placeholder="Contoh: S1 Hukum"
                                        value={formData.pendidikan}
                                        onChange={(e) => setFormData({ ...formData, pendidikan: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">Jabatan Struktural/Fungsional</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-black text-slate-800 transition-all outline-none shadow-inner"
                                        placeholder="Contoh: Auditor Pertama"
                                        value={formData.jabatan}
                                        onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">Nomor Seluler (WhatsApp)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-black text-slate-800 transition-all outline-none shadow-inner"
                                        placeholder="08xxxxxxxxxx"
                                        value={formData.nomor_hp}
                                        onChange={(e) => setFormData({ ...formData, nomor_hp: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-3 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">E-Mail Resmi Kedinasan</label>
                                    <input
                                        type="email"
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-black text-slate-800 transition-all outline-none shadow-inner"
                                        placeholder="account@domain.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                    {formErrors.email && <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest mt-1.5 pl-1 italic">{formErrors.email}</p>}
                                </div>
                            </div>

                            <div className="px-10 py-10 bg-slate-50 flex gap-5 border-t border-slate-100">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-5 rounded-[1.8rem] bg-white border-2 border-slate-200 text-slate-600 font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-all" disabled={saving}>Batalkan</button>
                                <button onClick={handleSubmit} className="flex-[2] py-5 rounded-[1.8rem] bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:bg-primary-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95" disabled={saving}>
                                    {saving ? <Loader2 size={24} className="animate-spin" /> : editingSDM ? 'Konfirmasi Perubahan' : 'Daftarkan Personil Baru'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Premium */}
            <AnimatePresence>
                {showDeleteModal && deletingSDM && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => !saving && setShowDeleteModal(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative bg-white w-full max-w-md rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            <div className="p-10 text-center">
                                <div className="h-24 w-24 rounded-[2rem] bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-8 shadow-inner">
                                    <AlertTriangle size={48} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Hapus Data SDM?</h3>
                                <p className="text-sm text-slate-500 font-bold mt-3 leading-relaxed">
                                    Penghapusan data <strong className="text-rose-600">{deletingSDM.nama}</strong> bersifat permanen. Personil akan segera kehilangan akses ke seluruh infrastruktur digital APIP.
                                </p>
                                <div className="mt-10 flex flex-col gap-3">
                                    <button onClick={handleDelete} className="w-full py-5 rounded-2xl bg-rose-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center gap-2" disabled={saving}>
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : 'Sangat Yakin, Hapus Data'}
                                    </button>
                                    <button onClick={() => setShowDeleteModal(false)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-colors" disabled={saving}>Batalkan Proses</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
};

export default SDMManagement;
