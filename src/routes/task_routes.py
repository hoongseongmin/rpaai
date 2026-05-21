from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
import json

from src.utils.task_manager import get_task_status, LOG_DIR

router = APIRouter(prefix="/tasks", tags=["tasks"])

class TaskStatus(BaseModel):
    """작업 상태"""
    task_id: str
    status: str
    message: str
    created_at: str
    completed_at: Optional[str] = None

@router.get("")
async def list_tasks():
    """작업 목록 조회"""
    tasks = []
    for log_file in LOG_DIR.glob("*.json"):
        with open(log_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            tasks.append(data)
    return {"tasks": sorted(tasks, key=lambda x: x.get('timestamp', ''), reverse=True)}

@router.get("/{task_id}")
async def get_task(task_id: str):
    """작업 상세 조회"""
    status = get_task_status(task_id)
    if status:
        return status
    raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")