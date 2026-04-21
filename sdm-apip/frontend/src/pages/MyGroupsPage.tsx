import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import groupService from '../services/groupService';
import { Group } from '../types';
import { motion } from 'framer-motion';
import {
    Users as UsersIcon,
    ArrowUpRight,
    X,
    UserCircle2,
    Shield,
    Info,
    Search,
    ChevronRight
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
            title="Grup Penugasan"
            subtitle="Daftar koordinasi tim dan rekan kerja Anda di Inspektorat."
        >
            <div className="space-y-8 animate-fade-in">
                {/* Search Bar Bento */}
                <div className="bg-white/70 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="relative max-w-xl">
                        <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400" strokeWidth={2.5} />
                        <input
                            type="text"
                            placeholder="Cari nama grup atau deskripsi..."
                            className="w-full pl-14 pr-6 py-4 bg-white/50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none font-bold text-slate-700 placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGroups.map(group => (
                        <motion.button
                            whileHover={{ y: -5, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={group.id}
                            onClick={() => handleGroupClick(group.id)}
                            className="group card p-8 text-left transition-all border-white/60 shadow-[0_8px_25px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] bg-white/70 backdrop-blur-3xl"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="h-16 w-16 rounded-[1.5rem] bg-primary-50 text-primary-600 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white group-hover:rotate-3 transition-all duration-500 shadow-sm">
                                    <UsersIcon size={32} strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:text-primary-500 group-hover:bg-primary-50 transition-all">
                                        <ArrowUpRight size={22} strokeWidth={2.5} />
                                    </div>
                                    {group.user_role === 'Ketua' && (
                                        <span className="px-3 py-1 rounded-full bg-amber-50 text-[10px] font-black text-amber-600 uppercase tracking-widest border border-amber-100 shadow-sm transition-transform group-hover:scale-110">Ketua Tim</span>
                                    )}
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-3 group-hover:text-primary-700 transition-colors tracking-tight">{group.name}</h3>
                            <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed h-[2.5rem] mb-4">
                                {group.description || 'Koordinasi strategis personil APIP dalam rangka transparansi penilaian.'}
                            </p>

                            <div className="pt-6 border-t border-slate-100/50 flex items-center justify-between mt-auto">
                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary-600 transition-colors flex items-center gap-2">
                                    Detail Anggota <ChevronRight size={14} strokeWidth={3} />
                                </span>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-100 shadow-sm">
                                    <UserCircle2 size={14} className="text-primary-400" />
                                    <span className="text-[10px] font-black text-slate-600 uppercase">
                                        {group.user_count || 0} Anggota
                                    </span>
                                </div>
                            </div>
                        </motion.button>
                    ))}

                    {filteredGroups.length === 0 && (
                        <div className="col-span-full py-24 card text-center border-dashed bg-white/40 shadow-none border-2 border-slate-200">
                            <div className="h-20 w-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto text-slate-200 mb-6">
                                <UsersIcon size={48} />
                            </div>
                            <h4 className="text-2xl font-black text-slate-400">Grup Tidak Ditemukan</h4>
                            <p className="text-slate-500 mt-2 font-medium">Pastikan nama grup yang Anda cari sudah sesuai.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Group Detail Modal Glass */}
            {showGroupDetailModal && selectedGroupDetail && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="card w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden bg-white/90 border-white/60"
                    >
                        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white/50 sticky top-0 z-10">
                            <div>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{selectedGroupDetail.group.name}</h3>
                                <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest opacity-70">Detail Koordinasi Anggota</p>
                            </div>
                            <button 
                                onClick={() => setShowGroupDetailModal(false)} 
                                className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-rose-500 hover:scale-110 active:scale-95 transition-all shadow-sm"
                            >
                                <X size={28} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                            <div className="bg-primary-50/50 rounded-[2rem] p-6 mb-10 border border-primary-100/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest">Deskripsi Grup</p>
                                    <p className="text-slate-700 font-medium leading-relaxed max-w-2xl">
                                        {selectedGroupDetail.group.description || 'Daftar personil pengawasan APIP untuk penilaian performa kolektif.'}
                                    </p>
                                </div>
                                <div className="bg-white/80 px-6 py-4 rounded-3xl border border-white shadow-sm shrink-0 text-center">
                                    <p className="text-3xl font-black text-primary-600 leading-none mb-1">{selectedGroupDetail.members?.length || 0}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">SDM APIP</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {selectedGroupDetail.members?.map((member: any) => (
                                    <motion.div 
                                        whileHover={{ x: 5 }}
                                        key={member.id} 
                                        className="flex items-center gap-5 p-5 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_15px_rgb(0,0,0,0.02)] transition-all hover:border-primary-300 group/item"
                                    >
                                        <div className="relative shrink-0">
                                            <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner flex items-center justify-center font-black text-slate-300 group-hover/item:text-primary-400 transition-colors overflow-hidden">
                                                {member.foto ? (
                                                    <img src={member.foto} alt={member.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <UserCircle2 size={32} />
                                                )}
                                            </div>
                                            {member.group_role === 'Ketua' && (
                                                <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 border-4 border-white flex items-center justify-center text-white shadow-lg" title="Ketua Grup">
                                                    <Shield size={14} fill="currentColor" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="font-black text-slate-900 truncate tracking-tight">{member.name}</p>
                                                {member.group_role === 'Ketua' && (
                                                    <div className="px-2 py-0.5 rounded-lg bg-amber-50 text-[9px] font-black text-amber-600 uppercase border border-amber-100">Tim Leader</div>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 font-bold truncate">{member.jabatan || 'Anggota APIP'}</p>
                                            <div className="mt-1.5 flex items-center gap-2">
                                                <span className="text-[10px] font-black text-slate-300 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 group-hover/item:text-primary-400 transition-colors">{member.nip}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="mt-12 bg-primary-900/5 rounded-[2.5rem] p-8 border border-primary-100 flex items-start gap-4">
                                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary-500 shadow-sm shrink-0">
                                    <Info size={24} strokeWidth={2.5} />
                                </div>
                                <div className="text-xs text-slate-600 leading-relaxed font-medium">
                                    <p className="text-slate-900 font-black mb-1.5 uppercase tracking-wide">Privasi Tim Terjaga</p>
                                    <p>Informasi anggota grup ini bersifat konfidensial dan hanya ditujukan untuk keperluan penilaian internal SDM APIP. Segala bentuk koordinasi audit dan pengawasan harus mematuhi kode etik yang berlaku.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </Layout>
    );
};

export default MyGroupsPage;
