import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import groupService from '../services/groupService';
import { Group, GroupDetail } from '../types';
import userService from '../services/userService';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Plus, Search, Trash2, X,
    LayoutGrid, List, Loader2, ChevronRight,
    ArrowUpDown, ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import assessmentService, { AssessmentPeriod } from '../services/assessmentService';
import GroupMemberModal from '../components/GroupMemberModal';
import GroupRelationsTab from '../components/GroupRelationsTab';

const GroupManagement: React.FC = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);

    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [formData, setFormData] = useState({ name: '', description: '' });

    const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
    const [selectedRole, setSelectedRole] = useState<'Dalnis' | 'KT' | 'AT'>('AT');

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

    const [activeTab, setActiveTab] = useState<'members' | 'relations'>('members');
    const [periods, setPeriods] = useState<AssessmentPeriod[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<number | ''>('');
    const [groupRelations, setGroupRelations] = useState<any[]>([]);
    const [newRelation, setNewRelation] = useState({
        evaluator_id: '' as number | '',
        target_user_id: '' as number | '',
        relation_type: 'Peer' as 'Atasan' | 'Peer' | 'Bawahan',
        target_position: 'Peer' as 'Atasan' | 'Peer' | 'Bawahan',
    });
    const [showRelationDeleteModal, setShowRelationDeleteModal] = useState(false);
    const [relationToRemoveIndex, setRelationToRemoveIndex] = useState<number | null>(null);

    useEffect(() => { fetchGroups(); fetchUsers(); fetchPeriods(); }, [sortBy, sortOrder, showArchived]);

    useEffect(() => {
        if (showDetailModal && selectedGroup && selectedPeriodId && activeTab === 'relations') fetchRelations();
    }, [selectedPeriodId, activeTab, showDetailModal]);

    const fetchPeriods = async () => {
        try {
            const data = await assessmentService.getAllPeriods();
            setPeriods(data || []);
            const active = data?.find((p: AssessmentPeriod) => p.is_active);
            if (active) setSelectedPeriodId(active.id);
        } catch { /* ignore */ }
    };

    const fetchRelations = async () => {
        if (!selectedGroup || !selectedPeriodId) return;
        try {
            const data = await groupService.getGroupRelations(selectedGroup.group.id, Number(selectedPeriodId));
            setGroupRelations(data);
        } catch { /* ignore */ }
    };

    const fetchGroups = async () => {
        try {
            setLoading(true);
            setGroups(await groupService.getAllGroups(sortBy, sortOrder, showArchived));
        } catch { toast.error('Gagal memuat data grup'); }
        finally { setLoading(false); }
    };

    const fetchUsers = async () => {
        try {
            const res = await userService.getAllUsers(1, 1000);
            setUsers(res.data.filter((u: any) => {
                const r = u.role?.toLowerCase() || '';
                const j = u.jabatan?.toLowerCase() || '';
                return r !== 'admin' && r !== 'super admin' && u.id !== 1 && !j.includes('inspektur');
            }));
        } catch { /* ignore */ }
    };

    const handleSort = (col: string) => {
        if (sortBy === col) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortOrder('asc'); }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        try {
            await groupService.createGroup(formData);
            setShowCreateModal(false); setFormData({ name: '', description: '' });
            fetchGroups(); toast.success('Grup berhasil dibuat');
        } catch (err: any) { toast.error(err.response?.data?.error || err.response?.data?.message || 'Gagal membuat grup'); }
        finally { setSaving(false); }
    };

    const handleDelete = (group: Group, e?: React.MouseEvent) => { e?.stopPropagation(); setGroupToDelete(group); setShowDeleteModal(true); };

    const confirmDelete = async () => {
        if (!groupToDelete) return;
        try {
            await groupService.deleteGroup(groupToDelete.id);
            setShowDeleteModal(false); setGroupToDelete(null); fetchGroups(); toast.success('Grup berhasil dihapus');
        } catch { toast.error('Gagal menghapus grup'); }
    };

    const openDetail = async (id: number) => {
        try { setSelectedGroup(await groupService.getGroupById(id)); setShowDetailModal(true); }
        catch { toast.error('Gagal memuat detail grup'); }
    };

    const handleAssignUser = async () => {
        if (!selectedGroup || !selectedUserId) return; setSaving(true);
        try {
            await groupService.assignUserToGroup(selectedGroup.group.id, Number(selectedUserId), selectedRole);
            setSelectedGroup(await groupService.getGroupById(selectedGroup.group.id));
            fetchGroups(); setSelectedUserId(''); setSelectedRole('AT'); toast.success('Anggota berhasil ditambahkan');
        } catch (err: any) { toast.error(err.response?.data?.error || err.response?.data?.message || 'Gagal menambahkan anggota'); }
        finally { setSaving(false); }
    };

    const handleRemoveUser = async (userId: number) => {
        if (!selectedGroup || !window.confirm('Keluarkan pengguna dari grup?')) return;
        try {
            await groupService.removeUserFromGroup(selectedGroup.group.id, userId);
            setSelectedGroup(await groupService.getGroupById(selectedGroup.group.id));
            fetchGroups(); toast.success('Anggota berhasil dikeluarkan');
        } catch { toast.error('Gagal mengeluarkan anggota'); }
    };

    const handleAddRelation = async () => {
        if (!selectedGroup || !selectedPeriodId || !newRelation.evaluator_id || !newRelation.target_user_id) return;
        if (newRelation.evaluator_id === newRelation.target_user_id) { toast.error('Evaluator dan Target tidak boleh sama'); return; }
        setSaving(true);
        try {
            await groupService.createGroupRelations(selectedGroup.group.id, Number(selectedPeriodId), [...groupRelations, { ...newRelation }]);
            fetchRelations(); setNewRelation({ evaluator_id: '', target_user_id: '', relation_type: 'Peer', target_position: 'Peer' });
            toast.success('Relasi berhasil ditambahkan');
        } catch (err: any) { toast.error(err.response?.data?.message || 'Gagal menyimpan relasi'); }
        finally { setSaving(false); }
    };

    const handleRemoveRelation = (index: number) => { setRelationToRemoveIndex(index); setShowRelationDeleteModal(true); };

    const confirmRemoveRelation = async () => {
        if (!selectedGroup || !selectedPeriodId || relationToRemoveIndex === null) return;
        setSaving(true);
        try {
            await groupService.createGroupRelations(selectedGroup.group.id, Number(selectedPeriodId), groupRelations.filter((_, i) => i !== relationToRemoveIndex));
            fetchRelations(); toast.success('Relasi berhasil dihapus');
        } catch { toast.error('Gagal menghapus relasi'); }
        finally { setSaving(false); setShowRelationDeleteModal(false); setRelationToRemoveIndex(null); }
    };

    const handleClearAllRelations = async () => {
        if (!selectedGroup || !selectedPeriodId || !window.confirm('Hapus SEMUA relasi untuk periode ini?')) return;
        setSaving(true);
        try {
            await groupService.createGroupRelations(selectedGroup.group.id, Number(selectedPeriodId), []);
            fetchRelations(); toast.success('Semua relasi berhasil dihapus');
        } catch { toast.error('Gagal mengosongkan relasi'); }
        finally { setSaving(false); }
    };

    const filteredGroups = (groups || []).filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getUserName = (id: number) => selectedGroup?.members?.find(m => m.id === id)?.name || 'Unknown';

    return (
        <Layout title="Organisasi Tim" subtitle="Manajemen tim kerja dan struktur relasi penilaian.">
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
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50 mb-1">Total Grup Terdaftar</p>
                                <h3 className="text-5xl font-black tracking-tighter group-hover:scale-105 transition-transform origin-left duration-500">
                                    {(groups || []).length}
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
                                <h4 className="text-xl font-black text-slate-900 tracking-tight">Tata Kelola Tim</h4>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-md">Kelola unit kerja Inspektorat untuk mendefinisikan relasi evaluator dan target penilaian secara tepat dan akurat.</p>
                            </div>
                            <div className="flex gap-4 shrink-0">
                                <button onClick={() => setShowCreateModal(true)} className="px-8 py-5 rounded-[1.8rem] bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center gap-3">
                                    <Plus size={20} strokeWidth={3} /> Buat Grup Baru
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Toolbar Glass Bento */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center bg-white/70 backdrop-blur-3xl p-5 rounded-[2.2rem] border border-white/60 shadow-[0_10px_40px_rgb(0,0,0,0.05)]">
                    <div className="relative flex-1 group">
                        <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari Tim kerja (Nama atau Deskripsi)..."
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3 px-3">
                        <label className="flex items-center cursor-pointer gap-3 group px-4 py-3 rounded-2xl hover:bg-slate-100/50 transition-colors" title="Tampilkan Grup yang Diarsipkan">
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                                <div className={`block w-11 h-6 rounded-full transition-colors ${showArchived ? 'bg-rose-500' : 'bg-slate-200'}`}></div>
                                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showArchived ? 'transform translate-x-5' : ''}`}></div>
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Arsip</span>
                        </label>

                        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                            {(['list', 'grid'] as const).map(mode => (
                                <button
                                    key={mode}
                                    className={`p-2.5 rounded-xl transition-all ${viewMode === mode ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    onClick={() => setViewMode(mode)}
                                >
                                    {mode === 'list' ? <List size={20} /> : <LayoutGrid size={20} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content Logic */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[1, 2, 3].map(i => <div key={i} className="bg-white/50 h-56 rounded-[2.5rem] animate-pulse border border-white/50" />)}
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-32 text-center bg-white/40 backdrop-blur-3xl rounded-[3rem] border-4 border-dashed border-white/60"
                    >
                        <Users size={80} className="mx-auto text-slate-200 mb-6 drop-shadow-sm" />
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight italic">Unit Tidak Ditemukan.</h3>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em] mt-3">Sesuaikan parameter pencarian atau reset filter</p>
                    </motion.div>
                ) : viewMode === 'list' ? (
                    <div className="bg-white/70 backdrop-blur-3xl rounded-[2.5rem] border border-white/60 shadow-[0_20px_50px_rgb(0,0,0,0.05)] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-white/40">
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('name')}>
                                            <div className="flex items-center gap-2">Identitas Unit <ArrowUpDown size={12} className="opacity-50" /></div>
                                        </th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Misi & Deskripsi</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center" onClick={() => handleSort('user_count')}>
                                            <div className="flex items-center justify-center gap-2">Kekuatan Personil <ArrowUpDown size={12} className="opacity-50" /></div>
                                        </th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Manajemen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/50">
                                    {filteredGroups.map((group, idx) => (
                                        <motion.tr
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={group.id}
                                            onClick={() => openDetail(group.id)}
                                            className="group hover:bg-slate-50/50 cursor-pointer transition-all duration-300"
                                        >
                                            <td className="px-8 py-6 font-black text-slate-900">
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center border shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${group.is_archived ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}><Users size={20} strokeWidth={2.5} /></div>
                                                    <div>
                                                        <p className="text-[14px] tracking-tight">{group.name}</p>
                                                        {group.is_archived && <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 mt-1 inline-block animate-pulse">TERMINATED</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-[13px] text-slate-500 font-medium max-w-xs">{group.description || <span className="italic opacity-30">Tidak ada deskripsi misi terdaftar.</span>}</td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="inline-flex items-center rounded-2xl bg-white border border-slate-100 px-4 py-2 text-[11px] font-black text-slate-700 shadow-sm group-hover:shadow-md transition-shadow group-hover:bg-indigo-50 group-hover:border-indigo-100 group-hover:text-indigo-700">{group.user_count || 0} PERSONIL</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                {!group.is_archived && (
                                                    <button onClick={e => handleDelete(group, e)} className="h-10 w-10 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
                                                        <Trash2 size={18} strokeWidth={2.5} />
                                                    </button>
                                                )}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredGroups.map((group, idx) => (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                key={group.id}
                                onClick={() => openDetail(group.id)}
                                className="bg-white/70 backdrop-blur-3xl rounded-[2.8rem] border border-white/60 p-8 shadow-[0_15px_45px_rgba(0,0,0,0.04)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.06)] transition-all flex flex-col justify-between group h-full relative overflow-hidden"
                            >
                                <div>
                                    <div className="flex items-start justify-between mb-6">
                                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 ${group.is_archived ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}><Users size={28} strokeWidth={2.5} /></div>
                                        {!group.is_archived && <button onClick={e => handleDelete(group, e)} className="h-10 w-10 flex items-center justify-center text-slate-200 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} strokeWidth={2.5} /></button>}
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                                        {group.name}
                                        {group.is_archived && <span className="ml-2 px-2 py-0.5 rounded-md bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-widest align-middle border border-rose-100">ARCHIVED</span>}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-3 font-medium line-clamp-3 leading-relaxed min-h-[4.5rem] italic opacity-80 group-hover:opacity-100 transition-opacity">{group.description || 'Struktur unit kerja tanpa deskripsi misi publik.'}</p>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex -space-x-3">
                                        {Array.from({ length: Math.min(group.user_count || 0, 4) }).map((_, i) => (
                                            <div key={i} className="h-9 w-9 rounded-xl bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-600 shadow-sm transition-transform group-hover:translate-x-1 group-hover:scale-105" style={{ zIndex: 10 - i }}>
                                                {String.fromCharCode(65 + i)}
                                            </div>
                                        ))}
                                        {(group.user_count || 0) > 4 && (
                                            <div className="h-9 w-9 rounded-xl bg-indigo-50 border-2 border-white flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-sm relative z-0">
                                                +{(group.user_count || 0) - 4}
                                            </div>
                                        )}
                                        {group.user_count === 0 && <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">VACANT</span>}
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1 group-hover:translate-x-2 transition-transform">Unit Detail <ChevronRight size={16} strokeWidth={3} /></span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal Premium */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => setShowCreateModal(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.35)] overflow-hidden"
                        >
                            <div className="bg-slate-900 px-10 py-10 text-white text-center relative overflow-hidden border-b border-white/5">
                                <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12">
                                    <Users size={100} />
                                </div>
                                <h3 className="text-3xl font-black italic tracking-tight relative z-10 uppercase">Arsitektur Unit</h3>
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 relative z-10 italic">Struktur Organisasi Inspektorat</p>
                            </div>
                            <form onSubmit={handleCreate} className="p-10 space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">Nama Unit/Grup Kerja</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-indigo-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-black text-slate-800 transition-all outline-none shadow-inner"
                                        required
                                        placeholder="Contoh: Tim Audit Internal Wilayah II"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        disabled={saving}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block pl-1">Misi & Deskripsi Operasional</label>
                                    <textarea
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-indigo-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-black text-slate-800 transition-all outline-none shadow-inner min-h-[120px]"
                                        placeholder="Deskripsikan fokus kerja atau tanggung jawab tim ini..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        disabled={saving}
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-5 rounded-2xl bg-white border-2 border-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all">Batalkan</button>
                                    <button type="submit" className="flex-[2] py-5 rounded-3xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95" disabled={saving}>
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : 'Inisialisasi Unit'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Detail Overlay */}
            {showDetailModal && selectedGroup && (
                <GroupMemberModal
                    selectedGroup={selectedGroup}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    users={users}
                    selectedUserId={selectedUserId}
                    setSelectedUserId={setSelectedUserId}
                    selectedRole={selectedRole}
                    setSelectedRole={setSelectedRole}
                    saving={saving}
                    onAssignUser={handleAssignUser}
                    onRemoveUser={handleRemoveUser}
                    onClose={() => setShowDetailModal(false)}
                    relationsTab={
                        <GroupRelationsTab
                            selectedGroup={selectedGroup}
                            periods={periods}
                            selectedPeriodId={selectedPeriodId}
                            setSelectedPeriodId={setSelectedPeriodId}
                            groupRelations={groupRelations}
                            newRelation={newRelation}
                            setNewRelation={setNewRelation}
                            saving={saving}
                            onAddRelation={handleAddRelation}
                            onRemoveRelation={handleRemoveRelation}
                            onClearAll={handleClearAllRelations}
                        />
                    }
                />
            )}

            {/* Termination Modal Premium */}
            <AnimatePresence>
                {showDeleteModal && groupToDelete && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => !saving && setShowDeleteModal(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            <div className="bg-rose-600 px-10 py-10 text-white text-center relative overflow-hidden">
                                <div className="h-24 w-24 rounded-[2.2rem] bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-6 border-2 border-white/30 shadow-2xl relative z-10"><Trash2 size={40} strokeWidth={2.5} /></div>
                                <h3 className="text-3xl font-black italic tracking-tighter relative z-10 uppercase">TERMINASI UNIT</h3>
                                <p className="text-rose-200 text-[10px] font-black uppercase tracking-[0.3em] mt-2 relative z-10 font-bold">Penghapusan Berskala Permanen</p>
                            </div>
                            <div className="p-10 space-y-8">
                                <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] space-y-4">
                                    <div className="flex items-center gap-3">
                                        <ShieldAlert size={18} className="text-rose-600" />
                                        <span className="text-[11px] font-black text-rose-900 uppercase tracking-widest">Protocol Override</span>
                                    </div>
                                    <p className="text-[13px] font-bold text-rose-700 leading-relaxed italic opacity-80">
                                        "Seluruh riwayat penilaian, relasi evaluator, dan konfigurasi logistik unit <span className="not-italic text-rose-900 underline">{groupToDelete.name}</span> akan dihapus dari grid memori sistem selamanya."
                                    </p>
                                </div>
                                <div className="flex flex-col gap-3 pt-4">
                                    <button onClick={confirmDelete} className="w-full py-5 rounded-3xl bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-rose-200 hover:bg-rose-600 transition-all active:scale-95">Yakin, Hapus Permanen</button>
                                    <button onClick={() => { setShowDeleteModal(false); setGroupToDelete(null); }} className="w-full py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-colors">Batalkan Operasi</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {showRelationDeleteModal && relationToRemoveIndex !== null && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => !saving && setShowRelationDeleteModal(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative bg-white w-full max-w-md rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.4)] overflow-hidden"
                        >
                            <div className="p-10 text-center">
                                <div className="h-20 w-20 rounded-[1.8rem] bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100/50"><Trash2 size={32} strokeWidth={2.5} /></div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight italic">Hapus Relasi?</h3>
                                <p className="text-sm text-slate-500 font-bold mt-4 leading-relaxed">
                                    Relasi antara <strong className="text-indigo-600">{getUserName(groupRelations[relationToRemoveIndex].evaluator_id)}</strong> dan <strong className="text-indigo-600">{getUserName(groupRelations[relationToRemoveIndex].target_user_id)}</strong> akan dihapus dari basis data periode ini.
                                </p>
                                <div className="grid grid-cols-2 gap-4 mt-10">
                                    <button onClick={() => { setShowRelationDeleteModal(false); setRelationToRemoveIndex(null); }} className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all">Gagalkan</button>
                                    <button onClick={confirmRemoveRelation} className="py-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-rose-200 active:scale-95">Ya, Hapus</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {showDetailModal && (
                <button className="fixed top-8 right-8 z-[110] h-14 w-14 bg-white/20 text-white rounded-[1.5rem] flex items-center justify-center hover:bg-rose-500 transition-all active:scale-90 shadow-2xl backdrop-blur-xl border border-white/20"
                    onClick={() => setShowDetailModal(false)}>
                    <X size={24} strokeWidth={3} />
                </button>
            )}
        </Layout>
    );
};

export default GroupManagement;
