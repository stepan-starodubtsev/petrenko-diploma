import requests
import json
from typing import List, Dict, Any
from datetime import datetime


class DataSender:
    def __init__(self, server_url: str, agent_id: str, agent_type: str):
        self.server_url = server_url
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.endpoint = f"{self.server_url}/agents/data/{self.agent_id}"

    def send_metrics(self, metrics_payload: List[Dict[str, Any]]) -> bool:
        data_to_send = {
            "agent_type": self.agent_type,
            "metrics": metrics_payload
        }

        try:
            print(f"Sending data to: {self.endpoint}")
            print(f"Payload: {json.dumps(data_to_send, indent=2)}")
            response = requests.post(self.endpoint, json=data_to_send, timeout=15)
            response.raise_for_status()
            print(f"Data sent successfully at {datetime.now()}: {response.status_code} - {response.json()}")
            return True
        except requests.exceptions.RequestException as e:
            print(f"Error sending data to server at {datetime.now()}: {e}")
            return False
        except json.JSONDecodeError as e:
            print(f"Error decoding server response at {datetime.now()}: {e} - Response text: {response.text}")
            return False


if __name__ == "__main__":
    from config_manager import ConfigManager
    from metric_collector import MetricCollector
    from datetime import datetime

    cfg_manager = ConfigManager()
    collector = MetricCollector()

    sender = DataSender(
        server_url=cfg_manager.get_server_url(),
        agent_id=cfg_manager.get_agent_id(),
        agent_type=collector.get_agent_type()
    )

    test_metrics = collector.collect_metrics()
    if test_metrics:
        sender.send_metrics(test_metrics)
    else:
        print("No metrics collected to send.")