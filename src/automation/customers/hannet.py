import pandas as pd
from pathlib import Path
from datetime import datetime
import re
import json
from docxtpl import DocxTemplate

from ._common import parse_money, number_to_korean_currency

def process_hannet(operation: str, customer: str, diff_file_path: Path, output_dir: Path, options: dict) -> dict:
    """한네트(글로리/자동화기기) 전용 생성 프로세스"""
    options = options or {}
    
    if operation in ['hannet_1', 'doc_official']:
        templates_dir = output_dir.parent / "templates"
        
        # 💡 고객사 코드에 따라 하위 폴더명 자동 선택
        folder_name = "글로리" if customer.startswith('hannet_glory') else "자동화기기"
        
        context = {
            '작업명': f'hannet_{folder_name}',
            '수량': '0',
            '단가': '0',
            '보수단가': '0',
            '청구금액': '0',
            '공급가액': '0',
            '부가세': '0'
        }
        
        excel_path = templates_dir / "한네트" / folder_name / "[설정]_공문.xlsx"
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
            
        total_amt = parse_money(context.get('청구금액', context.get('합계금액', '0')))
        qty = parse_money(context.get('수량', '0'))
        price = parse_money(context.get('보수단가', context.get('단가', '0')))
        
        if qty > 0:
            if price == 0:
                # 💡 엑셀 파일에 단가가 누락되어 0으로 인식된 경우 에러창을 띄웁니다.
                return {"success": False, "message": f"엑셀 설정 파일에 '보수단가' 값이 누락되었습니다.\n(templates/한네트/{folder_name}/[설정]_공문.xlsx 파일에 '보수단가'를 입력해 주세요.)"}
                
            calc_amt = qty * price
            if total_amt == 0 or total_amt != calc_amt:
                total_amt = calc_amt
            
        if total_amt > 0:
            vat = total_amt // 11
            supply = total_amt - vat
            
            context['청구금액'] = f"{total_amt:,}"
            context['합계금액'] = f"{total_amt:,}"
            context['공급가액'] = f"{supply:,}"
            context['부가세'] = f"{vat:,}"
            context['금액'] = f"{total_amt:,}"

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

        # 💡 워드(.docx)와 엑셀(.xlsx) 양식 파일을 모두 스캔하여 동적으로 처리
        template_base_path = templates_dir / "한네트" / folder_name / "[양식]_공문"
        template_path_docx = template_base_path.with_suffix('.docx')
        template_path_xlsx = template_base_path.with_suffix('.xlsx')
        
        if template_path_docx.exists():
            template_path = template_path_docx
            ext = '.docx'
        elif template_path_xlsx.exists():
            template_path = template_path_xlsx
            ext = '.xlsx'
        else:
            return {"success": False, "message": f"워드 또는 엑셀 양식 파일을 찾을 수 없습니다.\n경로: {template_base_path}.(docx|xlsx)"}
            
        month_str = report_date.replace(' ', '')
        file_prefix = f"한네트_{folder_name}_청구공문_{month_str}"
        output_path = output_dir / f"{file_prefix}{ext}"
        
        try:
            if ext == '.docx':
                doc = DocxTemplate(str(template_path))
                doc.render(context)
                doc.save(str(output_path))
            elif ext == '.xlsx':
                import openpyxl
                wb = openpyxl.load_workbook(template_path, keep_links=False)
                pattern = re.compile(r'\{\{(.*?)\}\}')
                for sheet in wb.worksheets:
                    for row in sheet.iter_rows():
                        for cell in row:
                            if cell.value and isinstance(cell.value, str):
                                original_value = cell.value
                                matches = pattern.findall(original_value)
                                if not matches:
                                    continue

                                # 💡 셀에 태그만 단독으로 있을 경우, 숫자 타입으로 변환 시도
                                if len(matches) == 1 and original_value.strip() == f"{{{{{matches[0].strip()}}}}}":
                                    key = matches[0].strip()
                                    replacement_val = context.get(key, '')
                                    try:
                                        numeric_val = parse_money(replacement_val)
                                        cell.value = numeric_val
                                    except (ValueError, TypeError):
                                        cell.value = str(replacement_val)
                                else:
                                    # 💡 셀에 텍스트와 태그가 섞여 있으면, 문자열로 안전하게 치환
                                    for match in matches:
                                        key = match.strip()
                                        cell.value = cell.value.replace(f"{{{{{key}}}}}", str(context.get(key, '')))
                wb.save(output_path)
                
            return {"success": True, "output": str(output_path), "summary": {"message": f"작업 완료: 한네트 {folder_name} 청구공문({ext})이 생성되었습니다."}}
        except Exception as e:
            return {"success": False, "message": f"양식({ext}) 처리 중 오류 발생: {str(e)}"}

    return {"success": False, "message": "해당 작업은 준비 중입니다."}