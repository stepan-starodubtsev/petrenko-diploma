// src/stores/triggerStore.js
import { makeAutoObservable, runInAction } from "mobx";
import * as api from '../services/apiService';

class TriggerStore {
    // Зберігаємо конфігурації тригерів у вигляді: { hostId: [triggerConfigObjects], ... }
    triggerConfigsForHost = {};
    activeProblems = []; // Список всіх активних проблем (тригерів у стані "problem")

    currentTriggerConfig = null; // Для редагування конкретного тригера

    isLoadingConfigs = false; // Для завантаження конфігурацій для одного хоста
    isLoadingProblems = false; // Для завантаження списку всіх проблем
    isLoadingCurrent = false; // Для завантаження/оновлення одного тригера

    errorConfigs = null;
    errorProblems = null;
    errorCurrent = null;

    constructor(rootStore) {
        makeAutoObservable(this, {}, { autoBind: true });
        this.rootStore = rootStore;
    }

    async fetchTriggerConfigsForHost(hostId) {
        this.isLoadingConfigs = true;
        this.errorConfigs = null;
        try {
            const data = await api.getTriggerConfigsForHost(hostId);
            runInAction(() => {
                this.triggerConfigsForHost = {
                    ...this.triggerConfigsForHost,
                    [hostId]: data,
                };
                this.isLoadingConfigs = false;
            });
        } catch (error) {
            console.error(`Failed to fetch trigger configs for host ${hostId}:`, error);
            runInAction(() => {
                this.errorConfigs = error.response?.data?.detail || error.message || `Could not fetch trigger configs for host ${hostId}`;
                this.isLoadingConfigs = false;
            });
        }
    }

    async fetchTriggerConfigById(triggerConfigId) {
        this.isLoadingCurrent = true;
        this.errorCurrent = null;
        this.currentTriggerConfig = null;
        try {
            const data = await api.getTriggerConfigById(triggerConfigId);
            runInAction(() => {
                this.currentTriggerConfig = data;
                this.isLoadingCurrent = false;
            });
        } catch (error) {
            console.error(`Failed to fetch trigger config ${triggerConfigId}:`, error);
            runInAction(() => {
                this.errorCurrent = error.response?.data?.detail || error.message || `Could not fetch trigger config ${triggerConfigId}`;
                this.isLoadingCurrent = false;
            });
        }
    }

    async addTriggerConfigForHost(hostId, triggerConfigData) {
        this.isLoadingConfigs = true; // Можна використовувати окремий isCreatingTrigger
        this.errorConfigs = null;
        try {
            const newTriggerConfig = await api.createTriggerConfigForHost(hostId, triggerConfigData);
            runInAction(() => {
                // Додаємо новий тригер до списку для цього хоста
                const hostConfigs = this.triggerConfigsForHost[hostId] ? [...this.triggerConfigsForHost[hostId]] : [];
                hostConfigs.push(newTriggerConfig);
                this.triggerConfigsForHost = {
                    ...this.triggerConfigsForHost,
                    [hostId]: hostConfigs,
                };
                this.isLoadingConfigs = false;
            });
            return newTriggerConfig;
        } catch (error) {
            console.error(`Failed to add trigger config for host ${hostId}:`, error);
            runInAction(() => {
                this.errorConfigs = error.response?.data?.detail || error.message || "Could not add trigger config";
                this.isLoadingConfigs = false;
            });
            throw error;
        }
    }

    async editTriggerConfig(triggerConfigId, hostId, triggerUpdateData) {
        this.isLoadingCurrent = true; // Або isLoadingConfigs
        this.errorCurrent = null;
        try {
            const updatedTriggerConfig = await api.updateTriggerConfig(triggerConfigId, triggerUpdateData);
            runInAction(() => {
                // Оновлюємо тригер у списку для відповідного хоста
                if (this.triggerConfigsForHost[hostId]) {
                    const index = this.triggerConfigsForHost[hostId].findIndex(tc => tc.id === triggerConfigId);
                    if (index !== -1) {
                        this.triggerConfigsForHost[hostId][index] = updatedTriggerConfig;
                        // Створюємо новий масив, щоб MobX точно помітив зміну для перерендеру списків
                        this.triggerConfigsForHost[hostId] = [...this.triggerConfigsForHost[hostId]];
                    }
                }
                // Оновлюємо поточний тригер, якщо він вибраний
                if (this.currentTriggerConfig && this.currentTriggerConfig.id === triggerConfigId) {
                    this.currentTriggerConfig = updatedTriggerConfig;
                }
                this.isLoadingCurrent = false;
            });
            return updatedTriggerConfig;
        } catch (error) {
            console.error(`Failed to update trigger config ${triggerConfigId}:`, error);
            runInAction(() => {
                this.errorCurrent = error.response?.data?.detail || error.message || `Could not update trigger config ${triggerConfigId}`;
                this.isLoadingCurrent = false;
            });
            throw error;
        }
    }

    async removeTriggerConfig(triggerConfigId, hostId) {
        // Можна додати isLoading для операції видалення
        this.errorConfigs = null;
        try {
            await api.deleteTriggerConfig(triggerConfigId);
            runInAction(() => {
                if (this.triggerConfigsForHost[hostId]) {
                    this.triggerConfigsForHost[hostId] = this.triggerConfigsForHost[hostId].filter(tc => tc.id !== triggerConfigId);
                    // Створюємо новий масив для MobX
                    this.triggerConfigsForHost[hostId] = [...this.triggerConfigsForHost[hostId]];
                }
                if (this.currentTriggerConfig && this.currentTriggerConfig.id === triggerConfigId) {
                    this.currentTriggerConfig = null;
                }
            });
        } catch (error) {
            console.error(`Failed to delete trigger config ${triggerConfigId}:`, error);
            runInAction(() => {
                this.errorConfigs = error.response?.data?.detail || error.message || `Could not delete trigger config ${triggerConfigId}`;
            });
            throw error;
        }
    }

    async fetchActiveProblems() {
        this.isLoadingProblems = true;
        this.errorProblems = null;
        try {
            const data = await api.getActiveProblems();
            runInAction(() => {
                this.activeProblems = data;
                this.isLoadingProblems = false;
            });
        } catch (error) {
            console.error("Failed to fetch active problems:", error);
            runInAction(() => {
                this.errorProblems = error.response?.data?.detail || error.message || "Could not fetch active problems";
                this.isLoadingProblems = false;
            });
        }
    }

    // Метод для очищення даних при виході зі сторінки хоста, наприклад
    clearConfigsForHost(hostId) {
        if (this.triggerConfigsForHost[hostId]) {
            runInAction(() => {
                // Видаляємо ключ, щоб при наступному запиті дані точно завантажилися
                const { [hostId]: _, ...rest } = this.triggerConfigsForHost;
                this.triggerConfigsForHost = rest;
            });
        }
    }

    clearCurrentTriggerConfig() {
        runInAction(() => {
            this.currentTriggerConfig = null;
        });
    }

    // Computed властивості
    getTriggerConfigs(hostId) {
        return this.triggerConfigsForHost[hostId] || [];
    }

    get problemCount() {
        return this.activeProblems.length;
    }
}

export default TriggerStore;