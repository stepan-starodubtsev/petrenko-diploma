import json
import os
import uuid
from typing import Dict, Any

CONFIG_FILENAME = "agent_config.json"
DEFAULT_SERVER_IP = "127.0.0.1"
DEFAULT_SERVER_PORT = 8000
DEFAULT_COLLECTION_INTERVAL = 5


class ConfigManager:
    def __init__(self, filename: str = CONFIG_FILENAME):
        self.filepath = filename
        self.config: Dict[str, Any] = self._load_or_initialize_config()

    def _load_or_initialize_config(self) -> Dict[str, Any]:
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, 'r') as f:
                    config = json.load(f)
                    config.setdefault("agent_id", str(uuid.uuid4()))
                    config.setdefault("server_ip", DEFAULT_SERVER_IP)
                    config.setdefault("server_port", DEFAULT_SERVER_PORT)
                    config.setdefault("collection_interval_seconds", DEFAULT_COLLECTION_INTERVAL)
                    if config["agent_id"] is None or not os.path.exists(self.filepath):
                        self._save_config(config)
                    return config
            except json.JSONDecodeError:
                print(f"Error decoding {self.filepath}. Initializing with default config.")

        default_config = {
            "agent_id": str(uuid.uuid4()),
            "server_ip": DEFAULT_SERVER_IP,
            "server_port": DEFAULT_SERVER_PORT,
            "collection_interval_seconds": DEFAULT_COLLECTION_INTERVAL,
        }
        self._save_config(default_config)
        print(f"New configuration file created: {self.filepath}")
        return default_config

    def _save_config(self, config_data: Dict[str, Any]):
        with open(self.filepath, 'w') as f:
            json.dump(config_data, f, indent=4)

    def get_setting(self, key: str, default: Any = None) -> Any:
        return self.config.get(key, default)

    def update_settings(self, new_settings: Dict[str, Any]):
        self.config.update(new_settings)
        self._save_config(self.config)
        print(f"Configuration updated and saved to {self.filepath}")

    def get_server_url(self) -> str:
        ip = self.get_setting("server_ip", DEFAULT_SERVER_IP)
        port = self.get_setting("server_port", DEFAULT_SERVER_PORT)
        return f"http://{ip}:{port}/api/v1"

    def get_agent_id(self) -> str:
        return self.get_setting("agent_id")

    def get_collection_interval(self) -> int:
        return int(self.get_setting("collection_interval_seconds", DEFAULT_COLLECTION_INTERVAL))


if __name__ == "__main__":
    cm = ConfigManager()
    print(f"Agent ID: {cm.get_agent_id()}")
    print(f"Server URL: {cm.get_server_url()}")
    print(f"Collection Interval: {cm.get_collection_interval()}s")

    # cm.update_settings({"server_ip": "192.168.1.100", "collection_interval_seconds": 30})
    # print(f"Updated Server IP: {cm.get_setting('server_ip')}")