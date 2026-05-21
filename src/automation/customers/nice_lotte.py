import pandas as pd
from pathlib import Path
from datetime import datetime
import re
import json
from docxtpl import DocxTemplate

from ._common import parse_money, number_to_korean_currency

def process_nice_lotte(operation: str, customer: str, diff_file_path: Path, output_dir: Path, options: dict) -> dict:
    """나이스CMS 롯데백화점 전용 생성 프로세스"""
    options = options or {}
    
    # === 1번 작업: 청구공문 (Word) ===
    if operation in ['nice_lotte_1', 'doc_official']:
        # 💡 데이터/템플릿 폴더 경로 설정 (경로 중복 data\data\ 방지)
        templates_dir = output_dir.parent / "templates"
        
        # 1. 기본 변수 세팅
        context = {
            '작업명': 'nicecms_lotte',
            '공문번호': '',
            '합계금액': '0',
            '공급가액': '0',
            '부가세': '0'
        }
        
        # 설정 엑셀 파일 읽기
        excel_path = templates_dir / "나이스CMS" / "롯데백화점" / "[설정]_공문.xlsx"
        if excel_path.exists():
            try:
                df_settings = pd.read_excel(excel_path, dtype=str)
                if not df_settings.empty:
                    context.update(df_settings.fillna('').iloc[0].to_dict())
            except:
                pass

        # 2. 화면 입력값 먼저 덮어쓰기 (빈 문자열 제외)
        if 'context_override' in options:
            cleaned_override = {k: v for k, v in options['context_override'].items() if str(v).strip()}
            context.update(cleaned_override)

        # 3. 날짜 관련 파생변수 자동 계산
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
        context['작성연도_숫자'] = target_w_date.strftime('%Y')
        context['작성월_숫자'] = target_w_date.strftime('%m')
        context['작성일자_일'] = target_w_date.strftime('%d')
            
        # 4. 대시보드 연동을 위한 금액 계산 (합계금액/공급가액/부가세 자동 연산)
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

        # 금액/단가 등에 대한 콤마 자동 추가 및 법적 한글 표기 변환 (예: 200000 -> 200,000 / 일금 이십만원정)
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
        
        # [미리보기 모드] (대시보드 UI에 입력칸 띄워주기)
        if options.get('preview_only'):
            replace_keys = list(context.keys())
            context['모든_변수_확인용'] = json.dumps({k: context.get(k, '') for k in replace_keys}, ensure_ascii=False, indent=2)
            return {"success": True, "output": "", "summary": {"message": "데이터 로드 완료", "context": context}}

        # 5. 워드 파일 양식 불러와서 병합 후 저장
        template_path = templates_dir / "나이스CMS" / "롯데백화점" / "[양식]_공문.docx"
        if not template_path.exists(): 
            return {"success": False, "message": f"워드 양식 파일을 찾을 수 없습니다.\n경로: {template_path}"}
            
        month_str = report_date.replace(' ', '')
        file_prefix = f"나이스CMS_롯데백화점_청구공문_{month_str}"
        output_path = output_dir / f"{file_prefix}.docx"
        
        try:
            doc = DocxTemplate(str(template_path))
            doc.render(context)
            doc.save(str(output_path))
            return {"success": True, "output": str(output_path), "summary": {"message": "작업 완료: 롯데백화점 청구공문이 생성되었습니다."}}
        except Exception as e:
            return {"success": False, "message": f"워드 템플릿 처리 중 오류 발생: {str(e)}"}

    return {"success": False, "message": "해당 작업은 준비 중입니다."}