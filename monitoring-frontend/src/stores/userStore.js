// src/stores/userStore.js
import { makeAutoObservable, runInAction } from "mobx";
import * as api from '../services/apiService';

class UserStore {
    users = [];
    isLoading = false;
    error = null;

    constructor(rootStore) {
        makeAutoObservable(this, {}, { autoBind: true });
        this.rootStore = rootStore;
    }

    async fetchUsers() {
        this.isLoading = true;
        this.error = null;
        try {
            const data = await api.getDevUsers(); // Використовуємо getDevUsers, який тепер захищений
            runInAction(() => {
                this.users = data;
            });
        } catch (error) {
            console.error("Failed to fetch users:", error);
            runInAction(() => {
                this.error = "Не вдалося завантажити список користувачів.";
            });
        } finally {
            runInAction(() => {
                this.isLoading = false;
            });
        }
    }

    async addUser(userData) {
        // isLoading та error будуть оброблятися в компоненті, який викликає
        const newUser = await api.createDevUser(userData);
        // Оновлюємо список після успішного додавання
        this.fetchUsers();
        return newUser;
    }

    async updateUser(userId, userData) {
        const updatedUser = await api.updateUser(userId, userData);
        // Оновлюємо список після успішного оновлення
        this.fetchUsers();
        return updatedUser;
    }

    async removeUser(userId) {
        await api.deleteUser(userId);
        // Оновлюємо список після успішного видалення
        runInAction(() => {
            this.users = this.users.filter(user => user.id !== userId);
        });
    }
}

export default UserStore;