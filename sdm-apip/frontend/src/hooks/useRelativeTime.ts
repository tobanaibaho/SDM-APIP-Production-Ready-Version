import { useState, useEffect } from 'react';

/** Converts an ISO/date string into a human-readable relative time in Indonesian */
export function formatRelativeTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 10) return 'Baru saja';
    if (diffSec < 60) return `${diffSec} detik yang lalu`;
    if (diffMin < 60) return `${diffMin} menit yang lalu`;
    if (diffHour < 24) return `${diffHour} jam yang lalu`;
    if (diffDay < 7) return `${diffDay} hari yang lalu`;
    if (diffWeek < 4) return `${diffWeek} minggu yang lalu`;
    if (diffMonth < 12) return `${diffMonth} bulan yang lalu`;
    return `${diffYear} tahun yang lalu`;
}

/** Returns a formatted absolute date+time string in Indonesian locale */
export function formatAbsoluteTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

/**
 * Hook that returns a live relative-time string for a given date,
 * automatically updating every 30 seconds.
 */
export function useRelativeTime(dateStr: string | null | undefined): string {
    const [label, setLabel] = useState(() => formatRelativeTime(dateStr));

    useEffect(() => {
        setLabel(formatRelativeTime(dateStr));
        const interval = setInterval(() => {
            setLabel(formatRelativeTime(dateStr));
        }, 30_000); // refresh every 30s
        return () => clearInterval(interval);
    }, [dateStr]);

    return label;
}

/**
 * Hook that returns the current date+time, updating every second.
 */
export function useLiveClock(): { date: string; time: string; full: string } {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    return {
        date: now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        full: now.toLocaleString('id-ID', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        }),
    };
}
