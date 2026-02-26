import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import {
    Award,
    BarChart3,
    PieChart,
    Users,
    ArrowLeft,
    TrendingUp,
    FileText,
    Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

const AssessmentDetailPage: React.FC = () => {
    const { userId } = useParams();
    const [searchParams] = useSearchParams();
    const periodId = searchParams.get('period_id');
    const navigate = useNavigate();

    const [detail, setDetail] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId && periodId) {
            fetchDetail();
        }
    }, [userId, periodId]);

    const fetchDetail = async () => {
        try {
            const response = await api.get(`/admin/assessments/detail/${userId}?period_id=${periodId}`);
            setDetail(response.data.data);
        } catch (error) {
            console.error("Failed to fetch detail", error);
            toast.error("Gagal memuat detail laporan");
            navigate('/admin/assessments');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <Layout title="Laporan Hasil 360°">
            <div className="py-20 flex flex-col items-center">
                <div className="loading-spinner mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Menganalisis Laporan...</p>
            </div>
        </Layout>
    );

    if (!detail) return (
        <Layout title="Laporan Hasil 360°">
            <div className="py-20 text-center text-slate-400">Data tidak ditemukan.</div>
        </Layout>
    );

    return (
        <Layout title="Laporan Komprehensif 360°" subtitle="Analisis perilaku BerAKHLAK berbasis multihubungan.">
            <div className="space-y-8 animate-fade-in pb-20">

                {/* Header Profile Section */}
                <div className="relative overflow-hidden bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-10 -rotate-12 scale-150">
                        <Award size={150} />
                    </div>

                    <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
                        <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                            <div className="h-24 w-24 rounded-[2rem] bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-slate-950 font-black text-4xl shadow-2xl shadow-primary-500/20">
                                {detail.user.name.charAt(0)}
                            </div>
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-primary-400 border border-white/5">
                                    Profil Pegawai Terdaftar
                                </div>
                                <h2 className="text-4xl font-black tracking-tight">{detail.user.name}</h2>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-400">
                                    <span className="text-sm font-mono font-bold bg-white/5 px-3 py-1 rounded-lg">NIP: {detail.user.nip}</span>
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-700"></span>
                                    <span className="text-sm font-bold">{detail.user.unit_kerja || 'Unit Kerja APIP'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center lg:items-end gap-3 px-8 py-6 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Nilai Akhir Perilaku</span>
                            <div className="text-6xl font-black bg-gradient-to-r from-primary-400 to-emerald-400 bg-clip-text text-transparent">
                                {detail.final_score.toFixed(2)}
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                                <TrendingUp size={14} /> Berkinerja Baik
                            </div>
                        </div>
                    </div>
                </div>

                {/* Primary Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Bobot Atasan (60%)</p>
                        <div className="flex items-end justify-between">
                            <span className="text-3xl font-black text-slate-900">{detail.weights["Atasan"]}%</span>
                            <PieChart className="text-emerald-500 opacity-20" size={40} />
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Bobot Rekan (20%)</p>
                        <div className="flex items-end justify-between">
                            <span className="text-3xl font-black text-slate-900">{detail.weights["Peer"]}%</span>
                            <PieChart className="text-blue-500 opacity-20" size={40} />
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Bobot Bawahan (20%)</p>
                        <div className="flex items-end justify-between">
                            <span className="text-3xl font-black text-slate-900">{detail.weights["Bawahan"]}%</span>
                            <PieChart className="text-purple-500 opacity-20" size={40} />
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Status Penilai</p>
                        <div className="flex items-end justify-between">
                            <span className="text-3xl font-black text-slate-900">{detail.status} / 7</span>
                            <Users className="text-primary-500 opacity-20" size={40} />
                        </div>
                    </div>
                </div>

                {/* Breakdown per Indicator */}
                <div className="space-y-6">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-slate-950 rounded-xl text-white shadow-lg">
                            <BarChart3 size={20} />
                        </div>
                        Pencapaian Indikator BerAKHLAK
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                        {Object.entries(detail.total_per_indicator).map(([ind, score]: any) => (
                            <div key={ind} className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm flex flex-col items-center text-center group hover:border-primary-500 transition-all">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter h-8 flex items-center">
                                    {ind}
                                </p>
                                <div className="text-2xl font-black text-slate-900 my-2">
                                    {score > 0 ? score.toFixed(1) : '-'}
                                </div>
                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${score}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Detailed Raw Scores by Role */}
                <div className="space-y-8">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-slate-950 rounded-xl text-white shadow-lg">
                            <FileText size={20} />
                        </div>
                        Data Mentah Masukan Penilai
                    </h3>

                    {['Atasan', 'Peer', 'Bawahan'].map((role) => (
                        <div key={role} className="card overflow-hidden !rounded-[2.5rem] border-none shadow-xl">
                            <div className={`px-10 py-5 flex items-center justify-between ${role === 'Atasan' ? 'bg-emerald-600 text-white' :
                                role === 'Peer' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
                                }`}>
                                <h4 className="font-black text-sm uppercase tracking-[0.2em]">{role}</h4>
                                <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Kontribusi Bobot: {detail.weights[role]}%</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                        <tr>
                                            <th className="px-10 py-4">Indikator Perilaku</th>
                                            {detail.scores_by_role[role]?.map((r: any, i: number) => (
                                                <th key={i} className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-slate-900">{r.name}</span>
                                                        <span className="text-[9px] lowercase font-normal opacity-50">{new Date().toLocaleDateString()}</span>
                                                    </div>
                                                </th>
                                            ))}
                                            {(!detail.scores_by_role[role] || detail.scores_by_role[role].length === 0) && (
                                                <th className="px-10 py-4 text-center text-slate-300 italic">Belum Ada Pengisian</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {Object.keys(detail.total_per_indicator).map((ind) => (
                                            <tr key={ind} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-10 py-4 text-xs font-black text-slate-700 uppercase tracking-tight">{ind}</td>
                                                {detail.scores_by_role[role]?.map((r: any, i: number) => (
                                                    <td key={i} className="px-6 py-4 text-center">
                                                        <span className={`inline-flex items-center justify-center h-10 w-10 rounded-xl font-black text-sm ${r.scores[ind] >= 80 ? 'bg-emerald-50 text-emerald-600' :
                                                            r.scores[ind] >= 60 ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                                                            }`}>
                                                            {r.scores[ind]}
                                                        </span>
                                                    </td>
                                                ))}
                                                {(!detail.scores_by_role[role] || detail.scores_by_role[role].length === 0) && (
                                                    <td className="px-10 py-4 text-center text-slate-200">-</td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-10 border-t border-slate-100">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-xs uppercase tracking-widest transition-all"
                    >
                        <ArrowLeft size={18} /> Kembali ke Monitoring
                    </button>

                    <div className="flex items-center gap-2 px-6 py-3 bg-slate-100 rounded-full text-slate-400">
                        <Shield size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Laporan Terverifikasi Sistem</span>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AssessmentDetailPage;
