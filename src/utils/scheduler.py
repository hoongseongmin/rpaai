from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.memory import MemoryJobStore
from datetime import datetime

# 메모리 기반(재시작 시 초기화됨) 스케줄러 설정
jobstores = {
    'default': MemoryJobStore()
}
scheduler = BackgroundScheduler(jobstores=jobstores, timezone="Asia/Seoul")

def automated_task_runner(customer: str, use_email: bool):
    """스케줄러가 실행할 실제 파이썬 함수 (임시)"""
    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 🚀 스케줄러 작동!")
    print(f"고객사: {customer} | 이메일 수집 여부: {use_email}")
    # 향후 이곳에 '이메일 수집 -> 비교 -> 문서 생성' 로직이 들어갑니다.