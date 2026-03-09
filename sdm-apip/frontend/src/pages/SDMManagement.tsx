import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { getAllSDM, createSDM, updateSDM, deleteSDM, importSDM } from '../services/sdmService';
import { SDM, Pagination, SDMCreateRequest } from '../types';
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
        unit_kerja: '',
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
            unit_kerja: ''
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
            unit_kerja: sdm.unit_kerja || '',
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
        <Layout title="Database SDM APIP" subtitle="Pusat pengelolaan data Sumber Daya Manusia inspektorat.">
            <div className="space-y-6">
                {/* Statistics Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="card p-4 bg-slate-900 text-white relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Personil</p>
                            <h3 className="text-3xl font-black mt-1 group-hover:scale-110 transition-transform origin-left">{pagination?.total_items || 0}</h3>
                        </div>
                        <Users size={60} className="absolute -right-4 -bottom-4 text-white/5 rotate-12" />
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative z-20">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari NIP, nama lengkap, atau email..."
                            className="form-input pl-11 bg-slate-50 border-slate-200"
                            value={search}
                            onChange={handleSearch}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                        <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex items-center gap-2">
                            <Upload size={18} />
                            <span>Import Excel</span>
                        </button>
                        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
                            <Plus size={18} />
                            <span>Tambah SDM</span>
                        </button>
                    </div>
                </div>

                {/* Table Section */}
                <div className="card overflow-visible">
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-primary-600 transition-colors" onClick={() => handleSort('nip')}>
                                        <div className="flex items-center gap-2">NIP <ArrowUpDown size={12} /></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-primary-600 transition-colors" onClick={() => handleSort('nama')}>
                                        <div className="flex items-center gap-2">Nama <ArrowUpDown size={12} /></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-primary-600 transition-colors" onClick={() => handleSort('pangkat_golongan')}>
                                        <div className="flex items-center gap-2">Pangkat/Golongan <ArrowUpDown size={12} /></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-primary-600 transition-colors" onClick={() => handleSort('pendidikan')}>
                                        <div className="flex items-center gap-2">Pendidikan <ArrowUpDown size={12} /></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-primary-600 transition-colors" onClick={() => handleSort('jabatan')}>
                                        <div className="flex items-center gap-2">Jabatan <ArrowUpDown size={12} /></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-primary-600 transition-colors" onClick={() => handleSort('nomor_hp')}>
                                        <div className="flex items-center gap-2">Nomor HP <ArrowUpDown size={12} /></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-primary-600 transition-colors" onClick={() => handleSort('email')}>
                                        <div className="flex items-center gap-2">Email <ArrowUpDown size={12} /></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={8} className="px-6 py-4"><div className="h-10 bg-slate-50 rounded-lg w-full"></div></td>
                                        </tr>
                                    ))
                                ) : sdmList.map((sdm) => (
                                    <tr key={sdm.id} className="group hover:bg-primary-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm font-bold text-slate-900 tracking-tight">{sdm.nip}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-900">{sdm.nama}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-600">{sdm.pangkat_golongan || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-600">{sdm.pendidikan || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-600">{sdm.jabatan || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                {sdm.nomor_hp ? (
                                                    <>
                                                        <Phone size={12} className="text-slate-400" />
                                                        {sdm.nomor_hp}
                                                    </>
                                                ) : '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                <Mail size={12} className="text-slate-400" />
                                                {sdm.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditModal(sdm)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => { setDeletingSDM(sdm); setShowDeleteModal(true); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.total_pages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                HALAMAN {page} DARI {pagination.total_pages}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                                    .filter(p => Math.abs(p - page) <= 1 || p === 1 || p === pagination.total_pages)
                                    .map((p, i, arr) => (
                                        <React.Fragment key={p}>
                                            {i > 0 && arr[i - 1] !== p - 1 && <span className="text-slate-300">...</span>}
                                            <button
                                                className={`h-9 w-9 rounded-lg text-sm font-bold transition-all ${page === p ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30' : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-400 hover:text-primary-600'}`}
                                                onClick={() => setPage(p)}
                                            >
                                                {p}
                                            </button>
                                        </React.Fragment>
                                    ))
                                }
                                <button
                                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                    disabled={page === pagination.total_pages}
                                    onClick={() => setPage(page + 1)}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="card w-full max-w-2xl animate-slide-up shadow-2xl overflow-hidden">
                        <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between border-b border-white/5 relative">
                            <div className="relative z-10">
                                <h3 className="text-xl font-black">{editingSDM ? 'Edit Profil SDM' : 'Tambah Personil Baru'}</h3>
                                <p className="text-xs text-slate-400 uppercase tracking-widest mt-1 font-bold">Lengkapi data kepegawaian dengan teliti</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all rotate-0 hover:rotate-90">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                            <div className="space-y-1.5">
                                <label className="form-label">NIP (18 Digit)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Masukkan NIP"
                                    value={formData.nip}
                                    onChange={(e) => setFormData({ ...formData, nip: e.target.value.replace(/\D/g, '').slice(0, 18) })}
                                    disabled={!!editingSDM || saving}
                                    maxLength={18}
                                />
                                {formErrors.nip && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{formErrors.nip}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="form-label">Nama Lengkap</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Nama Sesuai SK"
                                    value={formData.nama}
                                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                />
                                {formErrors.nama && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{formErrors.nama}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="form-label">Pangkat / Golongan</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Contoh: Penata / III-c"
                                    value={formData.pangkat_golongan}
                                    onChange={(e) => setFormData({ ...formData, pangkat_golongan: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="form-label">Pendidikan</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Contoh: S1 Akuntansi"
                                    value={formData.pendidikan}
                                    onChange={(e) => setFormData({ ...formData, pendidikan: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="form-label">Jabatan Fungsional</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Contoh: Auditor Ahli Muda"
                                    value={formData.jabatan}
                                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="form-label">Nomor HP</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Contoh: 08123456789"
                                    value={formData.nomor_hp}
                                    onChange={(e) => setFormData({ ...formData, nomor_hp: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="Email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                                {formErrors.email && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{formErrors.email}</p>}
                            </div>


                        </div>

                        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex gap-3">
                            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1" disabled={saving}>Batal</button>
                            <button onClick={handleSubmit} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
                                {saving ? <Loader2 size={18} className="animate-spin" /> : editingSDM ? 'Perbarui Data' : 'Simpan Personil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && deletingSDM && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="card w-full max-w-md animate-slide-up shadow-2xl">
                        <div className="p-8 text-center">
                            <div className="h-20 w-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={40} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">Hapus Data SDM?</h3>
                            <p className="text-slate-500 mt-2 leading-relaxed">
                                Anda akan menghapus data <strong className="text-slate-900">{deletingSDM.nama}</strong>. Pengguna terkait juga akan kehilangan akses sistem.
                            </p>
                            <div className="mt-8 flex gap-3">
                                <button onClick={() => setShowDeleteModal(false)} className="btn-secondary flex-1" disabled={saving}>Batal</button>
                                <button onClick={handleDelete} className="btn-danger bg-red-600 hover:bg-red-700 text-white flex-1 py-3 rounded-xl font-bold shadow-lg shadow-red-200 transition-all active:scale-95" disabled={saving}>
                                    {saving ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Ya, Hapus Data'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default SDMManagement;
