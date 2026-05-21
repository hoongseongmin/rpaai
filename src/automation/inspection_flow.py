"""
정기점검서 자동화业务流程 모듈
- 1단계: 설정 + 유틸리티 기반

사용자가 수정 가능하도록 뼈대만 제공
"""
from src.utils.config_loader import get_config
from src.utils.file_handler import ensure_folder, move_file, rename_file, get_latest_file


class InspectionAutomation:
    """정기점검서 자동화 클래스"""
    
    def __init__(self):
        self.config = get_config()
        self.download_path = self.config.get('paths.download')
        self.base_output = self.config.get('paths.base_output')
        self.inspection_folder = self.config.get('paths.inspection_folder')
    
    def setup(self) -> str:
        """1단계: 초기 설정 (폴더 생성)"""
        output_folder = ensure_folder(self.base_output, self.inspection_folder)
        return output_folder
    
    def get_latest_pdf(self) -> str:
        """최신 PDF 파일 조회"""
        return get_latest_file(self.download_path, "*.pdf")
    
    def rename_inspection_file(self, source: str, year: int, month: int) -> bool:
        """
        파일명 자동 변경
        예: 정기점검서_2026년4월.pdf
        
        Args:
            source: 원본 파일 경로
            year: 연도
            month: 월
        """
        # TODO: 사용자가 파일명 패턴 수정 가능
        new_name = f"정기점검서_{year}년{month}월.pdf"
        return rename_file(source, new_name)
    
    def move_to_inspection_folder(self, source: str) -> bool:
        """정기점검서 폴더로 이동"""
        dest = ensure_folder(self.base_output, self.inspection_folder)
        dest_path = f"{dest}/{source.split('/')[-1]}"
        return move_file(source, dest_path)


# === 함수 단위 실행 (테스트용) ===

def run_step1():
    """1단계 실행"""
    print("=" * 50)
    print("1단계: 설정 + 유틸리티 기반")
    print("=" * 50)
    
    auto = InspectionAutomation()
    
    # 폴더 생성
    output = auto.setup()
    print(f"[완료] 출력 폴더: {output}")
    
    # 최신 PDF
    latest = auto.get_latest_pdf()
    print(f"[확인] 최신 PDF: {latest}")
    
    return auto


if __name__ == "__main__":
    run_step1()