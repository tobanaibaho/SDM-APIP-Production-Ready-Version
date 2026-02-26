import React from 'react';
import { Users, UserPlus, Trash2, X } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { GroupDetail } from '../types';

interface Props {
    selectedGroup: GroupDetail;
    activeTab: 'members' | 'relations';
    setActiveTab: (tab: 'members' | 'relations') => void;
    users: any[];
    selectedUserId: number | '';
    setSelectedUserId: (id: number | '') => void;
    selectedRole: 'Dalnis' | 'KT' | 'AT';
    setSelectedRole: (role: 'Dalnis' | 'KT' | 'AT') => void;
    saving: boolean;
    onAssignUser: () => void;
    onRemoveUser: (userId: number) => void;
    onClose: () => void;
    relationsTab: React.ReactNode;
}

const roleBadge = (role: string) => {
    if (role === 'Dalnis') return <span className="px-1.5 py-0.5 rounded bg-purple-50 text-[8px] font-black text-purple-600 uppercase tracking-tighter border border-purple-100">Dalnis</span>;
    if (role === 'KT') return <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[8px] font-black text-blue-600 uppercase tracking-tighter border border-blue-100">Ketua Tim</span>;
    if (role === 'AT') return <span className="px-1.5 py-0.5 rounded bg-green-50 text-[8px] font-black text-green-600 uppercase tracking-tighter border border-green-100">Anggota Tim</span>;
    return null;
};

const GroupMemberModal: React.FC<Props> = ({
    selectedGroup, activeTab, setActiveTab,
    users, selectedUserId, setSelectedUserId,
    selectedRole, setSelectedRole,
    saving, onAssignUser, onRemoveUser, onClose,
    relationsTab,
}) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="card w-full max-w-5xl max-h-[90vh] flex flex-col animate-slide-up shadow-2xl">
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                    <h3 className="text-2xl font-black text-slate-950">{selectedGroup.group.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{selectedGroup.group.description || 'Grup penugasan tim Inspektorat Utama.'}</p>
                </div>
                <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                    <X size={24} />
                </button>
            </div>

            {/* Tabs */}
            <div className="px-8 pt-6 border-b border-slate-100 flex gap-8">
                {(['members', 'relations'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {tab === 'members' ? 'Anggota Tim' : 'Relasi Penilaian'}
                        {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-600 rounded-t-full" />}
                    </button>
                ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 lg:p-10">
                {activeTab === 'members' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Member list */}
                        <div className={`space-y-6 ${selectedGroup.group.is_archived ? 'lg:col-span-12' : 'lg:col-span-8'}`}>
                            <div className="flex items-center justify-between">
                                <h4 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider text-sm">
                                    <Users size={18} className="text-primary-600" /> Daftar Anggota Tim
                                </h4>
                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{selectedGroup.members?.length || 0} Personil</span>
                            </div>
                            <div className="grid gap-3">
                                {selectedGroup.members?.map(member => (
                                    <div key={member.id} className="group relative flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-primary-200 hover:shadow-sm transition-all">
                                        <div className="h-12 w-12 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center font-bold text-primary-600">
                                            {member.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-950 truncate">{member.name}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{member.jabatan || 'Anggota Tim'}</p>
                                                {roleBadge(member.group_role)}
                                            </div>
                                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{member.nip}</p>
                                        </div>
                                        {!selectedGroup.group.is_archived && (
                                            <button onClick={() => onRemoveUser(member.id)} className="p-2 text-slate-200 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {(!selectedGroup.members || selectedGroup.members.length === 0) && (
                                    <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                                        <UserPlus size={48} className="mx-auto text-slate-200 mb-3" />
                                        <p className="text-slate-400 font-medium">Belum ada anggota di grup ini.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Add member panel */}
                        {!selectedGroup.group.is_archived && (
                            <div className="lg:col-span-4">
                                <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4">
                                    <h4 className="font-bold flex items-center gap-2"><UserPlus size={18} /> Tambah Anggota</h4>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Cari Pegawai</label>
                                        <select
                                            className="w-full bg-slate-800 border-none rounded-xl text-sm py-2.5 px-3 focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
                                            value={selectedUserId}
                                            onChange={e => setSelectedUserId(e.target.value === '' ? '' : Number(e.target.value))}
                                            disabled={saving}
                                        >
                                            <option value="">Pilih Pegawai...</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Peran dalam Grup</label>
                                        <select
                                            className="w-full bg-slate-800 border-none rounded-xl text-sm py-2.5 px-3 focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
                                            value={selectedRole}
                                            onChange={e => setSelectedRole(e.target.value as any)}
                                            disabled={saving}
                                        >
                                            <option value="AT">AT — Anggota Tim</option>
                                            <option value="KT">KT — Ketua Tim</option>
                                            <option value="Dalnis">Dalnis — Pengendali Teknis</option>
                                        </select>
                                        <p className="text-[9px] text-slate-500 mt-2 leading-relaxed">
                                            ℹ️ Inspektur terdeteksi otomatis dari jabatan di data SDM, tidak perlu ditambahkan ke grup.
                                        </p>
                                    </div>
                                    <button
                                        className="w-full bg-primary-600 hover:bg-primary-500 py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary-900/50 transition-all active:scale-95 disabled:opacity-50"
                                        onClick={onAssignUser}
                                        disabled={!selectedUserId || saving}
                                    >
                                        {saving ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Assign Ke Grup'}
                                    </button>
                                    <p className="text-[10px] text-slate-500 leading-relaxed bg-white/5 p-3 rounded-lg">
                                        ℹ️ Pegawai yang ditambahkan akan dapat berpartisipasi dalam penilaian dalam grup ini.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : relationsTab}
            </div>
        </div>
    </div>
);

export default GroupMemberModal;
