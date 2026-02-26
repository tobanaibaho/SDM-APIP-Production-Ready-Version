import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import groupService from '../services/groupService';
import { Group, GroupDetail } from '../types';
import userService from '../services/userService';
import {
    Users, Plus, Search, Trash2, X,
    LayoutGrid, List, Loader2, ChevronRight,
    Building2, ArrowUpDown,
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
        <Layout title="Manajemen Grup" subtitle="Kelola struktur organisasi dan penugasan tim inspektorat.">
            <div className="space-y-6">
                {/* Toolbar */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="relative flex-1 max-w-md">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Cari berdasarkan nama atau deskripsi..." className="form-input pl-11 bg-slate-50/50 border-slate-200"
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center cursor-pointer gap-2 mr-2 group" title="Tampilkan Grup yang Dihapus/Diarsipkan">
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${showArchived ? 'bg-red-500' : 'bg-slate-200 group-hover:bg-slate-300'}`}></div>
                                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showArchived ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                            <span className="text-sm font-bold text-slate-500">Arsip</span>
                        </label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {(['list', 'grid'] as const).map(mode => (
                                <button key={mode} className={`p-2 rounded-lg transition-all ${viewMode === mode ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setViewMode(mode)}>
                                    {mode === 'list' ? <List size={20} /> : <LayoutGrid size={20} />}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
                            <Plus size={18} /><span>Buat Grup</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="card h-48 animate-pulse bg-slate-100/50" />)}
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <div className="card py-20 text-center border-dashed bg-slate-50/50">
                        <Users size={64} className="mx-auto text-slate-200 mb-4" />
                        <h3 className="text-xl font-bold text-slate-950">Tidak Ada Grup</h3>
                        <p className="text-slate-500 mt-2">Mulai dengan membuat grup baru untuk mengelola tim Anda.</p>
                        <button onClick={() => setShowCreateModal(true)} className="mt-6 btn-secondary">Buat Grup Pertama</button>
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 cursor-pointer hover:text-primary-600" onClick={() => handleSort('name')}>
                                            <div className="flex items-center gap-2">Nama Grup <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Deskripsi</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-center" onClick={() => handleSort('user_count')}>
                                            <div className="flex items-center justify-center gap-2">Anggota <ArrowUpDown size={12} /></div>
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredGroups.map(group => (
                                        <tr key={group.id} onClick={() => openDetail(group.id)} className="group hover:bg-primary-50/30 cursor-pointer transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-950">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${group.is_archived ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-600'}`}><Users size={18} /></div>
                                                    <div>
                                                        {group.name}
                                                        {group.is_archived && <span className="ml-2 px-2 py-0.5 rounded-md bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-wider">ARSIP</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{group.description || '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-bold text-primary-700">{group.user_count || 0} Pegawai</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {!group.is_archived && <button onClick={e => handleDelete(group, e)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredGroups.map(group => (
                            <div key={group.id} onClick={() => openDetail(group.id)} className="card group cursor-pointer hover:ring-2 hover:ring-primary-500/20 transition-all hover:scale-[1.02]">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${group.is_archived ? 'bg-red-50 text-red-500' : 'bg-primary-50 text-primary-600 group-hover:bg-primary-600 group-hover:text-white'}`}><Users size={24} /></div>
                                        {!group.is_archived && <button onClick={e => handleDelete(group, e)} className="p-1.5 text-slate-200 hover:text-red-500 transition-colors group-hover:text-slate-300"><Trash2 size={18} /></button>}
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 group-hover:text-primary-700 transition-colors">
                                        {group.name}
                                        {group.is_archived && <span className="ml-2 px-2 py-0.5 rounded-md bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-wider align-middle">ARSIP</span>}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed h-10">{group.description || 'Tidak ada deskripsi untuk grup ini.'}</p>
                                    <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].slice(0, Math.min(group.user_count || 0, 3)).map(i => (
                                                <div key={i} className="h-8 w-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600">P</div>
                                            ))}
                                            {(group.user_count || 0) > 3 && (
                                                <div className="h-8 w-8 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-primary-600">+{(group.user_count || 0) - 3}</div>
                                            )}
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest text-primary-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">Detail <ChevronRight size={14} /></span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="card w-full max-w-md animate-slide-up overflow-hidden">
                        <div className="bg-slate-900 px-6 py-6 text-white text-center relative overflow-hidden">
                            <h3 className="text-xl font-bold relative z-10">Buat Grup Baru</h3>
                            <p className="text-slate-400 text-xs mt-1 relative z-10 font-medium">STRUKTUR TIM INSPEKTORAT</p>
                            <Building2 size={80} className="absolute -right-4 -bottom-4 text-white/5" />
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="form-label">Nama Grup</label>
                                <input type="text" className="form-input" required placeholder="Contoh: Tim Audit Wilayah 1"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} disabled={saving} />
                            </div>
                            <div>
                                <label className="form-label">Deskripsi Grup</label>
                                <textarea className="form-input" rows={3} placeholder="Jelaskan fungsi atau wilayah kerja tim ini..."
                                    value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} disabled={saving} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">Batal</button>
                                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                                    {saving ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Buat Grup'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
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

            {/* Delete Group Confirmation */}
            {showDeleteModal && groupToDelete && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="card w-full max-w-lg animate-slide-up overflow-hidden shadow-2xl">
                        <div className="bg-gradient-to-br from-red-600 to-red-700 px-8 py-8 text-white text-center relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border-2 border-white/30"><Trash2 size={32} /></div>
                                <h3 className="text-2xl font-black">Konfirmasi Penghapusan</h3>
                                <p className="text-red-100 text-sm mt-2 font-medium">Tindakan ini tidak dapat dibatalkan</p>
                            </div>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                                <h4 className="font-black text-amber-900 text-sm mb-2">PERINGATAN PENTING</h4>
                                <ul className="mt-2 space-y-1 text-sm text-amber-800">
                                    <li>• Semua <strong>data penilaian peer assessment</strong> terkait grup ini</li>
                                    <li>• Semua <strong>anggota akan dikeluarkan</strong> dari grup</li>
                                    <li>• <strong>Riwayat penilaian tidak dapat dipulihkan</strong></li>
                                </ul>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Grup yang akan dihapus:</p>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center"><Users size={20} /></div>
                                    <div>
                                        <p className="font-black text-slate-900">{groupToDelete.name}</p>
                                        <p className="text-xs text-slate-500">{groupToDelete.user_count || 0} anggota • {groupToDelete.description || 'Tidak ada deskripsi'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => { setShowDeleteModal(false); setGroupToDelete(null); }} className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all">Batal</button>
                                <button onClick={confirmDelete} className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/30">Ya, Hapus Grup</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Relation Confirmation */}
            {showRelationDeleteModal && relationToRemoveIndex !== null && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="card w-full max-w-md animate-slide-up overflow-hidden shadow-2xl">
                        <div className="p-8 text-center">
                            <div className="h-16 w-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
                            <h3 className="text-xl font-black text-slate-900">Hapus Relasi?</h3>
                            <p className="text-slate-500 text-sm mt-2">
                                Anda akan menghapus relasi antara <strong className="text-slate-900">{getUserName(groupRelations[relationToRemoveIndex].evaluator_id)}</strong> dan <strong className="text-slate-900">{getUserName(groupRelations[relationToRemoveIndex].target_user_id)}</strong>.
                            </p>
                            <div className="grid grid-cols-2 gap-3 mt-8">
                                <button onClick={() => { setShowRelationDeleteModal(false); setRelationToRemoveIndex(null); }} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all">Batal</button>
                                <button onClick={confirmRemoveRelation} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/30">Ya, Hapus</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Close button for detail modal backdrop click */}
            {showDetailModal && (
                <button className="fixed top-4 right-4 z-[99] h-10 w-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                    onClick={() => setShowDetailModal(false)}>
                    <X size={20} />
                </button>
            )}
        </Layout>
    );
};

export default GroupManagement;
