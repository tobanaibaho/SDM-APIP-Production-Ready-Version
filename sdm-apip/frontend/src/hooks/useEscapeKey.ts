import { useEffect, useRef } from 'react';

/**
 * Hook untuk menutup modal/popup dengan menekan tombol Escape (Esc).
 * Menggunakan useRef agar listener stabil — tidak re-attach setiap render.
 * @param isOpen  - Apakah modal sedang terbuka
 * @param onClose - Fungsi yang dipanggil untuk menutup modal
 */
const useEscapeKey = (isOpen: boolean, onClose: () => void): void => {
    // Simpan referensi terbaru onClose tanpa memicu ulang effect
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCloseRef.current();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]); // Hanya isOpen sebagai dependency — jauh lebih stabil
};

export default useEscapeKey;
