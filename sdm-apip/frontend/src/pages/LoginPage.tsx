import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from '../assets/logo.png';
import { ShieldCheck, CheckCircle2, ArrowRight, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const error = params.get('error');
        if (error) {
            let errorMsg = 'Terjadi kesalahan saat login SSO.';
            switch (error) {
                case 'invalid_state': errorMsg = 'Sesi SSO tidak valid atau telah kedaluwarsa. Silakan coba lagi.'; break;
                case 'provider_disabled': errorMsg = 'Layanan SSO saat ini dinonaktifkan.'; break;
                case 'sso_unavailable': errorMsg = 'Server SSO sedang tidak dapat dihubungi.'; break;
                case 'token_exchange_failed': errorMsg = 'Gagal menukarkan kode akses SSO.'; break;
                case 'no_id_token': errorMsg = 'Token identitas tidak ditemukan dari SSO.'; break;
                case 'token_invalid': errorMsg = 'Token identitas tidak valid.'; break;
                case 'claims_failed': errorMsg = 'Gagal membaca data identitas dari profil SSO Anda.'; break;
                case 'identity_not_found': errorMsg = 'Identitas (Email/NIP) tidak dikirimkan oleh server SSO.'; break;
                case 'access_denied': errorMsg = 'Akses Ditolak. Email SSO Anda tidak terdaftar sebagai Pegawai di Sistem (Master Data).'; break;
            }
            toast.error(errorMsg, { duration: 5000, id: 'sso-error' });
            
            // Bersihkan URL agar error tidak muncul terus saat direfresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [location]);

    return (
        <div className="min-h-screen flex font-sans bg-white">
            {/* LEFT PANEL */}
            <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-14 bg-primary-950 overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-[0.04] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:28px_28px]" />
                <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-[600px] h-[600px] rounded-full bg-primary-500/15 blur-3xl pointer-events-none" />

                {/* Branding */}
                <div className="relative z-10 flex flex-col items-start gap-4 mb-8">
                    <img src={Logo} alt="Logo Kemenko" className="h-28 w-28 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" />
                    <div>
                        <h2 className="text-white font-black text-2xl tracking-widest uppercase">INSPEKTORAT</h2>
                        <p className="text-primary-200 text-sm font-medium tracking-wider mt-1">Kementerian Koordinator Bidang Infrastruktur &amp; Pembangunan Kewilayahan</p>
                    </div>
                </div>

                {/* Hero */}
                <div className="relative z-10 flex-1 flex flex-col justify-center">
                    <div>
                        <span className="inline-block px-4 py-1.5 bg-accent-500/20 border border-accent-500/30 rounded-full text-accent-400 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                            Sistem Penilaian 360 Derajat
                        </span>
                        <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-6 tracking-tight">
                            Platform Evaluasi<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-accent-100">
                                SDM APIP
                            </span>
                        </h1>
                        <p className="text-primary-100/90 text-lg leading-relaxed max-w-lg mb-10">
                            Mewujudkan Aparatur Pengawasan Intern Pemerintah (APIP) yang berintegritas, objektif, dan profesional melalui sistem penilaian kinerja yang transparan.
                        </p>

                        <div className="grid grid-cols-2 gap-4 max-w-md">
                            {[
                                { icon: CheckCircle2, title: 'Objektif & Adil', desc: 'Penilaian holistik dari berbagai sudut pandang.' },
                                { icon: ShieldCheck, title: 'Aman & Terjamin', desc: 'Data dilindungi standar keamanan mutakhir.' },
                            ].map(({ icon: Icon, title, desc }) => (
                                <div key={title} className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md">
                                    <Icon className="text-accent-400 mb-3" size={24} />
                                    <h3 className="text-white font-bold text-sm mb-1">{title}</h3>
                                    <p className="text-primary-200 text-xs leading-relaxed">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="relative z-10 text-primary-400 text-sm font-medium mt-8">
                    © {new Date().getFullYear()} Inspektorat Kemenko Infra. Hak Cipta Dilindungi.
                </p>
            </div>

            {/* RIGHT PANEL */}
            <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-8 sm:p-16 bg-white relative">
                <div className="w-full max-w-sm">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
                        <img src={Logo} alt="Logo" className="h-12 w-12" />
                        <span className="font-bold text-slate-800 text-sm tracking-widest uppercase">SDM APIP</span>
                    </div>

                    {/* Heading */}
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Selamat Datang</h2>
                        <p className="text-slate-400 text-sm">Masuk menggunakan akun resmi instansi Kemenko Infra.</p>
                    </div>

                    {/* SSO Button — Single, Full Width */}
                    <div className="flex flex-col gap-4">
                        {/* Badge instansi resmi */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded-xl">
                            <Lock size={13} className="text-primary-600 shrink-0" />
                            <p className="text-[11px] font-semibold text-primary-700">
                                Akses eksklusif untuk pegawai Kemenko Infra
                            </p>
                        </div>

                        {/* Tombol SSO Utama */}
                        <button
                            id="btn-sso-kemenko"
                            onClick={() => { window.location.href = `/api/auth/sso/login`; }}
                            className="w-full group relative flex items-center justify-between gap-4 px-6 py-5 rounded-2xl bg-primary-700 hover:bg-primary-800 active:scale-[0.98] text-white transition-all duration-200 shadow-lg hover:shadow-xl overflow-hidden"
                        >
                            {/* Glow overlay on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            <div className="relative flex items-center gap-4">
                                <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/25 transition-colors">
                                    <ShieldCheck size={22} className="text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black tracking-wide leading-none">Login SSO Instansi</p>
                                    <p className="text-xs text-primary-200 mt-1 font-medium">Kemenko Infrastruktur &amp; Pembangunan Kewilayahan</p>
                                </div>
                            </div>

                            <ArrowRight
                                size={18}
                                className="relative text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0"
                            />
                        </button>

                        {/* Keterangan */}
                        <p className="text-center text-[11px] text-slate-400 leading-relaxed px-2">
                            Sistem akan mengenali identitas Anda secara otomatis<br />
                            melalui akun kedinasan yang telah terverifikasi.
                        </p>
                    </div>

                    {/* Admin link */}
                    <div className="mt-12 pt-6 border-t border-slate-100 text-center">
                        <Link
                            to="/super-admin/login"
                            className="text-[10px] font-semibold text-slate-300 hover:text-slate-500 uppercase tracking-[0.15em] transition-colors"
                        >
                            Portal Administrator →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
