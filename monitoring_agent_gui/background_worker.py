import time
import threading
from typing import Callable, Optional, List, Dict, Any

from config_manager import ConfigManager
from metric_collector import MetricCollector
from data_sender import DataSender


class BackgroundWorker:
    def __init__(self, config_manager: ConfigManager,
                 on_metrics_collected: Optional[Callable[[List[Dict[str, Any]]], None]] = None):
        self.config_manager = config_manager
        self.metric_collector = MetricCollector()
        self.data_sender: Optional[DataSender] = None
        self._update_sender_from_config()

        self.on_metrics_collected = on_metrics_collected

        self._running = False
        self._thread: Optional[threading.Thread] = None

    def _update_sender_from_config(self):
        self.data_sender = DataSender(
            server_url=self.config_manager.get_server_url(),
            agent_id=self.config_manager.get_agent_id(),
            agent_type=self.metric_collector.get_agent_type()
        )

    def _run(self):
        while self._running:
            self.config_manager._load_or_initialize_config()
            self._update_sender_from_config()

            interval = self.config_manager.get_collection_interval()
            print(f"Worker: Collecting metrics (interval: {interval}s)...")

            metrics = self.metric_collector.collect_metrics()

            if metrics:
                if self.on_metrics_collected:
                    try:
                        self.on_metrics_collected(metrics)
                    except Exception as e:
                        print(f"Error in on_metrics_collected callback: {e}")

                if self.data_sender:
                    self.data_sender.send_metrics(metrics)
                else:
                    print("Worker: DataSender not initialized, cannot send metrics.")
            else:
                print("Worker: No metrics collected.")

            for _ in range(interval):
                if not self._running:
                    break
                time.sleep(1)
        print("Background worker stopped.")

    def start(self):
        if not self._running:
            self._running = True
            self._thread = threading.Thread(target=self._run, daemon=True)
            self._thread.start()
            print("Background worker started.")

    def stop(self):
        self._running = False
        if self._thread and self._thread.is_alive():
            print("Stopping background worker...")
            self._thread.join(timeout=5)
            if self._thread.is_alive():
                print("Background worker did not stop in time.")
        else:
            print("Background worker was not running or already stopped.")


if __name__ == "__main__":
    def display_metrics_stub(metrics_list):
        print("\n--- Metrics Collected (for GUI stub) ---")
        for m in metrics_list:
            if m['value_numeric'] is not None:
                print(f"{m['metric_key']}: {m['value_numeric']} {m.get('unit', '')}")
            elif m['value_text'] is not None:
                print(f"{m['metric_key']}: {m['value_text']} {m.get('unit', '')}")
        print("--------------------------------------\n")


    cm = ConfigManager()
    worker = BackgroundWorker(config_manager=cm, on_metrics_collected=display_metrics_stub)
    worker.start()

    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        print("Main program interrupted.")
    finally:
        worker.stop()