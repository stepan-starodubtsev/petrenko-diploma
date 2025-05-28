// src/stores/index.js
import React, { createContext, useContext } from 'react';
import UiStore from './uiStore';
import HostStore from './hostStore'; // <--- Перевір цей імпорт
import MetricStore from './metricStore';
import TriggerStore from './triggerStore';
import AuthStore from "./authStore.js";

export class RootStore {
    constructor() {
        this.uiStore = new UiStore();
        this.hostStore = new HostStore(this);// <--- Переконайся, що HostStore тут не undefined і є конструктором
        this.metricStore = new MetricStore(this);
        this.triggerStore = new TriggerStore(this);
        this.authStore = new AuthStore(this); // <--- Створюємо екземпляр AuthStore
    }
}

export const rootStore = new RootStore();

export const StoreContext = createContext(rootStore); // Передаємо екземпляр

export const useStores = () => useContext(StoreContext);