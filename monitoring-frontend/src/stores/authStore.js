// src/stores/authStore.js
import { makeAutoObservable, runInAction } from "mobx";
import * as api from '../services/apiService';
import { jwtDecode } from 'jwt-decode'; // Потрібно встановити: npm install jwt-decode

class AuthStore {
    token = localStorage.getItem('accessToken') || null;
    user = null; // Буде містити { username, role }
    isLoading = false;
    error = null;

    constructor(rootStore) {
        makeAutoObservable(this, {}, { autoBind: true });
        this.rootStore = rootStore;
        if (this.token) {
            this.decodeAndSetUserFromToken(this.token);
        }
    }

    // Computed властивості для зручності
    get isAuthenticated() {
        return !!this.token;
    }

    get isAdmin() {
        return this.user?.role === 'admin';
    }

    decodeAndSetUserFromToken(token) {
        try {
            const decoded = jwtDecode(token);
            this.user = {
                username: decoded.sub, // 'sub' - це username
                role: decoded.role // 'role' - роль, яку ми додали на бекенді
            };
            this.token = token;
        } catch (error) {
            console.error("Failed to decode token:", error);
            this.logout(); // Якщо токен невалідний, виходимо з системи
        }
    }

    async login(username, password) {
        this.isLoading = true;
        this.error = null;
        try {
            const response = await api.loginUser(username, password);
            localStorage.setItem('accessToken', response.access_token);

            runInAction(() => {
                this.decodeAndSetUserFromToken(response.access_token);
                this.isLoading = false;
            });
            return true;
        } catch (error) {
            console.error("Login attempt failed:", error);
            runInAction(() => {
                this.error = error.response?.data?.detail || "Помилка входу. Перевірте логін та пароль.";
                this.isLoading = false;
            });
            return false;
        }
    }

    logout() {
        localStorage.removeItem('accessToken');
        runInAction(() => {
            this.token = null;
            this.user = null;
        });
    }

    // async fetchCurrentUser() { // Можна використовувати для оновлення даних користувача
    //     if (!this.token) return;
    //     this.isLoading = true;
    //     try {
    //         const userData = await api.getCurrentUser();
    //         runInAction(() => {
    //             this.user = { ...this.user, ...userData }; // Оновлюємо дані користувача
    //             this.isLoading = false;
    //         });
    //     } catch (error) {
    //         console.error("Failed to fetch current user", error);
    //         this.logout(); // Якщо токен невалідний
    //     }
    // }
}

export default AuthStore;