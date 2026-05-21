"""
작업 상태 및 로그 관리 모듈
"""
import json
from pathlib import Path
from datetime import datetime
from typing import Optional

BASE_DIR = Path(__file__).parent.parent.parent
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

def save_log(task_id: str, action: str, details: dict):
    """로그 저장"""
    log_file = LOG_DIR / f"{task_id}.json"
    log_data = {
        "task_id": task_id,
        "action": action,
        "details": details,
        "timestamp": datetime.now().isoformat()
    }
    with open(log_file, 'w', encoding='utf-8') as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)

def get_task_status(task_id: str) -> Optional[dict]:
    """작업 상태 조회"""
    log_file = LOG_DIR / f"{task_id}.json"
    if log_file.exists():
        with open(log_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None