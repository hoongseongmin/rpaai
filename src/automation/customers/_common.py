import re
from pathlib import Path

def parse_money(val) -> int:
    """문자열에서 숫자만 추출하여 정수(금액)로 반환"""
    if not val: return 0
    val_str = str(val).replace(',', '').replace(' ', '')
    val_str = re.sub(r'[^\d\-]', '', val_str)
    try: return int(val_str)
    except: return 0

def number_to_korean_currency(num_str: str) -> str:
    """숫자를 법적 문서용 한글 금액(일금일천원정)으로 변환"""
    num_str = re.sub(r'[^\d]', '', str(num_str))
    if not num_str:
        return ""
    if int(num_str) == 0:
        return "일금영원정(₩0-)"
    
    digits = "영일이삼사오육칠팔구"
    units = ["", "십", "백", "천"]
    blocks = ["", "만", "억", "조", "경"]
    
    res = ""
    n = len(num_str)
    for block_idx in range((n-1)//4, -1, -1):
        start = max(0, n - (block_idx+1)*4)
        end = n - block_idx*4
        block_str = num_str[start:end]
        
        block_res = ""
        b_len = len(block_str)
        for i, char in enumerate(block_str):
            if char == '0': continue
            unit_pos = b_len - i - 1
            block_res += digits[int(char)] + units[unit_pos]
        
        if block_res:
            res += block_res + blocks[block_idx]
            
    formatted_num = f"{int(num_str):,}"
    return f"일금{res}원정(₩{formatted_num}-)"

def get_latest_diff_file(output_dir: Path) -> Path:
    """가장 최근에 생성된 차이결과(비교결과) 엑셀 파일을 반환합니다."""
    files = list(output_dir.glob("차이결과_*.xlsx"))
    if not files:
        return None
    return max(files, key=lambda p: p.stat().st_mtime)