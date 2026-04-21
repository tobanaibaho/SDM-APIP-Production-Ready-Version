import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, useToasterStore, toast } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Loading Component for Suspense
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-primary-950">
        <div className="relative w-12 h-12">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-emerald-500/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    </div>
);

// Lazy Loaded Pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const SetPasswordPage = lazy(() => import('./pages/SetPasswordPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const SDMManagement = lazy(() => import('./pages/SDMManagement'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const AdminResetPage = lazy(() => import('./pages/AdminResetPage'));
const GroupManagement = lazy(() => import('./pages/GroupManagement'));
const AssessmentPeriodManagement = lazy(() => import('./pages/AssessmentPeriodManagement'));
const MyGroupsPage = lazy(() => import('./pages/MyGroupsPage'));
const AdminReportDashboard = lazy(() => import('./pages/AdminReportDashboard'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AssessmentListPage = lazy(() => import('./pages/AssessmentListPage'));
const AssessmentDetailPage = lazy(() => import('./pages/AssessmentDetailPage'));
const AssessmentFormPage = lazy(() => import('./pages/AssessmentFormPage'));
const AdminAuditLogs = lazy(() => import('./pages/AdminAuditLogs'));
const CrossGroupRelationPage = lazy(() => import('./pages/CrossGroupRelationPage'));
const AdminAssessmentMonitoringPage = lazy(() => import('./pages/AdminAssessmentMonitoringPage'));
const AdminQuestionManagement = lazy(() => import('./pages/AdminQuestionManagement'));

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
    children,
    adminOnly = false,
}) => {
    const { isAuthenticated, isAdmin, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="loading-spinner" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

// Public Route Component (redirect if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, isAdmin, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="loading-spinner" />
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to={isAdmin ? '/super-admin' : '/dashboard'} replace />;
    }

    return <>{children}</>;
};

const AppRoutes: React.FC = () => {
    return (
        <Routes>
            {/* Public Routes */}
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <LoginPage />
                    </PublicRoute>
                }
            />
            <Route
                path="/register"
                element={
                    <PublicRoute>
                        <RegisterPage />
                    </PublicRoute>
                }
            />
            <Route
                path="/super-admin/login"
                element={
                    <PublicRoute>
                        <AdminLoginPage />
                    </PublicRoute>
                }
            />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/super-admin/reset-password" element={<AdminResetPage />} />

            {/* Super Admin Routes */}
            <Route
                path="/super-admin"
                element={
                    <ProtectedRoute adminOnly>
                        <AdminDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/super-admin/report"
                element={
                    <ProtectedRoute adminOnly>
                        <AdminReportDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/super-admin/sdm"
                element={
                    <ProtectedRoute adminOnly>
                        <SDMManagement />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/super-admin/users"
                element={
                    <ProtectedRoute adminOnly>
                        <UserManagement />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/super-admin/groups"
                element={
                    <ProtectedRoute adminOnly>
                        <GroupManagement />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/super-admin/periods"
                element={
                    <ProtectedRoute adminOnly>
                        <AssessmentPeriodManagement />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/super-admin/audit-logs"
                element={
                    <ProtectedRoute adminOnly>
                        <AdminAuditLogs />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/super-admin/cross-group-relations"
                element={
                    <ProtectedRoute adminOnly>
                        <CrossGroupRelationPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/super-admin/monitoring"
                element={
                    <ProtectedRoute adminOnly>
                        <AdminAssessmentMonitoringPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/super-admin/questions"
                element={
                    <ProtectedRoute adminOnly>
                        <AdminQuestionManagement />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/assessments/detail/:userId"
                element={
                    <ProtectedRoute adminOnly>
                        <AssessmentDetailPage />
                    </ProtectedRoute>
                }
            />


            {/* User Routes */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <UserDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/my-groups"
                element={
                    <ProtectedRoute>
                        <MyGroupsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/profile"
                element={
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                }
            />
            {/* NEW USER ASSESSMENT ROUTES */}
            <Route
                path="/user/assessments"
                element={
                    <ProtectedRoute>
                        <AssessmentListPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/user/assessments/new"
                element={
                    <ProtectedRoute>
                        <AssessmentFormPage />
                    </ProtectedRoute>
                }
            />

            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};

const ToastLimitEnforcer = () => {
    const { toasts } = useToasterStore();
    useEffect(() => {
        toasts
            .filter((t) => t.visible)
            .filter((_, i) => i >= 1) // limit to 1
            .forEach((t) => toast.dismiss(t.id));
    }, [toasts]);
    return null;
};

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ToastLimitEnforcer />
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#363636',
                            color: '#fff',
                            borderRadius: '8px',
                        },
                        success: {
                            iconTheme: {
                                primary: '#0ea5e9',
                                secondary: '#fff',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#fff',
                            },
                        },
                    }}
                />
                <Suspense fallback={<PageLoader />}>
                    <AppRoutes />
                </Suspense>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
