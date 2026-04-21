import React from 'react';
import { Link, Plus, Trash2, ChevronRight, ShieldCheck, Briefcase, Loader2 } from 'lucide-react';
import { GroupDetail } from '../types';
import { AssessmentPeriod } from '../services/assessmentService';

interface NewRelation {
    evaluator_id: number | '';
    target_user_id: number | '';
    relation_type: 'Atasan' | 'Peer' | 'Bawahan';
    target_position: 'Atasan' | 'Peer' | 'Bawahan';
}

interface Props {
    selectedGroup: GroupDetail;
    periods: AssessmentPeriod[];
    selectedPeriodId: number | '';
    setSelectedPeriodId: (id: number | '') => void;
    groupRelations: any[];
    newRelation: NewRelation;
    setNewRelation: (r: NewRelation) => void;
    saving: boolean;
    onAddRelation: () => void;
    onRemoveRelation: (index: number) => void;
    onClearAll: () => void;
}

const relTypeClass = (t: string) => {
    if (t === 'Atasan') return 'bg-purple-50 text-purple-600 border-purple-100';
    if (t === 'Peer') return 'bg-blue-50 text-blue-600 border-blue-100';
    return 'bg-orange-50 text-orange-600 border-orange-100';
};

const GroupRelationsTab: React.FC<Props> = ({
    selectedGroup, periods, selectedPeriodId, setSelectedPeriodId,
    groupRelations, newRelation, setNewRelation,
    saving, onAddRelation, onRemoveRelation, onClearAll,
}) => {
    const getUserName = (id: number) =>
        selectedGroup.members?.find(m => m.id === id)?.name || 'Unknown';

    return (
        <div className="space-y-8">
            {/* Period selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-wider text-sm">Periode Penilaian</h4>
                    <p className="text-xs text-slate-500 mt-1">Pilih periode untuk mengatur relasi penilaian antar anggota.</p>
                </div>
                <select
                    className="form-input md:max-w-xs bg-white"
                    value={selectedPeriodId}
                    onChange={e => setSelectedPeriodId(Number(e.target.value))}
                >
                    <option value="">Pilih Periode...</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.name}{p.is_active ? ' (Aktif)' : ''}</option>)}
                </select>
            </div>

            {selectedPeriodId ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Relation table */}
                    <div className={`space-y-6 ${selectedGroup.group.is_archived ? 'lg:col-span-12' : 'lg:col-span-12 xl:col-span-8'}`}>
                        <div className="flex items-center justify-between">
                            <h4 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider text-sm">
                                <Link size={18} className="text-primary-600" /> Daftar Relasi Aktif
                            </h4>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{groupRelations.length} Relasi</span>
                                {groupRelations.length > 0 && !selectedGroup.group.is_archived && (
                                    <button onClick={onClearAll} className="text-[10px] font-bold text-red-500 hover:text-red-600 border border-red-100 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors uppercase tracking-widest">
                                        Hapus Semua
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-100">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                        <th className="px-6 py-4">Penilai (Evaluator)</th>
                                        <th className="px-6 py-4">Sebagai</th>
                                        <th className="px-6 py-4">Yang Dinilai (Target)</th>
                                        {!selectedGroup.group.is_archived && <th className="px-6 py-4 text-center">Aksi</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 bg-white">
                                    {groupRelations.map((rel, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-[10px] font-bold uppercase">
                                                        {getUserName(rel.evaluator_id).charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-900">{getUserName(rel.evaluator_id)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${relTypeClass(rel.relation_type)}`}>
                                                    {rel.relation_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold uppercase">
                                                        {getUserName(rel.target_user_id).charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-900">{getUserName(rel.target_user_id)}</span>
                                                </div>
                                            </td>
                                            {!selectedGroup.group.is_archived && (
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={() => onRemoveRelation(idx)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {groupRelations.length === 0 && (
                                        <tr><td colSpan={selectedGroup.group.is_archived ? 3 : 4} className="px-6 py-12 text-center text-slate-400">Belum ada relasi penilaian yang dikonfigurasi.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Add relation form */}
                    {!selectedGroup.group.is_archived && (
                        <div className="lg:col-span-12 xl:col-span-4">
                            <div className="bg-slate-900 rounded-3xl p-8 text-white space-y-5">
                            <h4 className="font-bold flex items-center gap-2"><Plus size={20} className="text-primary-500" /> Tambah Relasi</h4>

                            {/* Evaluator */}
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Penilai (Evaluator)</label>
                                <select
                                    className="w-full bg-slate-800 border-none rounded-xl text-sm py-3 px-4 focus:ring-2 focus:ring-primary-500"
                                    value={newRelation.evaluator_id}
                                    onChange={e => setNewRelation({ ...newRelation, evaluator_id: Number(e.target.value) })}
                                >
                                    <option value="">Pilih Penilai...</option>
                                    <optgroup label="Anggota Grup">
                                        {selectedGroup.members?.map(m => <option key={m.id} value={m.id}>{m.name} ({m.group_role})</option>)}
                                    </optgroup>
                                    {selectedGroup.global_evaluators && selectedGroup.global_evaluators.length > 0 && (
                                        <optgroup label="Pimpinan (Global)">
                                            {selectedGroup.global_evaluators.map(m => <option key={m.id} value={m.id}>{m.name} (Inspektur)</option>)}
                                        </optgroup>
                                    )}
                                </select>
                            </div>

                            <div className="flex justify-center -my-2">
                                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center shadow-lg">
                                    <ChevronRight size={16} className="rotate-90" />
                                </div>
                            </div>

                            {/* Target */}
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Yang Dinilai (Target)</label>
                                <select
                                    className="w-full bg-slate-800 border-none rounded-xl text-sm py-3 px-4 focus:ring-2 focus:ring-primary-500"
                                    value={newRelation.target_user_id}
                                    onChange={e => setNewRelation({ ...newRelation, target_user_id: Number(e.target.value) })}
                                >
                                    <option value="">Pilih Target...</option>
                                    {selectedGroup.members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>

                            {/* Relation type */}
                            {(['relation_type', 'target_position'] as const).map((field, fi) => (
                                <div key={field}>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block flex items-center justify-between">
                                        <span>{fi === 0 ? 'Tipe Penilai (Role Evaluator)' : 'Tipe Target (Role Yang Dinilai)'}</span>
                                        <span className="text-[8px] opacity-70 font-normal normal-case italic">
                                            {fi === 0 ? 'Pilih "Atasan" jika penilai adalah bos' : 'Pilih "Bawahan" jika target adalah staf'}
                                        </span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['Atasan', 'Peer', 'Bawahan'] as const).map(t => (
                                            <button
                                                key={t} type="button"
                                                onClick={() => setNewRelation({ ...newRelation, [field]: t })}
                                                className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-2 ${newRelation[field] === t
                                                    ? (fi === 0 ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-900/40' : 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-900/40')
                                                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={onAddRelation}
                                disabled={saving || !newRelation.evaluator_id || !newRelation.target_user_id}
                                className="w-full bg-green-600 hover:bg-green-500 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-green-900/50 transition-all mt-4 disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Simpan Relasi'}
                            </button>

                            <div className="bg-white/5 p-4 rounded-2xl flex gap-3 items-start">
                                <ShieldCheck size={18} className="text-primary-500 flex-shrink-0 mt-0.5" />
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                    Relasi ini menentukan siapa yang dapat menilai siapa dalam periode yang dipilih.
                                </p>
                            </div>
                        </div>
                    </div>
                    )}
                </div>
            ) : (
                <div className="py-20 text-center">
                    <Briefcase size={64} className="mx-auto text-slate-100 mb-4" />
                    <p className="text-slate-400 font-medium">Pilih periode penilaian terlebih dahulu untuk mengelola relasi.</p>
                </div>
            )}
        </div>
    );
};

export default GroupRelationsTab;
