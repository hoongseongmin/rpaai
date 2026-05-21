import pandas as pd
from pathlib import Path
from datetime import datetime
import re
import json
from docxtpl import DocxTemplate

from ._common import parse_money, number_to_korean_currency

def process_koreapost(operation: str, customer: str, diff_file_path: Path, output_dir: Path, options: dict) -> dict:
    """우정사업본부 전용 공문 및 청구서 생성 프로세스"""
    options = options or {}
    
    # === 1, 2번: 이전설치 및 이행실적 공문 (Word) ===
    if operation == 'doc_official':
        templates_dir = output_dir.parent / "templates"
        excel_path = templates_dir / "우체국" / "[설정]_우체국_공문1_2.xlsx"
        
        if not excel_path.exists():
            return {"success": False, "message": f"다음 템플릿 파일을 찾지 못했습니다:\n\n- {excel_path.name}\n  (파이썬이 찾은 곳: {excel_path})"}
            
        try:
            df_settings = pd.read_excel(excel_path, dtype=str)
            customer_row = df_settings[df_settings['고객사코드'] == customer]
            
            if customer_row.empty:
                base_customer = customer.split('_')[0]
                customer_row = df_settings[df_settings['고객사코드'] == base_customer]
                if customer_row.empty:
                    return {"success": False, "message": f"엑셀 설정 파일에 고객사코드 '{customer}' 항목이 존재하지 않습니다."}
            
            context = customer_row.fillna('').iloc[0].to_dict()

            if not str(context.get('월유지비용', '')).strip():
                base_customer = customer.split('_')[0]
                fallback_row = df_settings[df_settings['고객사코드'] == base_customer]
                if not fallback_row.empty:
                    fallback_ctx = fallback_row.fillna('').iloc[0].to_dict()
                    if str(fallback_ctx.get('월유지비용', '')).strip():
                        context['월유지비용'] = fallback_ctx.get('월유지비용', '')
            
            for default_key in ['월유지비용', '미사용차감수량', '미사용차감금액', '실지급액']:
                if default_key not in context: context[default_key] = ''

            fixed_value_kp = context.get('월유지비용', '')

            if customer == 'koreapost_2':
                for default_key in ['장애_적기처리건수', '장애_지연처리건수', '만족도조사_건수', '만족도조사_총점', '만족도조사_평점', '정기점검_총대상수', '정기점검_완료수', '정기점검_달성률', '이전설치_총대상수', '이전설치_완료수', '이전설치_달성률']:
                    if default_key not in context: context[default_key] = ''

            template_name = '[양식]_우체국_공문1.docx' if customer == 'koreapost_1' else '[양식]_우체국_공문2.docx'
            word_path = templates_dir / "우체국" / template_name
            
            if not word_path.exists() and not options.get('preview_only'):
                return {"success": False, "message": f"고객사 전용 워드 양식을 찾지 못했습니다:\n\n- {template_name}\n  (파이썬이 찾은 곳: {word_path})"}
                
            context['공문끝번호'] = options.get('doc_number', '')
            context['합계금액'] = ''
            context['공급가액'] = ''
            context['부가세'] = ''
            
            report_date = options.get('report_date', datetime.now().strftime('%Y-%m'))
            if 'context_override' in options and '청구연월' in options['context_override']:
                report_date = options['context_override']['청구연월']
                
            context['청구연월'] = report_date
            numbers = re.findall(r'\d+', report_date)
            now = datetime.now()
            target_year = int(numbers[0]) if len(numbers) > 0 else now.year
            target_month = int(numbers[1]) if len(numbers) > 1 else now.month
            
            context['청구연도'] = str(target_year)
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
                try: target_write_date = datetime(w_year, w_month, w_day)
                except ValueError: target_write_date = now
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

            if fixed_value_kp is not None:
                context['월유지비용'] = fixed_value_kp

            base_amt = parse_money(context.get('월유지비용', ''))
            deduct_amt = parse_money(context.get('미사용차감금액', ''))
            final_amt = base_amt - deduct_amt
            
            context['월유지비용'] = f"{base_amt:,}"
            context['미사용차감금액'] = f"{deduct_amt:,}"
            context['실지급액'] = f"{final_amt:,}"

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
                var_dict = {k: context.get(k, '') for k in context.keys()}
                context['모든_변수_확인용'] = json.dumps(var_dict, ensure_ascii=False, indent=2)
                return {"success": True, "output": "", "summary": {"message": "데이터 로드 완료", "context": context}}

            replace_keys = list(context.keys())
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
            
            full_month = f"{target_year}년{target_month:02d}월"
            short_month = f"{str(target_year)[-2:]}.{target_month:02d}월"

            if customer == 'koreapost_1':
                file_prefix = f"공문_금융자동화기기(Ⅱ) 유지관리용역 이전설치 완료통보의 건({full_month}분)"
            else:
                file_prefix = f"공문_금융자동화기기(Ⅱ) 유지관리용역 {short_month} 이행실적 검사요청"
                
            output_path = output_dir / f"{file_prefix}.docx"
            doc.save(str(output_path))
            
            return {"success": True, "output": str(output_path), "summary": {"message": f"작업 완료: 우정사업본부 맞춤형 워드 공문이 성공적으로 생성되었습니다.", "context": context}}
        except Exception as e:
            return {"success": False, "message": f"공문 생성 중 오류 발생: {str(e)}"}

    # === 3, 4번: 이전실비 및 유지보수료 청구서 (Excel) ===
    if operation in ['kp_task3', 'kp_task4']:
        templates_dir = output_dir.parent / "templates"
        excel_settings_path = templates_dir / "우체국" / "[설정]_우체국_공문3_4.xlsx"
        
        context = {}
        try:
            df_kp = pd.read_excel(excel_settings_path, dtype=str)
            task_row = df_kp[df_kp['작업명'].str.contains('3|이전|kp_task3', na=False, case=False)] if operation == 'kp_task3' else df_kp[df_kp['작업명'].str.contains('4|유지보수|kp_task4', na=False, case=False)]
            if not task_row.empty: context = task_row.fillna('').iloc[0].to_dict()
        except Exception: pass
        
        for default_key in ['데이터건수', '특정금액', '합계금액', '공급가액', '부가세', '당초청구금액', '정산감액', '청구금액']:
            if default_key not in context: context[default_key] = ''
        
        fixed_key = '정산감액' if operation == 'kp_task3' else '당초청구금액'
        fixed_value = '0' if operation == 'kp_task3' else context.get(fixed_key, '')

        report_date = options.get('context_override', {}).get('청구연월', options.get('report_date', datetime.now().strftime('%Y-%m')))
        context['청구연월'] = report_date
        numbers = re.findall(r'\d+', report_date)
        now = datetime.now()
        target_year = int(numbers[0]) if len(numbers) > 0 else now.year
        target_month = int(numbers[1]) if len(numbers) > 1 else now.month
        
        context['청구연도'], context['청구월'] = str(target_year), f"{target_month:02d}월"
        context['전월연도'], context['전월'] = str(target_year if target_month > 1 else target_year - 1), f"{target_month - 1 if target_month > 1 else 12:02d}월"
        
        write_date_str = options.get('context_override', {}).get('작성일자', '')
        context['작성일자'] = write_date_str if write_date_str else now.strftime('%Y년 %m월 %d일')
        
        if 'context_override' in options:
            cleaned_override = {k: v for k, v in options['context_override'].items() if str(v).strip()}
            context.update(cleaned_override)
        if fixed_key and fixed_value is not None: context[fixed_key] = fixed_value
            
        if '당초청구금액' in context or '정산감액' in context:
            base_amt = parse_money(context.get('당초청구금액', ''))
            deduct_amt = parse_money(context.get('정산감액', ''))
            context['당초청구금액'], context['정산감액'], context['청구금액'] = f"{base_amt:,}", f"{deduct_amt:,}", f"{base_amt - deduct_amt:,}"

        kr_vars = {}
        for k, v in context.items():
            if any(mk in k for mk in ['금액', '단가', '가액', '세', '감액', '비용', '지급액']) and not k.endswith('_한글'):
                val_str = str(v).strip()
                if val_str:
                    amt = parse_money(val_str)
                    if amt != 0 or '0' in val_str:
                        context[k] = f"{amt:,}"
                kr_vars[f"{k}_한글"] = number_to_korean_currency(str(v))
        context.update(kr_vars)
        
        replace_keys = list(context.keys())
        for key, value in context.items():
            if isinstance(value, str):
                for r_key in replace_keys:
                    if f"{{{{{r_key}}}}}" in value: value = value.replace(f"{{{{{r_key}}}}}", str(context.get(r_key, '')))
                context[key] = value

        df = pd.read_excel(diff_file_path) if diff_file_path else None
        context['표데이터'] = df.fillna('').to_dict('records') if df is not None else []

        if options.get('preview_only'):
            context['모든_변수_확인용'] = json.dumps({k: context.get(k, '') for k in replace_keys}, ensure_ascii=False, indent=2)
            return {"success": True, "output": "", "summary": {"message": "데이터 로드 완료", "context": context}}

        template_path = templates_dir / "우체국" / "[양식]_우체국_공문3_4.xlsx"
        if not template_path.exists(): return {"success": False, "message": "엑셀 양식 파일을 찾을 수 없습니다."}
            
        file_prefix = f"청구공문_금융자동화기기(Ⅱ) 유지관리용역 {'이전실비' if operation == 'kp_task3' else '유지보수료'}({target_year}년{target_month:02d}월분)"
        output_path = output_dir / f"{file_prefix}.xlsx"
        
        try:
            import openpyxl
            wb = openpyxl.load_workbook(template_path, keep_links=False)
            pattern = re.compile(r'\{\{(.*?)\}\}')
            for sheet in wb.worksheets:
                for row in sheet.iter_rows():
                    for cell in row:
                        if cell.value and isinstance(cell.value, str) and pattern.findall(cell.value):
                            for match in pattern.findall(cell.value): cell.value = cell.value.replace(f"{{{{{match.strip()}}}}}", str(context.get(match.strip(), '')))
            wb.save(output_path)
            return {"success": True, "output": str(output_path), "summary": {"message": "작업 완료: 우정사업본부 엑셀 청구서가 생성되었습니다."}}
        except Exception as e:
            return {"success": False, "message": f"엑셀 템플릿 처리 중 오류 발생: {str(e)}"}

    return {"success": False, "message": "해당 작업은 준비 중입니다."}