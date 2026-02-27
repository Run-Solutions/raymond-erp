import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE_URL = 'http://localhost:8001'; // TODO: Use env var

export const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    if (Platform.OS !== 'web') {
        const token = await SecureStore.getItemAsync('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } else {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            // TODO: Implement refresh token logic here
        }
        return Promise.reject(error);
    }
);
