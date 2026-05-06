import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../assets/logo.png';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

const LoginPage: React.FC = () => {

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
                        <p className="text-primary-200 text-sm font-medium tracking-wider mt-1">Kementerian Koordinator Bidang Infrastruktur & Pembangunan Kewilayahan</p>
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
                        <p className="text-slate-400 text-sm">Gunakan akun SSO instansi Anda untuk masuk.</p>
                    </div>

                    {/* SSO Buttons - 3 Kolom Sejajar */}
                    <div className="flex gap-3">
                        {/* Instansi / Kemenko */}
                        <button
                            onClick={() => { window.location.href = `/api/auth/sso/login`; }}
                            className="flex-1 flex flex-col items-center justify-center px-3 py-4 rounded-2xl bg-white border border-slate-200 hover:border-primary-300 hover:bg-primary-50 active:scale-[0.97] text-slate-700 transition-all shadow-sm group"
                        >
                            <div className="h-8 w-8 rounded-xl bg-primary-700 flex items-center justify-center mb-2 group-hover:bg-primary-800 transition-colors">
                                <ShieldCheck size={16} className="text-white" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 leading-none">Instansi</span>
                            <span className="text-[9px] text-slate-400 mt-0.5">SSO Kemenko</span>
                        </button>

                        {/* Google */}
                        <button
                            onClick={() => { window.location.href = `/api/auth/sso/login/google`; }}
                            className="flex-1 flex flex-col items-center justify-center px-3 py-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] text-slate-700 transition-all shadow-sm"
                        >
                            <svg className="h-8 w-8 mb-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="text-[11px] font-bold leading-none">Google</span>
                            <span className="text-[9px] text-slate-400 mt-0.5">Workspace</span>
                        </button>

                        {/* Microsoft */}
                        <button
                            onClick={() => { window.location.href = `/api/auth/sso/login/microsoft`; }}
                            className="flex-1 flex flex-col items-center justify-center px-3 py-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] text-slate-700 transition-all shadow-sm"
                        >
                            <svg className="h-8 w-8 mb-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" fill="#00a4ef" />
                            </svg>
                            <span className="text-[11px] font-bold leading-none">Microsoft</span>
                            <span className="text-[9px] text-slate-400 mt-0.5">365</span>
                        </button>
                    </div>

                    {/* Divider info */}
                    <p className="text-center text-[11px] text-slate-400 mt-6 leading-relaxed">
                        Sistem akan mengenali identitas Anda secara otomatis<br />melalui akun yang terverifikasi.
                    </p>

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
