"""
파일 처리 유틸리티 테스트
"""
import os
import sys
from pathlib import Path

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.file_processor import FileProcessor, DataFileProcessor, ImageProcessor


def test_file_processor():
    """FileProcessor 테스트"""
    print("=" * 50)
    print("FileProcessor 테스트")
    print("=" * 50)
    
    processor = FileProcessor()
    
    # 테스트용 파일 생성
    test_dir = Path("tests/test_data")
    test_dir.mkdir(parents=True, exist_ok=True)
    
    # 파일 정보 조회 테스트
    test_file = "requirements.txt"
    if os.path.exists(test_file):
        info = processor.get_file_info(test_file)
        print(f"파일: {info.get('name')}")
        print(f"크기: {info.get('size')} bytes")
        print(f"확장자: {processor.get_file_extension(test_file)}")
    
    # 파일 목록 조회
    files = processor.list_files(".", "*.txt")
    print(f"\n.txt 파일 목록: {files}")
    
    print("\n✅ FileProcessor 테스트 완료")


def test_data_processor():
    """DataFileProcessor 테스트"""
    print("\n" + "=" * 50)
    print("DataFileProcessor 테스트")
    print("=" * 50)
    
    processor = DataFileProcessor()
    
    # CSV 쓰기/읽기 테스트
    test_csv = "tests/test_data/test.csv"
    Path(test_csv).parent.mkdir(parents=True, exist_ok=True)
    
    try:
        import pandas as pd
        # 테스트 데이터
        data = pd.DataFrame({
            "이름": ["홍길동", "김철수", "이영희"],
            "나이": [25, 30, 28],
            "부서": ["영업", "개발", "마케팅"]
        })
        
        # CSV 쓰기
        if processor.write_csv(data, test_csv):
            print(f"CSV 쓰기 성공: {test_csv}")
        
        # CSV 읽기
        read_data = processor.read_csv(test_csv)
        if read_data is not None:
            print("CSV 읽기 성공:")
            print(read_data)
        
    except Exception as e:
        print(f"CSV 테스트 오류: {e}")
    
    print("\n✅ DataFileProcessor 테스트 완료")


def test_image_processor():
    """ImageProcessor 테스트"""
    print("\n" + "=" * 50)
    print("ImageProcessor 테스트")
    print("=" * 50)
    
    processor = ImageProcessor()
    
    # 테스트용 이미지 확인
    test_dir = Path("tests/test_data")
    if test_dir.exists():
        images = processor.list_files(str(test_dir), "*.png")
        print(f"테스트 이미지: {images}")
    
    print("ImageProcessor 초기화 완료")
    print("\n✅ ImageProcessor 테스트 완료")


if __name__ == "__main__":
    print("🚀 파일 처리 유틸리티 테스트 시작\n")
    
    test_file_processor()
    test_data_processor()
    test_image_processor()
    
    print("\n" + "=" * 50)
    print("🎉 모든 테스트 완료!")
    print("=" * 50)