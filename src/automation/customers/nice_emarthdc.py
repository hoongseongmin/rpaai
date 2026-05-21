import pandas as pd
from pathlib import Path
from datetime import datetime
from openpyxl import load_workbook
from copy import copy
import re
import json
import shutil
from docxtpl import DocxTemplate

from ._common import parse_money, number_to_korean_currency

def process_billing_outputs(master_billing_path: Path) -> dict:
    master_path = Path(master_billing_path)
    if not master_path.exists():
        raise FileNotFoundError(f"마스터 파일을 찾을 수 없습니다: {master_path}")
        
    output_dir = master_path.parent
    base_name = master_path.stem
    
    send_out = output_dir / f"{base_name}_송부본.xlsx"
    issue_out = output_dir / f"{base_name}_발행리스트.xlsx"
    
    # 송부본과 발행리스트 기본 복사
    shutil.copy2(master_path, send_out)
    shutil.copy2(master_path, issue_out)
    
    # 발행리스트에서 데이터 삭제
    wb = load_workbook(str(issue_out), data_only=False)
    ws = wb.active
    
    header_row = None
    target_col_idx = None
    
    for row_idx in range(1, min(ws.max_row, 30) + 1):
        for col_idx in range(1, ws.max_column + 1):
            cell_val = ws.cell(row=row_idx, column=col_idx).value
            if isinstance(cell_val, str) and "청구개월수" in cell_val.replace(" ", ""):
                header_row = row_idx
                target_col_idx = col_idx
                break
        if header_row:
            break
            
    if not header_row:
        raise ValueError("'청구개월수' 헤더를 찾을 수 없습니다. 엑셀 구조를 확인해 주세요.")
        
    # 하단에서부터 역순으로 탐색
    for row_idx in range(ws.max_row, header_row, -1):
        is_summary = False
        for col_idx in range(1, ws.max_column + 1):
            cell = ws.cell(row=row_idx, column=col_idx)
            if cell.data_type == 'f':  # 수식이 포함된 셀
                is_summary = True
                break
            val_str = str(cell.value).replace(" ", "") if cell.value else ""
            if "소계" in val_str or "합계" in val_str:
                is_summary = True
                break
                
        if is_summary:
            continue
            
        val_cell = ws.cell(row=row_idx, column=target_col_idx).value
        
        should_delete = False
        if val_cell is None:
            should_delete = True
        else:
            try:
                num_val = float(val_cell)
                if num_val <= 0:
                    should_delete = True
            except ValueError:
                should_delete = True
                
        if should_delete:
            ws.delete_rows(row_idx)
            
    wb.save(str(issue_out))
    
    return {
        "send_file": str(send_out),
        "issue_file": str(issue_out)
    }

