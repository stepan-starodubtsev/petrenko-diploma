// src/stores/uiStore.js
import { makeAutoObservable, action } from "mobx";

class UiStore {
    themeMode = 'light';

    constructor() {
        makeAutoObservable(this, {
            toggleTheme: action,
        });
    }

    toggleTheme() {
        this.themeMode = this.themeMode === 'light' ? 'dark' : 'light';
    }
}

export default UiStore;