import React from 'react';

type RoleType = 'Inspektur' | 'Dalnis' | 'KT' | 'Ketua Tim' | 'AT' | 'Anggota Tim' | 'Anggota' | string;

export const RoleBadge: React.FC<{ role?: RoleType, className?: string }> = ({ role, className = '' }) => {
    if (!role) return null;
    
    let normalizedRole = role;
    if (role === 'Ketua Tim') normalizedRole = 'KT';
    if (role === 'Anggota Tim' || role === 'Anggota') normalizedRole = 'AT';
    if (role?.toLowerCase().includes('inspektur')) normalizedRole = 'Inspektur';

    let colorClasses = 'bg-slate-50 text-slate-600 border-slate-200';
    let textDisplay = role;

    switch (normalizedRole) {
        case 'Inspektur':
            colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
            textDisplay = 'Inspektur';
            break;
        case 'Dalnis':
            colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
            textDisplay = 'Dalnis';
            break;
        case 'KT':
            colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
            textDisplay = 'Ketua Tim (KT)';
            break;
        case 'AT':
            colorClasses = 'bg-teal-50 text-teal-700 border-teal-200';
            textDisplay = 'Anggota (AT)';
            break;
        default:
            textDisplay = role;
            break;
    }

    return (
        <span
            className={`inline-flex items-center justify-center min-w-[100px] px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${colorClasses} ${className}`}
            title={role}
        >
            <span className="truncate w-full text-center">{textDisplay}</span>
        </span>
    );
};

export default RoleBadge;
