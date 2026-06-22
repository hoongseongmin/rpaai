import pandas as pd
from pathlib import Path
from datetime import datetime
import zipfile
import os
import re
import json
import importlib
from docxtpl import DocxTemplate
from typing import Union, List

from .customers._common import get_latest_diff_file, parse_money, number_to_korean_currency

def generate_documents(operation: str, customer: str, diff_file_path: Union[Path, List[Path]], output_dir: Path, options: dict = None) -> dict:
    """
    고객사별 청구자료/공문 생성 메인 라우터
    """
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    options = options or {}
    
    # 1. 차이결과 엑셀 자동 매칭 (비교 결과가 필요한 작업을 위한 폴백)
    if not diff_file_path and operation != 'doc_convert_pdf':
        diff_file_path = get_latest_diff_file(output_dir)

    # 💡 2. 고객사 개별 모듈 동적 라우팅
    if operation != 'doc_convert_pdf':
        base_module_name = customer.split('_')[0]
        if customer.startswith('nice_'):
            parts = customer.split('_')
            if len(parts) >= 2: base_module_name = f"{parts[0]}_{parts[1]}"
        elif customer.startswith('hannet_'):
            base_module_name = 'hannet'
            
        try:
            module = importlib.import_module(f".customers.{base_module_name}", package="src.automation")
            process_func = getattr(module, f"process_{base_module_name}", None)
            if process_func:
                return process_func(operation, customer, diff_file_path, output_dir, options)
        except ImportError:
            pass # 개별 모듈이 없는 경우 범용 공문 생성 로직으로 넘어감

    # 💡 3. PDF 공통 변환 로직 (버튼 클릭 시 실행)
    if operation == 'doc_convert_pdf':
        filename = options.get('filename')
        if not filename:
            return {"success": False, "message": "변환할 파일명이 전달되지 않았습니다."}
            
        file_path = output_dir / filename
        if not file_path.exists():
            return {"success": False, "message": "서버에서 변환할 파일을 찾을 수 없습니다."}
            
        try:
            import pythoncom
            pythoncom.CoInitialize()
            pdf_path = file_path.with_suffix('.pdf')
            
            if file_path.suffix.lower() in ['.docx', '.doc']:
                from docx2pdf import convert
                convert(str(file_path), str(pdf_path))
            elif file_path.suffix.lower() in ['.xlsx', '.xls']:
                import win32com.client
                excel = None
                wb = None
                try:
                    excel = win32com.client.DispatchEx("Excel.Application")
                    excel.Visible = False
                    excel.DisplayAlerts = False
                    abs_file_path = str(file_path.absolute())
                    abs_pdf_path = str(pdf_path.absolute())
                    wb = excel.Workbooks.Open(abs_file_path)
                    
                    # 💡 "통합" 생성된 엑셀 파일일 경우, 시트별로 분할하여 PDF로 만들고 ZIP으로 압축
                    if "통합" in file_path.name and wb.Sheets.Count > 1:
                        zip_filename = file_path.with_suffix('.zip').name
                        zip_path = output_dir / zip_filename
                        
                        # 💡 파일명에서 연도와 월 추출 (예: 2026년02월분)
                        date_match = re.search(r'\((\d{4})년(\d{2})월분\)', file_path.name)
                        target_year = date_match.group(1) if date_match else "YYYY"
                        target_month = date_match.group(2) if date_match else "MM"
                        short_year = target_year[-2:] if len(target_year) == 4 else "YY"
                        
                        # 💡 요청하신 시트 순서별 맞춤 파일명 지정
                        custom_names = {
                            1: f"공문_금융자동화기기(Ⅱ) 유지관리용역 이전설치 완료통보의 건({target_year}년{target_month}월분)",
                            2: f"공문_금융자동화기기(Ⅱ) 유지관리용역 {short_year}.{target_month}월 이행실적 검사요청",
                            3: f"청구공문_금융자동화기기(Ⅱ) 유지관리용역 이전실비({target_year}년{target_month}월분)",
                            4: f"청구공문_금융자동화기기(Ⅱ) 유지관리용역 유지보수료({target_year}년{target_month}월분)"
                        }

                        pdf_files = []
                        for i in range(1, wb.Sheets.Count + 1):
                            sheet = wb.Sheets(i)
                            base_pdf_name = custom_names.get(i, sheet.Name)
                            safe_sheet_name = re.sub(r'[\\/*?:"<>|]', "", base_pdf_name)
                            pdf_name = f"{safe_sheet_name}.pdf"
                            pdf_temp_path = output_dir / pdf_name
                            sheet.ExportAsFixedFormat(0, str(pdf_temp_path.absolute()))
                            pdf_files.append(pdf_temp_path)
                            
                        with zipfile.ZipFile(str(zip_path.absolute()), 'w', zipfile.ZIP_DEFLATED) as zipf:
                            for p_file in pdf_files: zipf.write(p_file, arcname=p_file.name)
                                
                        for p_file in pdf_files:
                            try: os.remove(p_file)
                            except: pass
                            
                        return {"success": True, "output": zip_filename, "summary": {"message": "4개 시트가 개별 PDF로 분할되어 압축(ZIP) 완료되었습니다."}}
                    else:
                        # 0은 Excel에서 PDF 형식(xlTypePDF)을 의미합니다.
                        wb.ExportAsFixedFormat(0, abs_pdf_path)
                finally:
                    if wb: wb.Close(False)
                    if excel: excel.Quit()
            else:
                return {"success": False, "message": "지원하지 않는 파일 형식입니다. (Word 또는 Excel만 가능)"}

            return {"success": True, "output": file_path.with_suffix('.pdf').name, "summary": {"message": "PDF 변환 완료"}}
        except Exception as e:
            return {"success": False, "message": f"PDF 변환 중 오류 발생: {str(e)}"}
        finally:
            try: pythoncom.CoUninitialize()
            except: pass

    # 💡 4. 타 고객사 범용 공문 생성 로직
    if operation == 'doc_official':
        templates_dir = output_dir.parent / "templates"
        excel_path = templates_dir / "[설정]_통합_고객사.xlsx"

        if not excel_path.exists():
            return {"success": False, "message": f"다음 템플릿 파일을 찾지 못했습니다:\n\n- {excel_path.name}\n  (파이썬이 찾은 곳: {excel_path})"}
            
        try:
            df_settings = pd.read_excel(excel_path, dtype=str)
            base_customer = customer.split('_')[0]
            if customer.startswith('nice_') or customer.startswith('hannet_'):
                parts = customer.split('_')
                base_customer = f"{parts[0]}_{parts[1]}" if len(parts) >= 2 else customer
                
            customer_row = df_settings[df_settings['고객사코드'] == base_customer]
            
            if customer_row.empty:
                return {"success": False, "message": f"엑셀 설정 파일에 고객사코드 '{base_customer}' 항목이 존재하지 않습니다."}
            
            context = customer_row.fillna('').iloc[0].to_dict()

            template_name = str(context.get('사용양식', '[양식]_통합_공문.docx')).strip()
            if template_name == '' or template_name == 'nan': template_name = '[양식]_통합_공문.docx'
            if not template_name.endswith('.docx'): template_name += '.docx'
            
            word_path = templates_dir / template_name
            
            if not word_path.exists() and not options.get('preview_only'):
                return {"success": False, "message": f"고객사 전용 워드 양식을 찾지 못했습니다:\n\n- {template_name}\n  (파이썬이 찾은 곳: {word_path})"}
                
            context['공문끝번호'] = options.get('doc_number', '')
            
            report_date = options.get('report_date', datetime.now().strftime('%Y-%m'))
            if 'context_override' in options and '청구연월' in options['context_override']:
                report_date = options['context_override']['청구연월']
                
            context['청구연월'] = report_date
            numbers = re.findall(r'\d+', report_date)
            now = datetime.now()
            target_year = int(numbers[0]) if len(numbers) > 0 else now.year
            target_month = int(numbers[1]) if len(numbers) > 1 else now.month
            
            context['청구연도'] = str(target_year)
            
            # 💡 '분기' 글자가 포함되어 있다면 월 대신 분기로 계산
            if '분기' in report_date:
                context['청구월'] = f"{target_month}분기"
                prev_month = target_month - 1 if target_month > 1 else 4
                prev_year = target_year if target_month > 1 else target_year - 1
                context['전월연도'] = str(prev_year)
                context['전월'] = f"{prev_month}분기"
            else:
                context['청구월'] = f"{target_month:02d}월"
                prev_month = target_month - 1 if target_month > 1 else 12
                prev_year = target_year if target_month > 1 else target_year - 1
                context['전월연도'] = str(prev_year)
                context['전월'] = f"{prev_month:02d}월"
            
            override = options.get('context_override', {})
            write_date_str = override.get('작성일자', '')
            if write_date_str:
                w_nums = re.findall(r'\d+', str(write_date_str))
                if len(w_nums) >= 3:
                    w_year, w_month, w_day = int(w_nums[0]), int(w_nums[1]), int(w_nums[2])
                else:
                    w_year, w_month, w_day = now.year, now.month, now.day
                try:
                    target_write_date = datetime(w_year, w_month, w_day)
                except ValueError:
                    target_write_date = now
            else:
                target_write_date = now

            context['작성일자'] = write_date_str if write_date_str else target_write_date.strftime('%Y년 %m월 %d일')
            context['작성일자_숫자'] = target_write_date.strftime('%Y%m%d')
            context['작성일자_점'] = target_write_date.strftime('%Y.%m.%d')
            context['작성연도_숫자'] = target_write_date.strftime('%Y')
            context['작성월_숫자'] = target_write_date.strftime('%m')
            context['작성일자_일'] = target_write_date.strftime('%d')
                
            if 'context_override' in options:
                cleaned_override = {k: v for k, v in options['context_override'].items() if str(v).strip()}
                context.update(cleaned_override)

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
            
            replace_keys = list(context.keys())
            
            if options.get('preview_only'):
                var_dict = {k: context.get(k, '') for k in replace_keys}
                context['모든_변수_확인용'] = json.dumps(var_dict, ensure_ascii=False, indent=2)
                return {"success": True, "output": "", "summary": {"message": "데이터 로드 완료", "context": context}}

            for key, value in context.items():
                if isinstance(value, str):
                    for r_key in replace_keys:
                        if f"{{{r_key}}}" in value:
                            value = value.replace(f"{{{r_key}}}", str(context.get(r_key, '')))
                    context[key] = value

            body_list = []
            for key, value in context.items():
                if key.startswith('내용') and isinstance(value, str) and value.strip():
                    body_list.append(f"\t{value}" if '_' in key else value)
            context['본문리스트'] = body_list
            
            attach_keys = [k for k in context.keys() if k.startswith('붙임') and isinstance(context[k], str) and context[k].strip()]
            attach_keys.sort()
            attach_list = [context[k] for k in attach_keys]
                
            context['붙임리스트'] = attach_list
            context['붙임_첫번째'] = attach_list[0] if attach_list else ''
            context['붙임_나머지'] = attach_list[1:] if len(attach_list) > 1 else []
            
            attach_text = f"붙임 :\t{attach_list[0]}" if attach_list else ""
            for a in attach_list[1:]: attach_text += f"\n\t{a}"
            context['붙임_통합본'] = attach_text
            
            doc = DocxTemplate(str(word_path))
            doc.render(context)
            
            month_str = str(context.get('청구연월', '')).replace(' ', '')
            file_prefix = f"{customer}_공문_{month_str}"
                
            output_path = output_dir / f"{file_prefix}.docx"
            doc.save(str(output_path))
            
            return {"success": True, "output": str(output_path), "summary": {"message": f"작업 완료: {customer} 맞춤형 워드 공문이 성공적으로 생성되었습니다.", "context": context}}
        except Exception as e:
            return {"success": False, "message": f"공문 생성 중 오류 발생: {str(e)}"}

    return {"success": False, "message": f"선택하신 고객사({customer})의 {operation} 작업은 아직 준비 중입니다."}