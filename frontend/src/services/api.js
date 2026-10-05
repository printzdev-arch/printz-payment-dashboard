import axios from "axios";

// Consistent token & user localStorage keys
export const TOKEN_KEY = "token";
export const USER_KEY = "user";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT Bearer Token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global 401 Unauthorized handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    // Handle 401 Unauthorized (Expired or invalid token)
    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);

      // Redirect to login only if not already on the login page to avoid redirect loops
      const currentPath = window.location.pathname;
      if (currentPath !== "/" && currentPath !== "/login") {
        window.location.href = "/";
      }
    }

    // 403 Forbidden is intentionally NOT redirected (user is authenticated but unauthorized for this specific resource)
    return Promise.reject(error);
  }
);

export default api;
