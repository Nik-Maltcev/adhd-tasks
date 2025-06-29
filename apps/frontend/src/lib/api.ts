import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

// TEMP: Hard-code the backend URL to work around Vite env-var loading issues.
// TODO: revert to `import.meta.env.VITE_API_BASE_URL` once environment variables
// are confirmed to load correctly in all environments.
const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding the auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors (e.g., token expired or invalid)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark request as retried to prevent infinite loops
      useAuthStore.getState().logout(); // Clear token and user state
      toast.error('Session expired. Please log in again.');
      // Optionally, redirect to login page here if not handled by router
      // window.location.href = '/login';
    }

    // Generic error handling
    const errorMessage = error.response?.data?.error?.message || error.message || 'An unexpected error occurred.';
    toast.error(errorMessage);

    return Promise.reject(error);
  }
);

export default api;

// Example of how to use the API instance (for future reference in other files)
// import api from './lib/api';
//
// try {
//   const response = await api.get('/projects');
//   console.log(response.data);
// } catch (error) {
//   console.error('Error fetching projects:', error);
// }
