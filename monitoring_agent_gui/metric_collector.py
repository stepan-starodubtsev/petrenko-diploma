import psutil
import platform
import time
from datetime import datetime, timezone
from typing import List, Dict, Any


class MetricCollector:
    def get_agent_type(self) -> str:
        system = platform.system().lower()
        if system == "windows":
            return "windows_agent"
        elif system == "linux":
            return "ubuntu_agent"
        return "unknown_agent"

    def collect_metrics(self) -> List[Dict[str, Any]]:
        metrics = []
        now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        try:
            # CPU Utilization
            cpu_util = psutil.cpu_percent(interval=0.1)
            metrics.append({"metric_key": "system.cpu.utilization", "value_numeric": cpu_util, "timestamp": now_iso})
        except Exception as e:
            print(f"Error collecting CPU utilization: {e}")

        try:
            # Memory
            mem = psutil.virtual_memory()
            metrics.append(
                {"metric_key": "system.memory.total_mb", "value_numeric": round(mem.total / (1024 * 1024), 2),
                 "timestamp": now_iso})
            metrics.append(
                {"metric_key": "system.memory.available_mb", "value_numeric": round(mem.available / (1024 * 1024), 2),
                 "timestamp": now_iso})
            metrics.append(
                {"metric_key": "system.memory.used_percent", "value_numeric": mem.percent, "timestamp": now_iso})
        except Exception as e:
            print(f"Error collecting memory metrics: {e}")

        try:
            # Disk Usage
            disk_path = "C:\\" if platform.system().lower() == "windows" else "/"
            disk = psutil.disk_usage(disk_path)
            metrics.append({"metric_key": f"system.disk.total_gb[{disk_path}]",
                            "value_numeric": round(disk.total / (1024 * 1024 * 1024), 2), "timestamp": now_iso})
            metrics.append({"metric_key": f"system.disk.free_gb[{disk_path}]",
                            "value_numeric": round(disk.free / (1024 * 1024 * 1024), 2), "timestamp": now_iso})
            metrics.append({"metric_key": f"system.disk.used_percent[{disk_path}]", "value_numeric": disk.percent,
                            "timestamp": now_iso})
        except Exception as e:
            print(f"Error collecting disk metrics for {disk_path}: {e}")

        try:
            # System Uptime
            uptime_seconds = time.time() - psutil.boot_time()
            metrics.append(
                {"metric_key": "system.uptime_seconds", "value_numeric": round(uptime_seconds), "timestamp": now_iso})
        except Exception as e:
            print(f"Error collecting system uptime: {e}")

        return metrics


# Приклад використання:
if __name__ == "__main__":
    collector = MetricCollector()
    current_metrics = collector.collect_metrics()
    for metric in current_metrics:
        print(metric)
    print(f"Agent Type: {collector.get_agent_type()}")