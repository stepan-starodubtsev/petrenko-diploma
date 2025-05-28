// src/stores/authStore.js
import { makeAutoObservable, runInAction } from "mobx";
import * as api from '../services/apiService'; // Припускаємо, що тут буде функція login

class AuthStore {
    isAuthenticated = false;
    user = null; // Може зберігати ім'я користувача або інші дані
    isLoading = false;
    error = null;

    constructor(rootStore) {
        makeAutoObservable(this, {}, { autoBind: true });
        this.rootStore = rootStore;
        this.checkAuthStatus(); // Перевіряємо статус при завантаженні
    }

    checkAuthStatus() {
        // Для MVP просто перевіряємо localStorage
        const storedAuth = localStorage.getItem('isAuthenticated');
        const storedUser = localStorage.getItem('username');
        if (storedAuth === 'true' && storedUser) {
            this.isAuthenticated = true;
            this.user = { username: storedUser };
        } else {
            this.isAuthenticated = false;
            this.user = null;
        }
    }

    // Імітація логіну
    async login(username, password) {
        this.isLoading = true;
        this.error = null;
        try {
            // TODO: Замінити на реальний виклик apiService.loginUser(username, password),
            // який повертатиме токен та, можливо, дані користувача.
            // Зараз просто імітуємо успіх, якщо username не порожній.
            if (!username || !password) {
                throw new Error("Ім'я користувача та пароль не можуть бути порожніми.");
            }

            // Тут мав би бути виклик до бекенду:
            // const response = await api.loginUser(username, password);
            // localStorage.setItem('accessToken', response.access_token);
            // Потім можна було б завантажити дані користувача через /users/me/
            // await this.fetchCurrentUser(); // (потрібно буде створити цей метод)

            // Тимчасова імітація:
            await new Promise(resolve => setTimeout(resolve, 500)); // Імітація затримки мережі

            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('username', username);

            runInAction(() => {
                this.isAuthenticated = true;
                this.user = { username: username }; // Зберігаємо ім'я користувача
                this.isLoading = false;
            });
            return true; // Успіх
        } catch (error) {
            console.error("Login attempt failed:", error);
            runInAction(() => {
                this.error = error.message || "Помилка входу";
                this.isLoading = false;
                this.isAuthenticated = false;
                this.user = null;
            });
            return false; // Невдача
        }
    }

    logout() {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('username');
        localStorage.removeItem('accessToken'); // Якщо використовується токен
        runInAction(() => {
            this.isAuthenticated = false;
            this.user = null;
        });
    }
}

export default AuthStore;