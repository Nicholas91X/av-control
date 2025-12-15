import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
    baseURL: '/api', // Proxy handles redirection to backend
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor: Inject Access Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: Handle Token Refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Prevent infinite loops
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                // Call refresh endpoint directly (bypass interceptors to avoid loops)
                const response = await axios.post('/api/auth/refresh', {
                    refresh_token: refreshToken,
                });

                const newAccessToken = response.data.access_token;
                localStorage.setItem('access_token', newAccessToken);

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed (expired or invalid) -> Logout
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login'; // Redirect to login
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
