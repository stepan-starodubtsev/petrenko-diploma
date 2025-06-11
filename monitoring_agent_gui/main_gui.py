# monitoring_agent_gui/main_gui.py
import customtkinter as ctk
import threading
from typing import List, Dict, Any, Optional
import platform  # Потрібен для визначення шляху до диска

# Імпортуємо наші модулі
from config_manager import ConfigManager
from metric_collector import MetricCollector
from background_worker import BackgroundWorker

# Налаштування зовнішнього вигляду CustomTkinter
ctk.set_appearance_mode("System")
ctk.set_default_color_theme("blue")


# Клас вікна налаштувань залишається без змін
class SettingsWindow(ctk.CTkToplevel):
    def __init__(self, master, config_manager: ConfigManager, app_instance):
        # ... (код SettingsWindow залишається таким же, як у попередньому повідомленні)
        super().__init__(master)
        self.config_manager = config_manager
        self.app_instance = app_instance

        self.title("Налаштування Агента")
        self.geometry("400x300")
        self.transient(master)
        self.grab_set()

        ctk.CTkLabel(self, text="IP Адреса Сервера:").grid(row=0, column=0, padx=10, pady=10, sticky="w")
        self.server_ip_entry = ctk.CTkEntry(self, width=200)
        self.server_ip_entry.grid(row=0, column=1, padx=10, pady=10, sticky="ew")
        self.server_ip_entry.insert(0, self.config_manager.get_setting("server_ip"))

        ctk.CTkLabel(self, text="Порт Сервера:").grid(row=1, column=0, padx=10, pady=10, sticky="w")
        self.server_port_entry = ctk.CTkEntry(self, width=200)
        self.server_port_entry.grid(row=1, column=1, padx=10, pady=10, sticky="ew")
        self.server_port_entry.insert(0, str(self.config_manager.get_setting("server_port")))

        ctk.CTkLabel(self, text="Інтервал збору (сек):").grid(row=2, column=0, padx=10, pady=10, sticky="w")
        self.interval_entry = ctk.CTkEntry(self, width=200)
        self.interval_entry.grid(row=2, column=1, padx=10, pady=10, sticky="ew")
        self.interval_entry.insert(0, str(self.config_manager.get_setting("collection_interval_seconds")))

        button_frame = ctk.CTkFrame(self, fg_color="transparent")
        button_frame.grid(row=3, column=0, columnspan=2, pady=20)

        self.save_button = ctk.CTkButton(button_frame, text="Зберегти", command=self.save_settings)
        self.save_button.pack(side="left", padx=10)

        self.cancel_button = ctk.CTkButton(button_frame, text="Скасувати", command=self.destroy)
        self.cancel_button.pack(side="left", padx=10)

        self.grid_columnconfigure(1, weight=1)

    def save_settings(self):
        try:
            new_settings = {
                "server_ip": self.server_ip_entry.get(),
                "server_port": int(self.server_port_entry.get()),
                "collection_interval_seconds": int(self.interval_entry.get())
            }
            if not (1 <= new_settings["server_port"] <= 65535):
                raise ValueError("Порт сервера має бути між 1 та 65535")
            if not (5 <= new_settings["collection_interval_seconds"] <= 3600):
                raise ValueError("Інтервал збору має бути між 5 та 3600 секундами")

            self.config_manager.update_settings(new_settings)
            print("Налаштування збережено.")
            if self.app_instance:
                self.app_instance.update_status_display()
            self.destroy()
        except ValueError as e:
            print(f"Помилка збереження налаштувань: {e}")
            error_label = ctk.CTkLabel(self, text=str(e), text_color="red")
            error_label.grid(row=4, column=0, columnspan=2, pady=5)
            self.after(3000, error_label.destroy)


