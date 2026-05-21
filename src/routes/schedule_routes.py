from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid

from src.utils.scheduler import scheduler, automated_task_runner

router = APIRouter(prefix="/api/schedule", tags=["schedule"])

class ScheduleRequest(BaseModel):
    customer: str
    frequency: str
    time: str
    use_email: bool

@router.get("")
def get_jobs():
    """등록된 스케줄 목록 조회"""
    jobs = scheduler.get_jobs()
    results = []
    for j in jobs:
        results.append({
            "id": j.id,
            "customer": j.kwargs.get('customer', '알 수 없음'),
            "time": f"{j.trigger.fields[4]}:{str(j.trigger.fields[5]).zfill(2)}", # hour:minute 형태
            "next_run": j.next_run_time.strftime("%Y-%m-%d %H:%M:%S") if j.next_run_time else None
        })
    return {"jobs": results}

@router.post("")
def add_job(req: ScheduleRequest):
    """새 스케줄 등록"""
    job_id = str(uuid.uuid4())
    hour, minute = map(int, req.time.split(':'))
    
    # 매일 지정된 시간에 실행하도록 등록
    scheduler.add_job(
        automated_task_runner,
        'cron', hour=hour, minute=minute,
        id=job_id,
        kwargs={'customer': req.customer, 'use_email': req.use_email}
    )
    return {"success": True, "message": "스케줄이 성공적으로 등록되었습니다.", "job_id": job_id}
    
@router.delete("/{job_id}")
def delete_job(job_id: str):
    """스케줄 삭제"""
    scheduler.remove_job(job_id)
    return {"success": True, "message": "스케줄이 삭제되었습니다."}