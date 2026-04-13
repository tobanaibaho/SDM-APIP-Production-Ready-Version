import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ──────────────────────────────────────────────────────────────────────────────
// Axios Instance
// ──────────────────────────────────────────────────────────────────────────────
const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});

// ──────────────────────────────────────────────────────────────────────────────
// Silent Refresh Token Logic
// Saat access token expired (401), atasi dengan refresh token.
// Jika banyak request gagal bersamaan, semua antri menunggu satu proses refresh.
// ──────────────────────────────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (token) resolve(token);
        else reject(error);
    });
    failedQueue = [];
};

const forceLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
};

// ──────────────────────────────────────────────────────────────────────────────
// Request Interceptor — Sematkan token ke setiap request
// ──────────────────────────────────────────────────────────────────────────────
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ──────────────────────────────────────────────────────────────────────────────
// Response Interceptor — Tangani 401 dengan silent refresh
// ──────────────────────────────────────────────────────────────────────────────
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            // Jangan coba refresh jika endpoint refresh itu sendiri yang gagal
            if (originalRequest.url?.includes('/auth/refresh-token')) {
                forceLogout();
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // Jika refresh sedang berjalan, antri request ini
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve: (newToken: string) => {
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                            resolve(api(originalRequest));
                        },
                        reject,
                    });
                });
            }

            // Mulai proses refresh
            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Jangan kirim refresh token di body, peramban akan otomatis mengirim cookie HttpOnly
                const response = await axios.post('/api/auth/refresh-token', undefined, {
                    withCredentials: true,
                });
                const { token: newToken } = response.data.data;

                // Simpan access token baru
                localStorage.setItem('token', newToken);

                // Terapkan token baru ke request yang antri
                processQueue(null, newToken);

                // Ulangi request asli dengan token baru
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                forceLogout();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
