"""
파일 처리 유틸리티 테스트
"""
import os
from pathlib import Path
import pytest
import pandas as pd

from src.utils.file_processor import FileProcessor, DataFileProcessor, ImageProcessor


def test_file_processor(tmp_path):
    """FileProcessor 테스트"""
    processor = FileProcessor()
    
    # pytest에서 제공하는 tmp_path를 활용해 안전한 임시 테스트 파일 생성
    test_file = tmp_path / "requirements.txt"
    test_file.write_text("pytest\npandas\n")
    
    info = processor.get_file_info(str(test_file))
    assert info is not None
    assert info.get('name') == "requirements.txt"
    assert processor.get_file_extension(str(test_file)) == ".txt"
    
    # 파일 목록 조회 테스트 검증
    files = processor.list_files(str(tmp_path), "*.txt")
    assert len(files) == 1
    assert "requirements.txt" in files[0]


def test_data_processor(tmp_path):
    """DataFileProcessor 테스트"""
    processor = DataFileProcessor()
    test_csv = tmp_path / "test.csv"
    
    data = pd.DataFrame({
        "이름": ["홍길동", "김철수", "이영희"],
        "나이": [25, 30, 28],
        "부서": ["영업", "개발", "마케팅"]
    })
    
    # CSV 쓰기/읽기 테스트 검증
    processor.write_csv(data, str(test_csv))
    assert test_csv.exists()
    
    read_data = processor.read_csv(str(test_csv))
    assert read_data is not None
    assert len(read_data) == 3
    assert "이름" in read_data.columns


def test_image_processor(tmp_path):
    """ImageProcessor 테스트"""
    processor = ImageProcessor()
    
    # 임시 이미지 파일 생성
    test_image = tmp_path / "test_img.png"
    test_image.touch()
    
    images = processor.list_files(str(tmp_path), "*.png")
    assert len(images) == 1
    assert "test_img.png" in images[0]