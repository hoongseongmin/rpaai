from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from typing import Optional, List
import shutil
from pathlib import Path
from datetime import datetime
import json
import re
import pandas as pd
import holidays

from src.automation.status_loader import compare_status_files
from src.utils.task_manager import save_log

router = APIRouter(prefix="/files", tags=["files"])

BASE_DIR = Path(__file__).parent.parent.parent
UPLOAD_DIR = BASE_DIR / "data" / "uploads"
OUTPUT_DIR = BASE_DIR / "data" / "outputs"
TEMPLATE_DIR = BASE_DIR / "data" / "templates"

UPLOAD_DIR_COMPARE = UPLOAD_DIR / "compare"
UPLOAD_DIR_STATUS = UPLOAD_DIR / "status"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR_COMPARE.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR_STATUS.mkdir(parents=True, exist_ok=True)
TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def get_upload_dir(task_type: str) -> Path:
    return UPLOAD_DIR_STATUS if task_type == "status" else UPLOAD_DIR_COMPARE

@router.get("")
async def list_files(task_type: str = "compare"):
    """파일 목록 조회"""
    files = []
    target_dir = get_upload_dir(task_type)
    for f in target_dir.glob("*"):
        if f.is_file():
            files.append({
                "name": f.name,
                "size": f.stat().st_size,
                "created": datetime.fromtimestamp(f.stat().st_ctime).isoformat()
            })
    return {"files": files}

@router.get("/templates/list")
async def list_templates():
    """템플릿 폴더 내 파일 목록 조회"""
    files = []
    for f in TEMPLATE_DIR.rglob("*"):
        if f.is_file():
            rel_path = f.relative_to(TEMPLATE_DIR)
            files.append({
                "name": f.name,
                "path": str(rel_path).replace("\\", "/"),
                "folder": str(rel_path.parent).replace("\\", "/") if str(rel_path.parent) != "." else "최상위",
                "size": f.stat().st_size,
                "created": datetime.fromtimestamp(f.stat().st_ctime).isoformat()
            })
    # 폴더별(경로별)로 정렬
    files.sort(key=lambda x: (x["folder"], x["name"]))
    return {"files": files}

