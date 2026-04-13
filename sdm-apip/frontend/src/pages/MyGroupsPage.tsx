import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import groupService from '../services/groupService';
import { Group } from '../types';
import {
    Users as UsersIcon,
    ArrowUpRight,
    X,
    UserCircle2,
    Shield,
    Info,
    Search
} from 'lucide-react';
import toast from 'react-hot-toast';

const MyGroupsPage: React.FC = () => {
    const [myGroups, setMyGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGroupDetailModal, setShowGroupDetailModal] = useState(false);
    const [selectedGroupDetail, setSelectedGroupDetail] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchMyGroups();
    }, []);

    const fetchMyGroups = async () => {
        try {
            setLoading(true);
            const groups = await groupService.getMyGroups();
            setMyGroups(groups || []);
        } catch (error) {
            toast.error('Gagal memuat daftar grup');
        } finally {
            setLoading(false);
        }
    };

    const handleGroupClick = async (groupId: number) => {
        try {
            const detail = await groupService.getGroupDetailForUser(groupId);
            setSelectedGroupDetail(detail);
            setShowGroupDetailModal(true);
        } catch (error) {
            toast.error('Gagal memuat detail grup');
        }
    };

    const filteredGroups = myGroups.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <Layout title="Grup Saya"><div className="loading-spinner mx-auto mt-20" /></Layout>;
    }

    return (
        <Layout
            title="Grup Saya"
            subtitle="Daftar grup penugasan dan rekan kerja Anda di Inspektorat."
        >
            <div className="space-y-6">
                {/* Search Bar */}
                <div className="relative max-w-md">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari grup..."
                        className="form-input pl-11 bg-white border-slate-200 shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGroups.map(group => (
                        <button
                            key={group.id}
                            onClick={() => handleGroupClick(group.id)}
                            className="group card p-6 text-left transition-all hover:scale-[1.02] hover:ring-2 hover:ring-primary-500/20 active:scale-100 shadow-sm"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="h-14 w-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
                                    <UsersIcon size={28} />
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <ArrowUpRight size={20} className="text-slate-300 group-hover:text-primary-500 transition-colors" />
                                    {group.user_role === 'Ketua' && (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-[9px] font-black text-amber-700 uppercase tracking-wider border border-amber-200">Ketua</span>
                                    )}
                                </div>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-2 group-hover:text-primary-700 transition-colors">{group.name}</h3>
                            <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed h-[4.5rem]">
                                {group.description || 'Grup koordinasi personil APIP untuk pengawasan dan audit.'}
                            </p>

                            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-primary-500 flex items-center gap-1">
                                    Lihat Anggota <ArrowUpRight size={14} />
                                </span>
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black text-slate-500 uppercase">
                                    {group.user_count || 0} Personil
                                </span>
                            </div>
                        </button>
                    ))}

                    {filteredGroups.length === 0 && (
                        <div className="col-span-full py-20 card text-center border-dashed bg-slate-50 shadow-none">
                            <UsersIcon size={64} className="mx-auto text-slate-200 mb-4" />
                            <h4 className="text-xl font-bold text-slate-400">Grup Tidak Ditemukan</h4>
                            <p className="text-slate-500 mt-2">Anda belum terdaftar di grup manapun atau hasil pencarian kosong.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Group Detail Modal */}
            {showGroupDetailModal && selectedGroupDetail && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="card w-full max-w-4xl max-h-[90vh] flex flex-col animate-slide-up shadow-2xl overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">{selectedGroupDetail.group.name}</h3>
                                <p className="text-sm text-slate-500 mt-1">{selectedGroupDetail.group.description || 'Koordinasi Personil SDM APIP'}</p>
                            </div>
                            <button onClick={() => setShowGroupDetailModal(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="bg-primary-50 rounded-xl px-4 py-2.5 flex items-center gap-2 border border-primary-100">
                                    <UsersIcon size={18} className="text-primary-600" />
                                    <span className="text-sm font-bold text-primary-700">{selectedGroupDetail.members?.length || 0} Personil Terdaftar</span>
                                </div>
                                <div className="h-0.5 flex-1 bg-slate-200/50"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedGroupDetail.members?.map((member: any) => (
                                    <div key={member.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:border-primary-300 hover:shadow-md group/item">
                                        <div className="relative shrink-0">
                                            {member.foto ? (
                                                <img
                                                    src={member.foto}
                                                    alt={member.name}
                                                    className="h-14 w-14 rounded-2xl object-cover border-2 border-slate-50 shadow-sm"
                                                />
                                            ) : (
                                                <div className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 shadow-sm flex items-center justify-center font-bold text-slate-400 group-hover/item:bg-primary-50 group-hover/item:text-primary-600 transition-colors">
                                                    {member.name?.charAt(0).toUpperCase() || <UserCircle2 size={24} />}
                                                </div>
                                            )}
                                            {member.group_role === 'Ketua' && (
                                                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-white shadow-sm" title="Ketua Grup">
                                                    <Shield size={12} fill="currentColor" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-slate-900 truncate">{member.name}</p>
                                                {member.group_role === 'Ketua' && (
                                                    <span className="px-2 py-0.5 rounded bg-amber-50 text-[10px] font-black text-amber-600 uppercase tracking-tighter border border-amber-100">Ketua</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium truncate">{member.jabatan || 'Anggota Tim'}</p>
                                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{member.nip}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex items-start gap-3">
                                <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                                <div className="text-xs text-blue-700 leading-relaxed">
                                    <p className="font-bold mb-1">Informasi Hak Akses:</p>
                                    <p>Daftar anggota ini hanya dapat dilihat oleh personil yang terdaftar dalam grup ini. Anda dapat melakukan penilaian terhadap rekan kerja Anda melalui menu <strong>Penilaian</strong> selama periode penilaian aktif berlangsung.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default MyGroupsPage;