def process_nice_emarthdc(operation: str, customer: str, diff_file_path: Path, output_dir: Path, options: dict) -> dict:
    """나이스CMS 이마트신세계HDC 전용 생성 프로세스 (메인 라우터 연결용)"""
    options = options or {}
    
    if operation in ['nice_emarthdc_1', 'doc_official']:
        templates_dir = output_dir.parent / "templates"
        
        # 1. 워드 공문 생성용 변수 세팅
        context = {
            '작업명': 'nicecms_emarthdc',
            '공문번호': '',
            '합계금액': '0',
            '공급가액': '0',
            '부가세': '0'
        }
        
        excel_path = templates_dir / "나이스CMS" / "이마트신세계HDC" / "[설정]_공문.xlsx"
        if excel_path.exists():
            try:
                df_settings = pd.read_excel(excel_path, dtype=str)
                if not df_settings.empty:
                    context.update(df_settings.fillna('').iloc[0].to_dict())
            except:
                pass

        if 'context_override' in options:
            cleaned_override = {k: v for k, v in options['context_override'].items() if str(v).strip()}
            context.update(cleaned_override)

        report_date = context.get('청구연월', '') or datetime.now().strftime('%Y-%m')
        context['청구연월'] = report_date
        numbers = re.findall(r'\d+', report_date)
        now = datetime.now()
        target_year = int(numbers[0]) if len(numbers) > 0 else now.year
        target_month = int(numbers[1]) if len(numbers) > 1 else now.month
        
        context['청구연도'], context['청구월'] = str(target_year), f"{target_month:02d}월"
        
        write_date_str = context.get('작성일자', '')
        if not str(write_date_str).strip():
            write_date_str = now.strftime('%Y년 %m월 %d일')
            context['작성일자'] = write_date_str
            
        w_nums = re.findall(r'\d+', str(write_date_str))
        if len(w_nums) >= 3:
            try: target_w_date = datetime(int(w_nums[0]), int(w_nums[1]), int(w_nums[2]))
            except ValueError: target_w_date = now
        else: target_w_date = now
            
        context['작성일자_숫자'] = target_w_date.strftime('%Y%m%d')
        context['작성일자_점'] = target_w_date.strftime('%Y.%m.%d')
            
        total_amt = parse_money(context.get('합계금액', '0'))
        if total_amt == 0:
            qty = parse_money(context.get('수량', '0'))
            price = parse_money(context.get('단가', '0'))
            if qty and price: total_amt = qty * price
        
        vat = total_amt // 11
        supply = total_amt - vat
        
        context['합계금액'] = f"{total_amt:,}"
        context['공급가액'] = f"{supply:,}"
        context['부가세'] = f"{vat:,}"
        if '수량' in context: context['수량'] = str(parse_money(context.get('수량', '0')))
        if '단가' in context: context['단가'] = f"{parse_money(context.get('단가', '0')):,}"
        if '금액' in context: context['금액'] = f"{total_amt:,}"

        kr_vars = {}
        for k, v in context.items():
            if any(mk in k for mk in ['금액', '단가', '가액', '세', '비용', '지급액']) and not k.endswith('_한글'):
                val_str = str(v).strip()
                if val_str:
                    amt = parse_money(val_str)
                    if amt != 0 or '0' in val_str:
                        context[k] = f"{amt:,}"
                kr_vars[f"{k}_한글"] = number_to_korean_currency(str(v))
        context.update(kr_vars)
        
        if options.get('preview_only'):
            replace_keys = list(context.keys())
            context['모든_변수_확인용'] = json.dumps({k: context.get(k, '') for k in replace_keys}, ensure_ascii=False, indent=2)
            return {"success": True, "output": "", "summary": {"message": "데이터 로드 완료", "context": context}}

        template_path = templates_dir / "나이스CMS" / "이마트신세계HDC" / "[양식]_공문.docx"
        month_str = report_date.replace(' ', '')
        file_prefix = f"나이스CMS_이마트신세계HDC_청구공문_{month_str}"
        output_path = output_dir / f"{file_prefix}.docx"
        
        doc_success = False
        if template_path.exists():
            try:
                doc = DocxTemplate(str(template_path))
                doc.render(context)
                doc.save(str(output_path))
                doc_success = True
            except Exception as e:
                pass
                
        if doc_success:
            return {"success": True, "output": str(output_path), "summary": {"message": f"작업 완료: 이마트신세계HDC 워드 공문이 생성되었습니다."}}
        else:
            return {"success": False, "message": f"파일 생성 실패. 워드 양식을 확인해 주세요."}
            
    if operation == 'nice_emarthdc_2':
        # diff_file_path는 document_generator에 의해 자동으로 최신 비교결과 파일이 매칭되거나, 사용자가 직접 올린 파일이 됩니다.
        if not diff_file_path or not diff_file_path.exists():
            return {"success": False, "message": "기준이 될 마스터 파일(청구리스트 또는 비교결과 엑셀)을 찾을 수 없습니다. 파일을 업로드하거나 [파일 처리] 메뉴에서 비교를 먼저 실행해주세요."}
            
        try:
            # 이제 process_billing_outputs는 마스터 파일을 받아 송부본/발행리스트 2개만 생성합니다.
            result = process_billing_outputs(diff_file_path)
            
            # 사용자에게는 원본 마스터 파일까지 총 3개를 보여줍니다.
            output_files = [str(diff_file_path), result["send_file"], result["issue_file"]]
            
            return {
                "success": True,
                "output": output_files,
                "summary": {"message": f"작업 완료: '{diff_file_path.name}' 파일을 기반으로 송부본 및 발행리스트 엑셀이 성공적으로 파생되었습니다."}
            }
        except Exception as e:
            return {"success": False, "message": f"파일 '{diff_file_path.name}' 처리 중 오류가 발생했습니다:\n\n{str(e)}"}

    return {"success": False, "message": "해당 작업은 준비 중입니다."}