class App(ctk.CTk):
    def __init__(self, config_manager: ConfigManager, background_worker: BackgroundWorker):
        super().__init__()
        self.config_manager = config_manager
        self.metric_collector = MetricCollector()  # Створюємо екземпляр збирача метрик
        self.background_worker = background_worker
        # !!! Змінено: on_metrics_collected тепер не оновлює GUI напряму
        # self.background_worker.on_metrics_collected = self.schedule_gui_metric_update

        self.title("Моніторинг Агент")
        self.geometry("500x450")

        # --- Фрейм для статусу ---
        self.status_frame = ctk.CTkFrame(self)
        self.status_frame.pack(pady=10, padx=10, fill="x")

        self.agent_id_label = ctk.CTkLabel(self.status_frame, text="Agent ID: Завантаження...")
        self.agent_id_label.pack(pady=2)
        self.server_url_label = ctk.CTkLabel(self.status_frame, text="Сервер: Завантаження...")
        self.server_url_label.pack(pady=2)
        self.interval_label = ctk.CTkLabel(self.status_frame, text="Інтервал відправки: Завантаження...")
        self.worker_status_label = ctk.CTkLabel(self.status_frame, text="Статус воркера: Зупинено", text_color="gray")
        self.worker_status_label.pack(pady=2)

        self.update_status_display()

        # --- Фрейм для метрик ---
        self.metrics_frame = ctk.CTkFrame(self)
        self.metrics_frame.pack(pady=10, padx=10, fill="both", expand=True)

        ctk.CTkLabel(self.metrics_frame, text="Основні Метрики:", font=("Arial", 16, "bold")).pack(pady=(5, 10))

        self.cpu_label = ctk.CTkLabel(self.metrics_frame, text="CPU: - %", font=("Arial", 14))
        self.cpu_label.pack(pady=5, anchor="w", padx=20)
        self.ram_label = ctk.CTkLabel(self.metrics_frame, text="RAM Використано: - %", font=("Arial", 14))
        self.ram_label.pack(pady=5, anchor="w", padx=20)

        self.disk_display_path = "C:\\" if platform.system().lower() == "windows" else "/"
        self.disk_label = ctk.CTkLabel(self.metrics_frame, text=f"Диск ({self.disk_display_path}) Використано: - %",
                                       font=("Arial", 14))
        self.disk_label.pack(pady=5, anchor="w", padx=20)

        self.uptime_label = ctk.CTkLabel(self.metrics_frame, text="Uptime: -", font=("Arial", 14))
        self.uptime_label.pack(pady=5, anchor="w", padx=20)

        # --- Кнопки управління ---
        self.control_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.control_frame.pack(pady=10, padx=10, fill="x")

        self.start_button = ctk.CTkButton(self.control_frame, text="Старт Воркера", command=self.start_worker)
        self.start_button.pack(side="left", padx=5, expand=True)

        self.stop_button = ctk.CTkButton(self.control_frame, text="Стоп Воркера", command=self.stop_worker,
                                         fg_color="red", hover_color="darkred")
        self.stop_button.pack(side="left", padx=5, expand=True)

        self.settings_button = ctk.CTkButton(self.control_frame, text="Налаштування", command=self.open_settings_window)
        self.settings_button.pack(side="left", padx=5, expand=True)

        self.protocol("WM_DELETE_WINDOW", self.on_closing)

        # Запускаємо воркер та GUI оновлення автоматично
        self.start_worker()
        self.update_gui_metrics_periodically()  # <--- НОВИЙ ВИКЛИК

    def update_status_display(self):
        self.agent_id_label.configure(text=f"Agent ID: {self.config_manager.get_agent_id()}")
        self.server_url_label.configure(text=f"Сервер: {self.config_manager.get_server_url()}")
        self.interval_label.configure(text=f"Інтервал відправки: {self.config_manager.get_collection_interval()} сек")

    # Метод для форматування uptime (можна винести в окремий utils файл)
    def _format_uptime(self, seconds: float) -> str:
        # ... (код _format_uptime залишається таким же, як у попередньому повідомленні) ...
        days = int(seconds // (24 * 3600))
        seconds %= (24 * 3600)
        hours = int(seconds // 3600)
        seconds %= 3600
        minutes = int(seconds // 60)
        seconds = int(seconds % 60)
        parts = []
        if days > 0: parts.append(f"{days}д")
        if hours > 0: parts.append(f"{hours}г")
        if minutes > 0: parts.append(f"{minutes}хв")
        if seconds > 0 or not parts: parts.append(f"{seconds}с")
        return " ".join(parts)

    # НОВИЙ МЕТОД: Оновлення метрик в GUI з заданим інтервалом
    def update_gui_metrics_periodically(self):
        """
        Збирає метрики ТІЛЬКИ для відображення в GUI і планує свій наступний запуск.
        """
        # Збираємо метрики за допомогою нашого collector'а
        metrics = self.metric_collector.collect_metrics()

        # Оновлюємо лейбли в GUI
        self._update_metrics_on_gui(metrics)

        # Плануємо наступний виклик цієї ж функції через 1000 мс (1 секунду)
        # self.after() - це метод Tkinter для запуску функції через певний час
        # без блокування головного потоку GUI.
        self.after(1000, self.update_gui_metrics_periodically)

    def _update_metrics_on_gui(self, metrics: List[Dict[str, Any]]):
        """
        Безпосередньо оновлює тексти лейблів в GUI.
        """
        for metric in metrics:
            key = metric.get("metric_key")
            value_num = metric.get("value_numeric")

            if key == "system.cpu.utilization" and value_num is not None:
                self.cpu_label.configure(text=f"CPU: {value_num:.1f} %")
            elif key == "system.memory.used_percent" and value_num is not None:
                self.ram_label.configure(text=f"RAM Використано: {value_num:.1f} %")
            elif key == f"system.disk.used_percent[{self.disk_display_path}]" and value_num is not None:
                self.disk_label.configure(text=f"Диск ({self.disk_display_path}) Використано: {value_num:.1f} %")
            elif key == "system.uptime_seconds" and value_num is not None:
                self.uptime_label.configure(text=f"Uptime: {self._format_uptime(value_num)}")

    def open_settings_window(self):
        # ... (як було)
        if hasattr(self, "_settings_window") and self._settings_window.winfo_exists():
            self._settings_window.focus()
        else:
            self._settings_window = SettingsWindow(self, self.config_manager, self)

    def start_worker(self):
        if not self.background_worker._running:
            self.background_worker.start()
            self.worker_status_label.configure(text="Статус воркера: Працює", text_color="green")
        else:
            print("Воркер вже запущено.")

    def stop_worker(self):
        if self.background_worker._running:
            self.background_worker.stop()
            self.worker_status_label.configure(text="Статус воркера: Зупинено", text_color="red")
        else:
            print("Воркер не був запущений.")

    def on_closing(self):
        print("Закриття додатку...")
        self.stop_worker()
        self.destroy()


if __name__ == "__main__":
    # Створюємо екземпляр MetricCollector тут, щоб передати його в App
    # Хоча App створює свій власний, щоб уникнути передачі, можна залишити так.
    cm = ConfigManager()


    # Callback для BackgroundWorker тепер не потрібен для оновлення GUI,
    # але може бути корисним для логування або інших дій.
    def worker_callback(metrics_list):
        print(f"Background worker has just collected {len(metrics_list)} metrics to be sent.")


    # Передаємо callback в BackgroundWorker (опціонально)
    bg_worker = BackgroundWorker(config_manager=cm, on_metrics_collected=worker_callback)

    app = App(config_manager=cm, background_worker=bg_worker)
    app.mainloop()
