import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SetPasswordPage from './pages/SetPasswordPage';
import AdminDashboard from './pages/AdminDashboard';
import SDMManagement from './pages/SDMManagement';
import UserManagement from './pages/UserManagement';
import UserDashboard from './pages/UserDashboard';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminResetPage from './pages/AdminResetPage';
import GroupManagement from './pages/GroupManagement';
import AssessmentPeriodManagement from './pages/AssessmentPeriodManagement';
import MyGroupsPage from './pages/MyGroupsPage';
import AdminReportDashboard from './pages/AdminReportDashboard';
import ProfilePage from './pages/ProfilePage';
import AssessmentListPage from './pages/AssessmentListPage';
import AssessmentDetailPage from './pages/AssessmentDetailPage';
import AssessmentFormPage from './pages/AssessmentFormPage';
import AdminAuditLogs from './pages/AdminAuditLogs';
import CrossGroupRelationPage from './pages/CrossGroupRelationPage';
import AdminAssessmentMonitoringPage from './pages/AdminAssessmentMonitoringPage';

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

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
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
                                primary: '#10b981',
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
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
