"""
파일 처리 유틸리티 모듈
"""
import os
import shutil
from pathlib import Path
from typing import List, Optional
from datetime import datetime


class FileProcessor:
    """파일 처리 기본 클래스"""
    
    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
    
    # === 파일 조작 ===
    
    def copy_file(self, src: str, dst: str) -> bool:
        """파일 복사"""
        try:
            shutil.copy2(src, dst)
            return True
        except Exception as e:
            print(f"복사 실패: {e}")
            return False
    
    def move_file(self, src: str, dst: str) -> bool:
        """파일 이동"""
        try:
            shutil.move(src, dst)
            return True
        except Exception as e:
            print(f"이동 실패: {e}")
            return False
    
    def delete_file(self, path: str) -> bool:
        """파일 삭제"""
        try:
            os.remove(path)
            return True
        except Exception as e:
            print(f"삭제 실패: {e}")
            return False
    
    def rename_file(self, old: str, new: str) -> bool:
        """파일 이름 변경"""
        try:
            os.rename(old, new)
            return True
        except Exception as e:
            print(f"이름 변경 실패: {e}")
            return False
    
    # === 디렉토리 조작 ===
    
    def create_dir(self, path: str) -> bool:
        """디렉토리 생성"""
        try:
            os.makedirs(path, exist_ok=True)
            return True
        except Exception as e:
            print(f"디렉토리 생성 실패: {e}")
            return False
    
    def delete_dir(self, path: str) -> bool:
        """디렉토리 삭제"""
        try:
            shutil.rmtree(path)
            return True
        except Exception as e:
            print(f"디렉토리 삭제 실패: {e}")
            return False
    
    def list_files(self, path: str = ".", pattern: str = "*") -> List[str]:
        """파일 목록 조회"""
        try:
            p = Path(path)
            return [str(f) for f in p.glob(pattern) if f.is_file()]
        except Exception as e:
            print(f"목록 조회 실패: {e}")
            return []
    
    # === 파일 정보 ===
    
    def get_file_info(self, path: str) -> dict:
        """파일 정보 조회"""
        try:
            stat = os.stat(path)
            return {
                "name": os.path.basename(path),
                "size": stat.st_size,
                "created": datetime.fromtimestamp(stat.st_ctime),
                "modified": datetime.fromtimestamp(stat.st_mtime),
                "is_file": os.path.isfile(path),
                "is_dir": os.path.isdir(path)
            }
        except Exception as e:
            print(f"정보 조회 실패: {e}")
            return {}
    
    def get_file_extension(self, path: str) -> str:
        """파일 확장자 조회"""
        return Path(path).suffix.lower()
    
    # === 배치 처리 ===
    
    def batch_copy(self, files: List[tuple], base_dst: str = ".") -> dict:
        """배치 복사"""
        results = {"success": [], "failed": []}
        for src, dst in files:
            dst_path = os.path.join(base_dst, dst)
            if self.copy_file(src, dst_path):
                results["success"].append(src)
            else:
                results["failed"].append(src)
        return results
    
    def batch_rename(self, files: List[tuple]) -> dict:
        """배치 이름 변경"""
        results = {"success": [], "failed": []}
        for old, new in files:
            if self.rename_file(old, new):
                results["success"].append(old)
            else:
                results["failed"].append(old)
        return results


# === 데이터 파일 처리 ===

class DataFileProcessor(FileProcessor):
    """데이터 파일 처리 클래스"""
    
    def read_csv(self, path: str) -> Optional[list]:
        """CSV 읽기"""
        try:
            import pandas as pd
            return pd.read_csv(path)
        except Exception as e:
            print(f"CSV 읽기 실패: {e}")
            return None
    
    def write_csv(self, data, path: str) -> bool:
        """CSV 쓰기"""
        try:
            import pandas as pd
            data.to_csv(path, index=False, encoding='utf-8-sig')
            return True
        except Exception as e:
            print(f"CSV 쓰기 실패: {e}")
            return False
    
    def read_excel(self, path: str, sheet: str = None) -> Optional[dict]:
        """Excel 읽기"""
        try:
            import pandas as pd
            if sheet:
                return pd.read_excel(path, sheet_name=sheet)
            return pd.read_excel(path, sheet_name=None)
        except Exception as e:
            print(f"Excel 읽기 실패: {e}")
            return None
    
    def write_excel(self, data, path: str, sheet: str = "Sheet1") -> bool:
        """Excel 쓰기"""
        try:
            import pandas as pd
            with pd.ExcelWriter(path, engine='openpyxl') as writer:
                if isinstance(data, dict):
                    for sheet_name, df in data.items():
                        df.to_excel(writer, sheet_name=sheet_name, index=False)
                else:
                    data.to_excel(writer, sheet_name=sheet, index=False)
            return True
        except Exception as e:
            print(f"Excel 쓰기 실패: {e}")
            return False
    
    def read_json(self, path: str) -> Optional[dict]:
        """JSON 읽기"""
        try:
            import json
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"JSON 읽기 실패: {e}")
            return None
    
    def write_json(self, data, path: str, indent: int = 2) -> bool:
        """JSON 쓰기"""
        try:
            import json
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=indent, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"JSON 쓰기 실패: {e}")
            return False


# === 이미지 처리 ===

class ImageProcessor(FileProcessor):
    """이미지 처리 클래스"""
    
    def resize_image(self, path: str, width: int, height: int, output: str = None) -> bool:
        """이미지 리사이즈"""
        try:
            from PIL import Image
            img = Image.open(path)
            img = img.resize((width, height), Image.Resampling.LANCZOS)
            output = output or path
            img.save(output)
            return True
        except Exception as e:
            print(f"이미지 리사이즈 실패: {e}")
            return False
    
    def convert_format(self, path: str, format: str, output: str = None) -> bool:
        """이미지 포맷 변환"""
        try:
            from PIL import Image
            img = Image.open(path)
            output = output or Path(path).stem + "." + format.lower()
            img.save(output, format=format.upper())
            return True
        except Exception as e:
            print(f"포맷 변환 실패: {e}")
            return False
    
    def create_thumbnail(self, path: str, size: tuple = (128, 128), output: str = None) -> bool:
        """썸네일 생성"""
        try:
            from PIL import Image
            img = Image.open(path)
            img.thumbnail(size, Image.Resampling.LANCZOS)
            output = output or str(Path(path).parent / f"thumb_{Path(path).name}")
            img.save(output)
            return True
        except Exception as e:
            print(f"썸네일 생성 실패: {e}")
            return False


if __name__ == "__main__":
    # 테스트
    processor = FileProcessor()
    print("FileProcessor 테스트")
    print(f"현재 디렉토리: {processor.base_dir}")