"""
RPA/AI 자동화 플랫폼 - 메인 애플리케이션
"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
import os
import shutil
from pathlib import Path
from datetime import datetime
import json

# 앱 초기화
app = FastAPI(title="RPA/AI 자동화 플랫폼", version="1.0.0")

# 디렉토리 설정
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "data" / "uploads"
OUTPUT_DIR = BASE_DIR / "data" / "outputs"
LOG_DIR = BASE_DIR / "logs"

# 디렉토리 생성
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

# 템플릿 설정
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# 정적 파일 마운트
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


# === 데이터 모델 ===

class FileProcessRequest(BaseModel):
    """파일 처리 요청"""
    operation: str  # convert, merge, resize, etc.
    options: Optional[dict] = {}


class TaskStatus(BaseModel):
    """작업 상태"""
    task_id: str
    status: str  # pending, running, completed, failed
    message: str
    created_at: str
    completed_at: Optional[str] = None


# === 유틸리티 함수 ===

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


def get_task_status(task_id: str) -> TaskStatus:
    """작업 상태 조회"""
    log_file = LOG_DIR / f"{task_id}.json"
    if log_file.exists():
        with open(log_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return TaskStatus(**data)
    return None


# === 라우트 ===

@app.get("/")
async def root():
    """메인 페이지"""
    return {"message": "RPA/AI 자동화 플랫폼", "version": "1.0.0"}


@app.get("/files")
async def list_files():
    """파일 목록 조회"""
    files = []
    for f in UPLOAD_DIR.glob("*"):
        if f.is_file():
            files.append({
                "name": f.name,
                "size": f.stat().st_size,
                "created": datetime.fromtimestamp(f.stat().st_ctime).isoformat()
            })
    return {"files": files}


@app.post("/files/upload")
async def upload_file(file: UploadFile = File(...)):
    """파일 업로드"""
    task_id = f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    file_path = UPLOAD_DIR / file.filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        save_log(task_id, "upload", {
            "filename": file.filename,
            "size": file_path.stat().st_size
        })
        
        return {
            "task_id": task_id,
            "status": "completed",
            "message": f"{file.filename} 업로드 완료",
            "file_path": str(file_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/files/process")
async def process_file(
    operation: str,
    files: List[UploadFile] = File(...),
    options: Optional[str] = None
):
    """파일 처리"""
    task_id = f"process_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    parsed_options = {}
    if options:
        try:
            parsed_options = json.loads(options)
        except:
            pass
    
    results = []
    
    try:
        for file in files:
            # 파일 저장
            file_path = UPLOAD_DIR / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # 처리 operation별 로직
            output_path = None
            
            if operation == "convert":
                # 포맷 변환
                output_path = await convert_format(file_path, parsed_options)
            elif operation == "resize":
                # 이미지 리사이즈
                output_path = await resize_image(file_path, parsed_options)
            elif operation == "merge":
                # 파일 병합
                output_path = await merge_files(files, parsed_options)
            else:
                output_path = str(file_path)
            
            results.append({
                "input": file.filename,
                "output": output_path
            })
        
        save_log(task_id, "process", {
            "operation": operation,
            "files": [f.filename for f in files],
            "options": parsed_options
        })
        
        return {
            "task_id": task_id,
            "status": "completed",
            "message": f"{operation} 처리 완료",
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def convert_format(file_path: Path, options: dict) -> str:
    """포맷 변환"""
    from src.utils.file_processor import ImageProcessor
    
    target_format = options.get("format", "png")
    output_path = OUTPUT_DIR / f"{file_path.stem}.{target_format}"
    
    processor = ImageProcessor()
    processor.convert_format(str(file_path), target_format, str(output_path))
    
    return str(output_path)


async def resize_image(file_path: Path, options: dict) -> str:
    """이미지 리사이즈"""
    from src.utils.file_processor import ImageProcessor
    
    width = options.get("width", 800)
    height = options.get("height", 600)
    output_path = OUTPUT_DIR / f"resized_{file_path.name}"
    
    processor = ImageProcessor()
    processor.resize_image(str(file_path), width, height, str(output_path))
    
    return str(output_path)


async def merge_files(files: List[UploadFile], options: dict) -> str:
    """파일 병합"""
    import pandas as pd
    
    dfs = []
    for file in files:
        file_path = UPLOAD_DIR / file.filename
        if file_path.suffix == '.csv':
            df = pd.read_csv(file_path)
            dfs.append(df)
    
    if dfs:
        merged = pd.concat(dfs, ignore_index=True)
        output_path = OUTPUT_DIR / "merged.csv"
        merged.to_csv(output_path, index=False, encoding='utf-8-sig')
        return str(output_path)
    
    return str(OUTPUT_DIR / "merged.txt")


@app.get("/files/download/{filename}")
async def download_file(filename: str):
    """파일 다운로드"""
    file_path = OUTPUT_DIR / filename
    if file_path.exists():
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/octet-stream"
        )
    raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")


@app.get("/tasks")
async def list_tasks():
    """작업 목록 조회"""
    tasks = []
    for log_file in LOG_DIR.glob("*.json"):
        with open(log_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            tasks.append(data)
    return {"tasks": sorted(tasks, key=lambda x: x.get('timestamp', ''), reverse=True)}


@app.get("/tasks/{task_id}")
async def get_task(task_id: str):
    """작업 상세 조회"""
    status = get_task_status(task_id)
    if status:
        return status
    raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)