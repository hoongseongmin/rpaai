import pandas as pd
from pathlib import Path
from typing import List
from datetime import datetime

def compare_status_files(old_file_path: Path, new_file_path: Path, output_path: Path) -> dict:
    """운영현황 CSV 파일 2개 비교"""
    COMPOSITE_KEYS = ["SITEID", "일련번호", "기번"]
    IGNORE_COLUMNS = ["No", "업체/부서명", "BIN", "지원CSE(정)", "Bin위치/내용"]  # 내용변경 비교 시 무시할 컬럼명
    
    try:
        # 1. 이전 파일 읽기 (엑셀 및 한글 CSV 자동 호환)
        if old_file_path.suffix.lower() in ['.xlsx', '.xls']:
            df_old = pd.read_excel(old_file_path)
        else:
            try: df_old = pd.read_csv(old_file_path, encoding='utf-8')
            except UnicodeDecodeError: df_old = pd.read_csv(old_file_path, encoding='cp949')
            
        # 2. 신규 파일 읽기 (엑셀 및 한글 CSV 자동 호환)
        if new_file_path.suffix.lower() in ['.xlsx', '.xls']:
            df_new = pd.read_excel(new_file_path)
        else:
            try: df_new = pd.read_csv(new_file_path, encoding='utf-8')
            except UnicodeDecodeError: df_new = pd.read_csv(new_file_path, encoding='cp949')

    except Exception as e:
        return {"success": False, "message": f"파일 읽기 오류: {str(e)}"}
        
    missing_cols = [col for col in COMPOSITE_KEYS if col not in df_old.columns or col not in df_new.columns]
    if missing_cols:
        return {"success": False, "message": f"필수 키 컬럼을 찾을 수 없습니다: {', '.join(set(missing_cols))}"}

    # 키 컬럼 정제 함수 (공백 제거, 대소문자 통일, 정수의 소수점(.0) 제거, NaN 처리)
    def clean_key(series):
        return series.fillna('').astype(str).str.replace(r'\.0$', '', regex=True).str.strip().str.upper()

    # 복합 키 생성 (비교용 임시 컬럼)
    df_old['__temp_key__'] = pd.concat([clean_key(df_old[col]) for col in COMPOSITE_KEYS], axis=1).agg('-'.join, axis=1)
    df_new['__temp_key__'] = pd.concat([clean_key(df_new[col]) for col in COMPOSITE_KEYS], axis=1).agg('-'.join, axis=1)

    # 중복 키 제거 방어 코드
    df_old.drop_duplicates(subset=['__temp_key__'], inplace=True, keep='first')
    df_new.drop_duplicates(subset=['__temp_key__'], inplace=True, keep='first')

    df_old_indexed = df_old.set_index('__temp_key__')
    df_new_indexed = df_new.set_index('__temp_key__')
    
    keys_old = set(df_old_indexed.index)
    keys_new = set(df_new_indexed.index)
    
    keys_deleted = keys_old - keys_new
    keys_added = keys_new - keys_old
    keys_common = keys_old & keys_new
    
    diff_rows = []
    
    for key in keys_deleted:
        row_data = df_old_indexed.loc[key].to_dict()
        row_data['[변경상태]'] = '삭제됨'
        row_data['[변경내용]'] = ''
        diff_rows.append(row_data)
        
    for key in keys_added:
        row_data = df_new_indexed.loc[key].to_dict()
        row_data['[변경상태]'] = '신규추가'
        row_data['[변경내용]'] = ''
        diff_rows.append(row_data)
        
    for key in keys_common:
        row_old = df_old_indexed.loc[key]
        row_new = df_new_indexed.loc[key]
        
        if not row_old.equals(row_new):
            changes = []
            for col in df_new_indexed.columns:
                if col not in row_old: continue
                
                # 단순 순번 등 무시할 컬럼은 비교 건너뛰기 (대소문자 무관)
                if col.lower() in [ic.lower() for ic in IGNORE_COLUMNS]:
                    continue
                
                val_old = row_old[col]
                val_new = row_new[col]
                
                # 빈 값(NaN, Null 등) 비교를 안전하게 처리
                if pd.isna(val_old) and pd.isna(val_new): 
                    continue
                if str(val_old) != str(val_new):
                    changes.append(f"[{col}] '{val_old}' -> '{val_new}'")
            
            if changes:
                row_data = row_new.to_dict()
                row_data['[변경상태]'] = '내용변경'
                row_data['[변경내용]'] = '\n'.join(changes)
                diff_rows.append(row_data)
            
    if diff_rows:
        df_diff = pd.DataFrame(diff_rows)

        # --- 정렬 로직 ---
        # 1. '[변경상태]' 컬럼을 정렬 우선순위가 있는 카테고리 타입으로 변환
        #    ('신규추가' -> '내용변경' -> '삭제됨' 순으로 그룹화)
        status_order = ['삭제됨', '신규추가', '내용변경']
        df_diff['[변경상태]'] = pd.Categorical(df_diff['[변경상태]'], categories=status_order, ordered=True)

        # 2. 'No' 컬럼을 정렬을 위해 숫자 타입으로 변환 (오류 발생 시 NaN으로 처리)
        if 'No' in df_diff.columns:
            df_diff['No'] = pd.to_numeric(df_diff['No'], errors='coerce')
            sort_keys = ['[변경상태]', 'No']
        else:
            sort_keys = ['[변경상태]']

        # 3. 데이터프레임 정렬
        df_diff.sort_values(by=sort_keys, inplace=True)

        columns_order = list(df_new_indexed.columns) + ['[변경상태]', '[변경내용]']
        df_diff = df_diff[[col for col in columns_order if col in df_diff.columns]]

        # --- 결과 요약 정보 생성 ---
        added_df = df_diff[df_diff['[변경상태]'] == '신규추가']
        deleted_df = df_diff[df_diff['[변경상태]'] == '삭제됨']
        modified_df = df_diff[df_diff['[변경상태]'] == '내용변경']

        summary_data = {
            "added_count": len(added_df),
            "deleted_count": len(deleted_df),
            "modified_count": len(modified_df),
            "columns": list(df_diff.columns),
            "added_rows": added_df.fillna('').to_dict('records'),
            "deleted_rows": deleted_df.fillna('').to_dict('records'),
            "modified_rows": modified_df.fillna('').to_dict('records'),
        }

        
        # --- 엑셀 서식 적용하여 저장 ---
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            df_diff.to_excel(writer, index=False, sheet_name='비교결과')
            
            # openpyxl 워크북/워크시트 객체 가져오기
            worksheet = writer.sheets['비교결과']
            from openpyxl.styles import Alignment, Font

            # 전체 폰트와 헤더(첫 줄) 폰트 설정
            base_font = Font(name='페이퍼로지 4 Regular', size=9)
            header_font = Font(name='페이퍼로지 4 Regular', size=9, bold=True)

            # 컬럼 너비 자동 조절 및 서식 적용
            for column_cells in worksheet.columns:
                column_cells[0].font = header_font  # 헤더 폰트 적용
                # 내용이 가장 긴 셀을 기준으로 너비 계산
                max_length = max((len(str(cell.value)) for cell in column_cells if cell.value), default=0)
                adjusted_width = (max_length + 2)
                
                # '[변경내용]' 컬럼은 너비를 50으로 고정하고 자동 줄 바꿈 적용
                if column_cells[0].value == '[변경내용]':
                    worksheet.column_dimensions[column_cells[0].column_letter].width = 50
                    # 헤더는 제외하고 내용 부분에만 서식 적용
                    for cell in column_cells[1:]:
                        cell.alignment = Alignment(wrap_text=True, vertical='top')
                        cell.font = base_font
                else:
                    worksheet.column_dimensions[column_cells[0].column_letter].width = adjusted_width
                    for cell in column_cells[1:]:
                        cell.font = base_font

        return {
            "success": True, 
            "count": len(df_diff), 
            "output": str(output_path),
            "summary": summary_data
        }
        
    return {"success": True, "count": 0, "message": "차이점이 없습니다."}

async def merge_files(file_paths: List[Path], output_dir: Path, options: dict) -> str:
    """파일 병합"""
    dfs = []
    for file_path in file_paths:
        if file_path.suffix == '.csv':
            df = pd.read_csv(file_path)
            dfs.append(df)
    
    if dfs:
        merged = pd.concat(dfs, ignore_index=True)
        output_path = output_dir / f"merged_{datetime.now().strftime('%H%M%S')}.csv"
        merged.to_csv(output_path, index=False, encoding='utf-8-sig')
        return str(output_path)
    
    return str(output_dir / "merged.txt")