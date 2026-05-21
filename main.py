"""
RPA/AI 자동화 플랫폼 - 메인 애플리케이션
"""
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path

from src.routes import file_routes, task_routes

# 앱 초기화
app = FastAPI(title="RPA/AI 자동화 플랫폼", version="1.0.0")

BASE_DIR = Path(__file__).parent

# 템플릿 설정
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# 정적 파일 마운트
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

# === API 라우터 등록 ===
app.include_router(file_routes.router)
app.include_router(task_routes.router)

# === 라우트 ===
@app.get("/")
async def root(request: Request):
    """메인 페이지"""
    return templates.TemplateResponse(request=request, name="index.html")

@app.get("/rpa")
async def rpa_page(request: Request):
    """청구자료 작성 페이지"""
    return templates.TemplateResponse(request=request, name="rpa_dashboard.html")

@app.get("/oneclick")
async def oneclick_page(request: Request):
    """원클릭 일괄 생성 페이지"""
    return templates.TemplateResponse(request=request, name="oneclick.html")

@app.get("/process-status")
async def process_status_page(request: Request):
    """처리/미처리 가공 페이지"""
    return templates.TemplateResponse(request=request, name="process_status.html")

@app.get("/pdf-test")
async def pdf_test_page(request: Request):
    """PDF 추출 확인 페이지"""
    return templates.TemplateResponse(request=request, name="pdf_tester.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)