@router.get("/holidays")
async def check_holidays(start_date: str, end_date: str):
    """선택한 기간 내의 주말 및 공휴일 목록 반환"""
    try:
        if start_date > end_date:
            return {"success": True, "holidays": []}
            
        kr_holidays = holidays.KR()
        date_range = pd.date_range(start=start_date, end=end_date)
        
        results = []
        for d in date_range:
            date_val = d.date()
            if date_val in kr_holidays:
                results.append({"date": str(date_val), "name": kr_holidays.get(date_val), "is_weekend": False})
            elif date_val.month == 5 and date_val.day == 1:
                results.append({"date": str(date_val), "name": "근로자의 날", "is_weekend": False})
            elif date_val.weekday() == 5:
                results.append({"date": str(date_val), "name": "토요일", "is_weekend": True})
            elif date_val.weekday() == 6:
                results.append({"date": str(date_val), "name": "일요일", "is_weekend": True})
                
        return {"success": True, "holidays": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload")
async def upload_files(task_type: str = Form("compare"), files: List[UploadFile] = File(...)):
    """다중 파일 업로드"""
    task_id = f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    saved_files = []
    target_dir = get_upload_dir(task_type)
    
    try:
        for file in files:
            file_path = target_dir / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            save_log(f"{task_id}_{file.filename}", "upload", {"filename": file.filename, "size": file_path.stat().st_size})
            saved_files.append(file.filename)
        
        return {
            "task_id": task_id,
            "status": "completed",
            "message": f"{len(saved_files)}개의 파일 업로드 완료",
            "filenames": saved_files
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process")
async def process_file(
    operation: str,
    customer: Optional[str] = None,
    files: Optional[List[UploadFile]] = File(None),
    filenames: Optional[List[str]] = Form(None),
    options: Optional[str] = None,
    diff_filenames: Optional[List[str]] = Form(None)
):
    """파일 처리"""
    task_id = f"process_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    parsed_options = json.loads(options) if options else {}
    results = []
    saved_paths = []
    
    task_type = "status" if operation == "process_status" else "compare"
    target_dir = get_upload_dir(task_type)

    try:
        if files:
            for file in files:
                file_path = target_dir / file.filename
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                saved_paths.append(file_path)
                
        if filenames:
            for fname in filenames:
                file_path = target_dir / fname
                if file_path.exists() and file_path not in saved_paths:
                    saved_paths.append(file_path)
                    
        if not saved_paths and not (operation.startswith("doc_") or operation.startswith("kp_") or operation.startswith("nice_")):
            raise ValueError("처리할 파일을 선택하거나 업로드해주세요. (기준 파일이 필요합니다)")
            
        # 작업에 맞지 않는 파일 확장자 방어 코드
        if operation in ["compare", "process_status"] or operation.startswith("doc_"):
            invalid_files = [f.name for f in saved_paths if f.suffix.lower() not in ['.csv', '.xlsx', '.xls']]
            if invalid_files:
                raise ValueError(f"데이터 파일(CSV, 엑셀)만 처리할 수 있습니다: {', '.join(invalid_files)}")
        
        if operation == "compare":
            if len(saved_paths) != 2:
                raise ValueError("비교를 위해서는 2개의 CSV 파일(기존 파일, 신규 파일)을 선택해야 합니다.")
            
            output_path = OUTPUT_DIR / f"차이결과_{datetime.now().strftime('%H%M%S')}.xlsx"
            result_info = compare_status_files(saved_paths[0], saved_paths[1], output_path)
            
            if result_info.get("success") and result_info.get("count") > 0:
                results.append({
                    "input": f"{saved_paths[0].name}, {saved_paths[1].name}", 
                    "output": str(output_path),
                    "summary": result_info.get("summary")
                })
            else:
                return {"task_id": task_id, "status": "completed", "message": result_info.get("message", "차이점이 없습니다."), "results": []}

        elif operation.startswith("doc_") or operation.startswith("kp_") or operation.startswith("nice_"):
            if not customer:
                raise ValueError("문서를 생성할 고객사를 선택해야 합니다.")
            
            diff_file = None
            if diff_filenames:
                # 💡 최종 생성 시, 무거운 재비교 작업 없이 이미 생성된 차이결과 파일을 즉시 재사용합니다.
                diff_file = [OUTPUT_DIR / f for f in diff_filenames if (OUTPUT_DIR / f).exists()]
            elif len(saved_paths) in [2, 4]:
                diff_files = []
                # 💡 첫 번째 그룹 즉석 비교
                out_path1 = OUTPUT_DIR / f"차이결과_G1_{datetime.now().strftime('%H%M%S')}.xlsx"
                result_info1 = compare_status_files(saved_paths[0], saved_paths[1], out_path1)
                
                # "차이점이 없습니다" 같은 상황에서는 파일이 안 만들어져도 에러 없이 정상 진행
                if not result_info1.get("success") and "차이" not in result_info1.get("message", ""):
                    raise ValueError(f"첫 번째 그룹 파일 비교 중 오류 발생: {result_info1.get('message', '알 수 없는 오류')}")
                if out_path1.exists():
                    diff_files.append(out_path1)

                # 💡 두 번째 그룹 즉석 비교
                if len(saved_paths) == 4:
                    out_path2 = OUTPUT_DIR / f"차이결과_G2_{datetime.now().strftime('%H%M%S')}.xlsx"
                    result_info2 = compare_status_files(saved_paths[2], saved_paths[3], out_path2)
                    if not result_info2.get("success") and "차이" not in result_info2.get("message", ""):
                        raise ValueError(f"두 번째 그룹 파일 비교 중 오류 발생: {result_info2.get('message', '알 수 없는 오류')}")
                    if out_path2.exists():
                        diff_files.append(out_path2)
                
                diff_file = diff_files
            elif len(saved_paths) == 1:
                diff_file = saved_paths[0]
            elif len(saved_paths) > 0:
                raise ValueError("문서 생성을 위해서는 1개(기존 결과), 2개(단일 그룹), 또는 4개(두 그룹)의 파일만 선택해야 합니다.")
            
            from src.automation.document_generator import generate_documents
            result_info = generate_documents(operation, customer, diff_file, OUTPUT_DIR, parsed_options)
            
            if result_info.get("success"):
                outputs = result_info["output"]
                
                # 💡 입력된 파일이 여러 개(리스트)인지 1개인지 확인하여 이름 추출
                if isinstance(diff_file, list):
                    input_names = ", ".join([f.name for f in diff_file if hasattr(f, 'name')])
                else:
                    input_names = diff_file.name if diff_file else "자동 매칭(가장 최신 파일)"

                if isinstance(outputs, list):
                    for out_path in outputs:
                        results.append({
                            "input": input_names,
                            "output": str(out_path),
                            "summary": result_info.get("summary")
                        })
                else:
                    results.append({
                        "input": input_names,
                        "output": outputs,
                        "summary": result_info.get("summary")
                    })
            else:
                raise ValueError(result_info.get("message", "문서 생성에 실패했습니다."))

        elif operation == "process_status":
            start_date = parsed_options.get('start_date')
            end_date = parsed_options.get('end_date')
            
            for file_path in saved_paths:
                time_str = datetime.now().strftime('%H%M%S')
                base_output_path = OUTPUT_DIR / f"(롯데계열)_정산기_처리현황_{time_str}.xlsx"
                edit_output_path = OUTPUT_DIR / f"(편집)_(롯데계열)_정산기_처리현황_{time_str}.xlsx"
                
                try:
                    # 💡 1행부터 5행까지 날리고 읽어오기 (6번째 줄이 헤더가 됨)
                    if file_path.suffix.lower() in ['.xlsx', '.xls']:
                        df = pd.read_excel(file_path, skiprows=5)
                    else:
                        try: 
                            df = pd.read_csv(file_path, skiprows=5, encoding='utf-8')
                        except UnicodeDecodeError: 
                            df = pd.read_csv(file_path, skiprows=5, encoding='cp949')
                    
                    # 💡 1. 상단 5행만 날린 기본형식 파일 저장
                    df.to_excel(base_output_path, index=False)
                    
                    # 💡 2. 앞으로 추가적인 가공을 진행할 편집용 데이터 복사본 생성
                    df_edit = df.copy()
                    
                    # --- 여기서부터 편집용(df_edit) 데이터 가공 시작 ---

                    # 💡 3. 컬럼 필터링: 요청된 열(고객명 포함)만 남기고 나머지는 삭제
                    COLUMNS_TO_KEEP = [
                        '시리얼', '고객명', '기관명', '지점명', '기번', '접수시간',
                        '작업종료시간', '작업내용', '비고', '작업유형', '작업소요시간'
                    ]
                    existing_cols = [col for col in COLUMNS_TO_KEEP if col in df_edit.columns]
                    df_edit = df_edit[existing_cols]

                    # 💡 한글/영어/숫자 혼용 컬럼 안전 처리 (기번, 시리얼 등)
                    # 파이썬이 숫자로만 된 값을 소수점(예: 123.0)으로 오해하지 않도록 완전한 문자로 변환
                    for col in ['기번', '시리얼']:
                        if col in df_edit.columns:
                            df_edit[col] = df_edit[col].astype(str).str.replace(r'\.0$', '', regex=True).replace('nan', '')

                    # 💡 4. 기간 및 휴일 필터링
                    START_TIME_COL = '접수시간'
                    END_TIME_COL = '작업종료시간'

                    # 날짜 형식으로 변환 (오류 발생 시 해당 행은 날짜 없음(NaT)으로 처리)
                    if START_TIME_COL in df_edit.columns:
                        df_edit[START_TIME_COL] = pd.to_datetime(df_edit[START_TIME_COL], errors='coerce')
                    if END_TIME_COL in df_edit.columns:
                        df_edit[END_TIME_COL] = pd.to_datetime(df_edit[END_TIME_COL], errors='coerce')

                    # 1) 대시보드에서 입력받은 기간으로 1차 필터링 (접수시간 기준)
                    if start_date and end_date and START_TIME_COL in df_edit.columns:
                        mask_date_range = (df_edit[START_TIME_COL] >= pd.to_datetime(start_date)) & \
                                          (df_edit[START_TIME_COL] <= pd.to_datetime(end_date) + pd.Timedelta(days=1) - pd.Timedelta(seconds=1))
                        df_edit = df_edit.loc[mask_date_range]

                    # 2) 휴일지원 대상 여부 판정 (삭제 대신 결과 표시)
                    kr_holidays = holidays.KR()
                    def is_holiday(date_val):
                        if pd.isna(date_val): return False
                        # 토, 일, 공휴일, 근로자의 날(5월 1일) 포함
                        return date_val.weekday() >= 5 or date_val.date() in kr_holidays or (date_val.month == 5 and date_val.day == 1)

                    def determine_holiday_support(row):
                        start = row.get(START_TIME_COL)
                        end = row.get(END_TIME_COL)
                        task_type = str(row.get('작업유형', ''))
                        
                        # 1. 작업유형 키워드 필터링
                        if '미처리' in task_type: return "X (제외사유: 미처리 포함)"
                        if '미방문' in task_type: return "X (제외사유: 미방문 포함)"
                        if '취소' in task_type: return "X (제외사유: 취소 포함)"
                        
                        # 2. 시간 데이터 누락 확인
                        if pd.isna(start) or pd.isna(end): return "X (제외사유: 시간 데이터 누락)"
                        
                        # 3. 시간 조건 확인
                        start_valid = is_holiday(start) or (start.weekday() == 4 and start.hour >= 18)
                        end_valid = is_holiday(end) or (not is_holiday(end) and end.hour < 9)
                        
                        if start_valid and end_valid: return "O"
                        if not start_valid: return "X (제외사유: 휴일 또는 금요일 18시 이후 접수 아님)"
                        if not end_valid: return "X (제외사유: 평일 9시 이후 종료)"
                        return "X (제외사유: 조건 미충족)"

                    if START_TIME_COL in df_edit.columns and END_TIME_COL in df_edit.columns:
                        df_edit['휴일지원_판정'] = df_edit.apply(determine_holiday_support, axis=1)
                    
                    # 💡 5. 정렬 및 'No' 컬럼 추가
                    if START_TIME_COL in df_edit.columns:
                        df_edit = df_edit.sort_values(by=START_TIME_COL, ascending=True)

                    # 'No' 컬럼 생성 후 '고객명'(또는 '시리얼') 뒤로 이동
                    df_edit.insert(0, 'No', range(1, len(df_edit) + 1))
                    if '시리얼' in df_edit.columns:
                        cols = df_edit.columns.tolist()
                        target_col = '고객명' if '고객명' in df_edit.columns else '시리얼'
                        target_index = cols.index(target_col)
                        cols.insert(target_index + 1, cols.pop(cols.index('No')))
                        df_edit = df_edit[cols]
                    
                    # 💡 6. 요일 컬럼 추가
                    weekday_map = {0: '월', 1: '화', 2: '수', 3: '목', 4: '금', 5: '토', 6: '일'}
                    if START_TIME_COL in df_edit.columns:
                        df_edit['접수요일'] = df_edit[START_TIME_COL].dt.weekday.map(weekday_map).fillna('')
                        cols = df_edit.columns.tolist()
                        idx = cols.index(START_TIME_COL)
                        cols.insert(idx + 1, cols.pop(cols.index('접수요일')))
                        df_edit = df_edit[cols]

                    if END_TIME_COL in df_edit.columns:
                        df_edit['종료요일'] = df_edit[END_TIME_COL].dt.weekday.map(weekday_map).fillna('')
                        cols = df_edit.columns.tolist()
                        idx = cols.index(END_TIME_COL)
                        cols.insert(idx + 1, cols.pop(cols.index('종료요일')))
                        df_edit = df_edit[cols]
                    
                    # 💡 7. 작업소요시간 컬럼 위치 이동 (원본 데이터 사용)
                    if '작업소요시간' in df_edit.columns:
                        cols = df_edit.columns.tolist()
                        target_idx = cols.index('종료요일') if '종료요일' in cols else (cols.index(END_TIME_COL) if END_TIME_COL in cols else len(cols)-1)
                        cols.insert(target_idx + 1, cols.pop(cols.index('작업소요시간')))
                        df_edit = df_edit[cols]
                    
                    # 💡 7.5 접수시간, 작업종료시간 포맷팅 (YYYY-MM-DD HH:MM)
                    if START_TIME_COL in df_edit.columns:
                        df_edit[START_TIME_COL] = df_edit[START_TIME_COL].dt.strftime('%Y-%m-%d %H:%M').fillna('')
                    if END_TIME_COL in df_edit.columns:
                        df_edit[END_TIME_COL] = df_edit[END_TIME_COL].dt.strftime('%Y-%m-%d %H:%M').fillna('')
                    
                    # 💡 8. 가공이 모두 끝난 편집용 파일 저장 및 폰트 서식 지정
                    with pd.ExcelWriter(edit_output_path, engine='openpyxl') as writer:
                        df_edit.to_excel(writer, index=False, sheet_name='처리현황')
                        worksheet = writer.sheets['처리현황']
                        
                        from openpyxl.styles import Font
                        custom_font = Font(name='페이퍼로지 4 Regular', size=10)
                        
                        for row in worksheet.iter_rows():
                            for cell in row:
                                cell.font = custom_font
                    
                    results.append({
                        "input": file_path.name,
                        "output": str(base_output_path),
                        "summary": {"message": f"1. 기본형식 변환 완료 (상단 5행 삭제)"}
                    })
                    results.append({
                        "input": file_path.name,
                        "output": str(edit_output_path),
                        "summary": {"message": f"2. 편집용 파일 생성 완료 (휴일지원_판정 결과 표시, {len(df_edit)}건)"}
                    })
                except Exception as e:
                    raise ValueError(f"엑셀 가공 중 오류 발생: {str(e)}")
        
        save_log(task_id, "process", {
            "operation": operation,
            "files": [f.name for f in saved_paths],
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

@router.get("/download/{filename}")
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

@router.delete("/{filename}")
async def delete_file(filename: str, task_type: str = "compare"):
    """파일 삭제"""
    target_dir = get_upload_dir(task_type)
    file_path = target_dir / filename
    if file_path.exists():
        try:
            file_path.unlink()
            return {"success": True, "message": f"{filename} 삭제 완료"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"파일 삭제 오류: {str(e)}")
    raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")

@router.post("/extract-stats")
async def extract_stats_from_pdf(file: UploadFile = File(...)):
    """PDF에서 이행실적 통계 데이터 추출"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다.")
        
    try:
        content = await file.read()
        import io
        import pdfplumber
        
        text = ""
        raw_tables = []
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"
                    
                    tables = page.extract_tables()
                    for table in tables:
                        raw_tables.append(table)
        except Exception as e:
            print(f"pdfplumber 처리 실패, OCR로 전환합니다. 오류: {e}")
            text = "" # 오류 발생 시 텍스트 초기화

        # 💡 pdfplumber가 텍스트를 거의 추출하지 못했다면 (이미지 PDF로 간주), OCR로 재시도
        if len(text.strip()) < 100:
            print("이미지 기반 PDF로 판단되어 OCR 추출을 시작합니다...")
            from pdf2image import convert_from_bytes
            import pytesseract
            
            # 실제 poppler의 bin 폴더 경로로 맞춰주세요.
            poppler_bin_path = r"C:\Program Files\poppler-26.02.0\Library\bin" 
            images = convert_from_bytes(content, poppler_path=poppler_bin_path)
            ocr_text = ""
            for img in images:
                ocr_text += pytesseract.image_to_string(img, lang='kor+eng') + "\n\n"
            text = ocr_text # OCR 결과로 텍스트를 교체
                
        # 추출할 데이터 딕셔너리
        stats = {
            "장애_적기처리건수": "",
            "장애_지연처리건수": "",
            "만족도조사_건수": "",
            "만족도조사_총점": "",
            "만족도조사_평점": "",
            "정기점검_총대상수": "",
            "정기점검_완료수": "",
            "정기점검_달성률": "",
            "이전설치_총대상수": "",
            "이전설치_완료수": "",
            "이전설치_달성률": ""
        }
        
        # === 1. 장애 적기처리 ===
        # "2. 항목별 서비스 이행내역" 표 기준 집중 공략
        m_error_sec2 = re.search(r'장애발생[\s\S]*?처리[컨건]수[\s\S]*?\n\s*([\d,]+)\s+([\d,]+)', text)
        if m_error_sec2:
            total_err = int(m_error_sec2.group(1).replace(',', ''))
            ontime_err = int(m_error_sec2.group(2).replace(',', ''))
            stats["장애_적기처리건수"] = str(ontime_err)
            stats["장애_지연처리건수"] = str(total_err - ontime_err)
        else:
            m_error_table = re.search(r'합\s*[A-Za-z가-힣]*\s*([\d,]+)\s+([\d,]+)', text)
            if m_error_table:
                total_err = int(m_error_table.group(1).replace(',', ''))
                ontime_err = int(m_error_table.group(2).replace(',', ''))
                stats["장애_적기처리건수"] = str(ontime_err)
                stats["장애_지연처리건수"] = str(total_err - ontime_err)

        # === 2. 만족도조사 ===
        m_survey_sec2 = re.search(r'설문응답[\s\S]*?\|\s*([\d\.]+)\s*\n\s*([\d,]+)\s+([\d,]+)', text)
        if m_survey_sec2:
            stats["만족도조사_평점"] = m_survey_sec2.group(1)
            stats["만족도조사_총점"] = m_survey_sec2.group(2).replace(',', '')
            stats["만족도조사_건수"] = m_survey_sec2.group(3).replace(',', '')
        else:
            m_survey_table = re.search(r'설문응답건수[\s\S]*?\n\s*([\d,]+)\s+(?:[\d\.]+\s+){4}([\d\.]+)', text)
            if m_survey_table:
                stats["만족도조사_건수"] = m_survey_table.group(1).replace(',', '')
                stats["만족도조사_총점"] = m_survey_table.group(2)
                stats["만족도조사_평점"] = m_survey_table.group(2)

        # === 3. 정기점검 ===
        m_inspect_sec2 = re.search(r'대상장비수[\s\S]*?\|\s*([\d\.,]+)\s*\n\s*([\d,]+)\s+([\d,]+)', text)
        if m_inspect_sec2:
            rate_str = m_inspect_sec2.group(1).replace(',', '')
            if len(rate_str) >= 3 and '.' not in rate_str:
                rate_str = f"{rate_str[:2]}.{rate_str[2:]}"  # 657로 붙어서 나오면 65.7로 교정
            stats["정기점검_달성률"] = rate_str
            stats["정기점검_완료수"] = m_inspect_sec2.group(2).replace(',', '')
            stats["정기점검_총대상수"] = m_inspect_sec2.group(3).replace(',', '')
        else:
            m_inspect_table = re.search(r'정기점[점검]\s*실시\s*내역[\s\S]*?([\d,]+)\s+([\d,]+)\s+([\d\.]+)%?', text)
            if m_inspect_table:
                stats["정기점검_총대상수"] = m_inspect_table.group(1).replace(',', '')
                stats["정기점검_완료수"] = m_inspect_table.group(2).replace(',', '')
                stats["정기점검_달성률"] = m_inspect_table.group(3)

        # === 4. 이전설치 ===
        m_install_sec2 = re.search(r'장비이전[\s\S]*?치리[컨건]수[\s\S]*?\n\s*([\d,]+)\s+([\d,]+)', text)
        if m_install_sec2:
            stats["이전설치_완료수"] = m_install_sec2.group(1).replace(',', '')
            stats["이전설치_총대상수"] = m_install_sec2.group(2).replace(',', '')
            stats["이전설치_달성률"] = "100" if stats["이전설치_총대상수"] == "0" else ""
        else:
            m_install_table = re.search(r'이전건수[\s\S]*?(?:~|-)\s*[\d\.]+\s*([\d,]+)\s*([\d,]+)\s*([\d\.]+)%?', text)
            if m_install_table:
                stats["이전설치_총대상수"] = m_install_table.group(1).replace(',', '')
                stats["이전설치_완료수"] = m_install_table.group(2).replace(',', '')
                stats["이전설치_달성률"] = m_install_table.group(3)

        return {"success": True, "stats": stats, "extracted_text": text, "extracted_tables": raw_tables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF 추출 오류: {str(e)}")