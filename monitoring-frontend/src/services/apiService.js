// src/services/apiService.js
import axios from 'axios';

// Базовий URL твого FastAPI бекенду
// TODO: Винести в конфігурацію/змінні оточення для різних середовищ (dev, prod)
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Request Interceptor ---
// Цей interceptor буде додавати JWT токен до кожного запиту, якщо він є
apiClient.interceptors.request.use(
    (config) => {
        // Отримуємо токен з localStorage (або з твого authStore, якщо він там зберігається)
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- Response Interceptor (опціонально, для обробки глобальних помилок) ---
// apiClient.interceptors.response.use(
//     (response) => {
//         return response;
//     },
//     (error) => {
//         if (error.response && error.response.status === 401) {
//             // Наприклад, якщо токен невалідний або прострочений
//             console.error("Unauthorized request or token expired, logging out.");
//             // Тут можна викликати метод logout з authStore, щоб очистити дані
//             // та перенаправити на сторінку логіну.
//             // import { authStore } from '../stores'; // Потрібно буде налаштувати експорт/імпорт
//             // authStore.logout();
//             // window.location.href = '/login'; // Або через navigate, якщо доступно
//         }
//         return Promise.reject(error);
//     }
// );


// --- Функції для взаємодії з API ---

// --- Auth API ---
export const loginUser = async (username, password) => {
    // Для FastAPI OAuth2PasswordRequestForm дані надсилаються як application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    try {
        const response = await apiClient.post('/auth/token', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        // Якщо логін успішний, зберігаємо токен (це може робити authStore)
        if (response.data.access_token) {
            localStorage.setItem('accessToken', response.data.access_token);
        }
        return response.data;
    } catch (error) {
        console.error("Login error in apiService:", error.response ? error.response.data : error.message);
        // Очищаємо токен у разі помилки логіну
        localStorage.removeItem('accessToken');
        throw error;
    }
};

export const getCurrentUser = async () => {
    try {
        const response = await apiClient.get('/auth/users/me/');
        return response.data;
    } catch (error) {
        console.error("Error fetching current user:", error.response ? error.response.data : error.message);
        throw error;
    }
};

// --- Users API (Dev only, або захищені для адміна) ---
export const createDevUser = async (userData) => {
    try {
        // Цей ендпоінт може бути відкритим для першого користувача або захищеним
        const response = await apiClient.post('/auth/users/', userData);
        return response.data;
    } catch (error) {
        console.error("Error creating dev user:", error.response ? error.response.data : error.message);
        throw error;
    }
};

export const getDevUsers = async (skip = 0, limit = 100) => {
    try {
        // Цей ендпоінт має бути захищеним
        const response = await apiClient.get('/auth/users/', { params: { skip, limit } });
        return response.data;
    } catch (error) {
        console.error("Error fetching dev users:", error.response ? error.response.data : error.message);
        throw error;
    }
};

// --- Hosts API ---
export const getHosts = async (skip = 0, limit = 100) => {
    try {
        const response = await apiClient.get('/hosts/', { params: { skip, limit } });
        return response.data;
    } catch (error) {
        console.error("Error fetching hosts:", error.response ? error.response.data : error.message);
        throw error;
    }
};

export const getHostById = async (hostId) => {
    try {
        const response = await apiClient.get(`/hosts/${hostId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching host ${hostId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
};

export const createHost = async (hostData) => {
    try {
        const response = await apiClient.post('/hosts/', hostData);
        return response.data;
    } catch (error) {
        console.error("Error creating host:", error.response ? error.response.data : error.message);
        throw error;
    }
};

export const updateHost = async (hostId, hostData) => {
    try {
        const response = await apiClient.put(`/hosts/${hostId}`, hostData);
        return response.data;
    } catch (error) {
        console.error(`Error updating host ${hostId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
};

export const deleteHost = async (hostId) => {
    try {
        await apiClient.delete(`/hosts/${hostId}`);
    } catch (error) {
        console.error(`Error deleting host ${hostId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
};

// --- Agents API ---
export const submitAgentData = async (uniqueAgentId, payload) => {
    try {
        // Цей ендпоінт може мати свій власний механізм автентифікації (API ключ агента),
        // або бути відкритим, якщо реєстрація нового агента є публічною.
        // Якщо він захищений JWT, interceptor додасть токен.
        const response = await apiClient.post(`/agents/data/${uniqueAgentId}`, payload);
        return response.data;
    } catch (error) {
        console.error(`Error submitting agent data for ${uniqueAgentId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
};

export const getPendingAgents = async (skip = 0, limit = 100) => {
    try {
        const response = await apiClient.get('/agents/pending/', { params: { skip, limit } });
        return response.data;
    } catch (error) {
        console.error("Error fetching pending agents:", error.response ? error.response.data : error.message);
        throw error;
    }
};

export const approveAgent = async (uniqueAgentId, approvalData) => {
    try {
        const response = await apiClient.post(`/agents/pending/${uniqueAgentId}/approve`, approvalData);
        return response.data;
    } catch (error) {
        console.error(`Error approving agent ${uniqueAgentId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
};

// --- Metrics API ---
export const getMetricsForHost = async (hostId, params = {}) => {
    try {
        const response = await apiClient.get(`/hosts/${hostId}/metrics/`, { params });
        return response.data;
    } catch (error) {
        console.error(`Error fetching metrics for host ${hostId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
};

// --- TriggerConfigs API ---
export const createTriggerConfigForHost = async (hostId, triggerConfigData) => {
    try {
        const response = await apiClient.post(`/hosts/${hostId}/trigger-configs/`, triggerConfigData);
        return response.data;
    } catch (error) {
        console.error(`Error creating trigger config for host ${hostId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
};

export const getTriggerConfigsForHost = async (hostId, skip = 0, limit = 100) => {
    try {
        const response = await apiClient.get(`/hosts/${hostId}/trigger-configs/`, { params: { skip, limit } });
        return response.data;
    } catch (error) {
        console.error(`Error fetching trigger configs for host ${hostId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
};

export const getTriggerConfigById = async (triggerConfigId) => {
    try {
        const response = await apiClient.get(`/trigger-configs/${triggerConfigId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching trigger config ${triggerConfigId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
};

export const updateTriggerConfig = async (triggerConfigId, triggerConfigData) => {
    try {
        const response = await apiClient.put(`/trigger-configs/${triggerConfigId}`, triggerConfigData);
        return response.data;
    } catch (error) {
        console.error(`Error updating trigger config ${triggerConfigId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
};

export const deleteTriggerConfig = async (triggerConfigId) => {
    try {
        await apiClient.delete(`/trigger-configs/${triggerConfigId}`);
    } catch (error) {
        console.error(`Error deleting trigger config ${triggerConfigId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
};

export const getActiveProblems = async (skip = 0, limit = 100) => {
    try {
        const response = await apiClient.get('/problems/', { params: { skip, limit } });
        return response.data;
    } catch (error) {
        console.error("Error fetching active problems:", error.response ? error.response.data : error.message);
        throw error;
    }
};

export const updateUser = async (userId, userData) => {
    try {
        const response = await apiClient.put(`/auth/users/${userId}`, userData);
        return response.data;
    } catch (error) {
        console.error(`Error updating user ${userId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
};

export const deleteUser = async (userId) => {
    try {
        const response = await apiClient.delete(`/auth/users/${userId}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting user ${userId}:`, error.response ? error.response.data : error.message);
        throw error;
    }
};