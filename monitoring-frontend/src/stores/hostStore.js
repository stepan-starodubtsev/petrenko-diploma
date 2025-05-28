// src/stores/hostStore.js
import { makeAutoObservable, runInAction, flow } from "mobx";
import * as api from '../services/apiService'; // Імпортуємо всі функції як об'єкт api

class HostStore {
    hosts = []; // Спостережуваний масив для списку всіх хостів
    currentHost = null; // Спостережуваний об'єкт для деталей одного хоста
    pendingAgents = []; // Спостережуваний масив для агентів, що очікують схвалення

    isLoadingHosts = false;
    isLoadingCurrentHost = false;
    isLoadingPendingAgents = false;

    errorHosts = null;
    errorCurrentHost = null;
    errorPendingAgents = null;

    // rootStore передається, якщо HostStore потрібно взаємодіяти з іншими сторами
    // або якщо RootStore керує створенням екземплярів сторів.
    // Для простоти поки що можна його не використовувати, якщо немає прямих залежностей.
    constructor(rootStore) {
        makeAutoObservable(this, {
            // Можна вказати опції для makeAutoObservable, якщо потрібно точніше керування,
            // але для більшості випадків дефолтних налаштувань достатньо.
            // fetchHosts: flow, // Позначаємо генератори як flow для кращої обробки async
            // fetchHostById: flow,
            // ... і так далі для інших асинхронних дій
        });
        this.rootStore = rootStore; // Зберігаємо посилання на rootStore, якщо він є
    }

    // Дія для завантаження списку хостів
    // Використання flow для асинхронних дій з генераторами є одним з варіантів в MobX
    // для більш чистої обробки стану завантаження/помилок без runInAction після кожного await.
    // Альтернатива - звичайний async/await з runInAction.
    *fetchHosts() {
        this.isLoadingHosts = true;
        this.errorHosts = null;
        try {
            const data = yield api.getHosts(); // yield замість await у flow
            // runInAction не потрібен, якщо метод позначений як flow
            this.hosts = data;
            this.isLoadingHosts = false;
        } catch (error) {
            console.error("Failed to fetch hosts in store:", error);
            this.errorHosts = error.response?.data?.detail || error.message || "Could not fetch hosts";
            this.isLoadingHosts = false;
        }
    }
    // Або звичайний async/await варіант:
    // async fetchHosts() {
    //     this.isLoadingHosts = true;
    //     this.errorHosts = null;
    //     try {
    //         const data = await api.getHosts();
    //         runInAction(() => {
    //             this.hosts = data;
    //             this.isLoadingHosts = false;
    //         });
    //     } catch (error) {
    //         console.error("Failed to fetch hosts in store:", error);
    //         runInAction(() => {
    //             this.errorHosts = error.response?.data?.detail || error.message || "Could not fetch hosts";
    //             this.isLoadingHosts = false;
    //         });
    //     }
    // }


    *fetchHostById(hostId) {
        this.isLoadingCurrentHost = true;
        this.errorCurrentHost = null;
        this.currentHost = null; // Скидаємо поточний хост перед завантаженням нового
        try {
            const data = yield api.getHostById(hostId);
            this.currentHost = data;
            this.isLoadingCurrentHost = false;
        } catch (error) {
            console.error(`Failed to fetch host ${hostId} in store:`, error);
            this.errorCurrentHost = error.response?.data?.detail || error.message || `Could not fetch host ${hostId}`;
            this.isLoadingCurrentHost = false;
        }
    }

    *addHost(hostData) {
        this.isLoadingHosts = true; // Можна використовувати окремий isLoadingCreateHost
        this.errorHosts = null;
        try {
            const newHost = yield api.createHost(hostData);
            // Оновлюємо список хостів або просто перезавантажуємо його
            // Для простоти, перезавантажимо список
            yield this.fetchHosts(); // Викликаємо інший генератор
            return newHost; // Повертаємо створений хост для можливої подальшої обробки
        } catch (error) {
            console.error("Failed to add host in store:", error);
            this.errorHosts = error.response?.data?.detail || error.message || "Could not add host";
            this.isLoadingHosts = false; // Не забуваємо скинути, якщо була помилка
            throw error; // Прокидаємо помилку далі, щоб компонент міг її обробити
        }
    }

