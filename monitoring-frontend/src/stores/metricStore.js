// src/stores/metricStore.js
import { makeAutoObservable, runInAction } from "mobx";
import * as api from '../services/apiService';

class MetricStore {
    // Зберігаємо метрики у вигляді: { hostId_metricKey: [metricDataPoints], ... }
    // Або { hostId: { metricKey: [metricDataPoints], ... }, ... }
    // Для простоти почнемо з простого масиву для останнього запиту
    // Краще структурувати так, щоб легко додавати/оновлювати дані для графіків

    // Будемо зберігати метрики для КОНКРЕТНОГО хоста, які зараз переглядаються,
    // згруповані за ключем метрики.
    // {
    //   'system.cpu.utilization': [{timestamp: ..., value_numeric: ...}, ...],
    //   'system.memory.used_percent': [...]
    // }
    currentHostMetrics = {}; // Метрики для поточного вибраного хоста для графіків
    isLoadingMetrics = false;
    errorMetrics = null;
    latestMetricsForHost = {}; // { hostId: { metricKey: latestValueObject, ... } }
    isLoadingLatestMetrics = false; // Окремий стан завантаження

    constructor(rootStore) {
        makeAutoObservable(this, {}, { autoBind: true }); // autoBind для зручності
        this.rootStore = rootStore; // Для можливої взаємодії з іншими сторами
    }

    // Метод для завантаження історії метрик для конкретного хоста та ключа метрики
    // Може бути викликаний кілька разів для різних metric_key для побудови кількох графіків
    async fetchMetricHistory(hostId, metricKey, startTime, endTime, limit = 100, skip = 0) {
        this.isLoadingMetrics = true;
        this.errorMetrics = null;
        try {
            const params = { metric_key: metricKey, start_time: startTime, end_time: endTime, skip, limit };
            const data = await api.getMetricsForHost(hostId, params);
            runInAction(() => {
                // Зберігаємо історію для конкретного metricKey
                if (!this.currentHostMetrics[hostId]) {
                    this.currentHostMetrics[hostId] = {};
                }
                // Дані приходять відсортовані по timestamp.desc() з CRUD
                // Для графіків зазвичай потрібен зворотний порядок (старіші зліва)
                this.currentHostMetrics[hostId][metricKey] = data.slice().reverse();
                this.isLoadingMetrics = false;
            });
        } catch (error) {
            console.error(`Failed to fetch metrics for host ${hostId}, key ${metricKey}:`, error);
            runInAction(() => {
                this.errorMetrics = error.response?.data?.detail || error.message || `Could not fetch metrics for ${metricKey}`;
                this.isLoadingMetrics = false;
            });
        }
    }

    // Метод для завантаження набору ключових метрик для відображення (наприклад, останні значення)
    // Або це може бути частиною hostStore, якщо останні значення приходять разом з хостом.
    // Поки що зосередимося на історії для графіків.

    clearCurrentHostMetrics(hostId) {
        if (this.currentHostMetrics[hostId]) {
            runInAction(() => {
                delete this.currentHostMetrics[hostId];
                // Або this.currentHostMetrics[hostId] = {};
            });
        }
        // Або просто this.currentHostMetrics = {}; якщо завжди показуємо для одного хоста
    }
    async fetchLatestMetricsForHost(hostId, metricKeys) {
        this.isLoadingLatestMetrics = true;
        // Тут можна зробити кілька паралельних запитів або один спеціальний, якщо є на бекенді
        // Поки що зробимо кілька запитів з limit=1
        try {
            const results = {};
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // Останні 5 хв

            for (const key of metricKeys) {
                if (!key || key.startsWith('N/A')) continue; // Пропускаємо невалідні ключі
                // Можна додати перевірку, чи вже є дані, або чи йде завантаження для цього ключа
                const data = await api.getMetricsForHost(hostId, {
                    metric_key: key,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    limit: 1
                });
                if (data && data.length > 0) {
                    results[key] = data[0]; // Зберігаємо останню точку даних
                } else {
                    results[key] = null; // Або якийсь індикатор відсутності даних
                }
            }
            runInAction(() => {
                if (!this.latestMetricsForHost[hostId]) {
                    this.latestMetricsForHost[hostId] = {};
                }
                this.latestMetricsForHost[hostId] = { ...this.latestMetricsForHost[hostId], ...results };
                this.isLoadingLatestMetrics = false;
            });
        } catch (error) {
            // ... обробка помилки ...
            runInAction(() => {
                this.isLoadingLatestMetrics = false;
                // this.errorLatestMetrics = ...
            });
        }
    }

    getLatestMetric(hostId, metricKey) {
        return this.latestMetricsForHost[hostId]?.[metricKey];
    }
    // Computed властивість для отримання метрик для конкретного хоста та ключа
    getMetrics(hostId, metricKey) {
        return this.currentHostMetrics[hostId]?.[metricKey] || [];
    }
}

export default MetricStore;