    *editHost(hostId, hostUpdateData) {
        this.isLoadingCurrentHost = true; // Або isLoadingHosts, якщо оновлюємо зі списку
        this.errorCurrentHost = null;
        try {
            const updatedHost = yield api.updateHost(hostId, hostUpdateData);
            // Оновлюємо дані в списку та для поточного хоста, якщо він вибраний
            const hostIndex = this.hosts.findIndex(h => h.id === hostId);
            if (hostIndex !== -1) {
                this.hosts[hostIndex] = updatedHost;
            }
            if (this.currentHost && this.currentHost.id === hostId) {
                this.currentHost = updatedHost;
            }
            this.isLoadingCurrentHost = false;
            return updatedHost;
        } catch (error) {
            console.error(`Failed to update host ${hostId} in store:`, error);
            this.errorCurrentHost = error.response?.data?.detail || error.message || `Could not update host ${hostId}`;
            this.isLoadingCurrentHost = false;
            throw error;
        }
    }

    *removeHost(hostId) {
        // Можна додати isLoading для операції видалення
        // this.isLoadingHosts = true;
        this.errorHosts = null;
        try {
            yield api.deleteHost(hostId);
            // Видаляємо хост зі списку
            this.hosts = this.hosts.filter(h => h.id !== hostId);
            if (this.currentHost && this.currentHost.id === hostId) {
                this.currentHost = null; // Скидаємо, якщо видалили поточний хост
            }
            // this.isLoadingHosts = false;
        } catch (error) {
            console.error(`Failed to delete host ${hostId} in store:`, error);
            this.errorHosts = error.response?.data?.detail || error.message || `Could not delete host ${hostId}`;
            // this.isLoadingHosts = false;
            throw error;
        }
    }

    *fetchPendingAgents() {
        this.isLoadingPendingAgents = true;
        this.errorPendingAgents = null;
        try {
            const data = yield api.getPendingAgents();
            this.pendingAgents = data;
            this.isLoadingPendingAgents = false;
        } catch (error) {
            console.error("Failed to fetch pending agents in store:", error);
            this.errorPendingAgents = error.response?.data?.detail || error.message || "Could not fetch pending agents";
            this.isLoadingPendingAgents = false;
        }
    }

    *approveAgent(uniqueAgentId, approvalData) {
        // Можна додати окремий isLoading для цієї операції
        this.errorPendingAgents = null; // Скидаємо помилку
        try {
            const approvedHost = yield api.approveAgent(uniqueAgentId, approvalData);
            // Після успішного схвалення, перезавантажуємо список pending агентів
            // та, можливо, загальний список хостів
            yield this.fetchPendingAgents();
            yield this.fetchHosts(); // Щоб схвалений хост з'явився у загальному списку
            return approvedHost;
        } catch (error) {
            console.error(`Failed to approve agent ${uniqueAgentId} in store:`, error);
            this.errorPendingAgents = error.response?.data?.detail || error.message || `Could not approve agent ${uniqueAgentId}`;
            throw error;
        }
    }

    // Приклад computed властивості (гетер)
    get hostCount() {
        return this.hosts.length;
    }

    get problemHostCount() {
        return this.hosts.filter(h => h.availability_status === 'down' ||
            (h.trigger_configs && h.trigger_configs.some(t => t.current_status === 'problem'))
        ).length; // Потребує, щоб дані про тригери були в об'єкті хоста
    }
}

// Якщо ти не використовуєш RootStore, а окремі екземпляри:
// const hostStore = new HostStore();
// export default hostStore;

// Якщо використовуєш RootStore, експортуй клас:
export default HostStore;