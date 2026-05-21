"""
파일 처리 유틸리티 모음
- 폴더 생성
- 파일 이동
- 파일명 변경
"""
import os
import shutil
from pathlib import Path
from datetime import datetime
from typing import Optional


def ensure_folder(base_path: str, *subfolders: str) -> str:
    """
    폴더가 없으면 생성, 있으면 기존 경로 반환
    
    Args:
        base_path: 기본 경로
        *subfolders: 하위 폴더 경로
        
    Returns:
        생성된 폴더의 전체 경로
    """
    full_path = Path(base_path)
    for folder in subfolders:
        full_path = full_path / folder
    
    full_path.mkdir(parents=True, exist_ok=True)
    return str(full_path)


def move_file(source: str, destination: str, overwrite: bool = False) -> bool:
    """
    파일을 지정한 경로로 이동
    
    Args:
        source: 원본 파일 경로
        destination: 대상 경로 (파일명 포함)
        overwrite:同名 파일 시 덮어쓰기 여부
        
    Returns:
        성공 True, 실패 False
    """
    src = Path(source)
    dst = Path(destination)
    
    if not src.exists():
        print(f"[에러] 원본 파일 없음: {source}")
        return False
    
    # 대상 폴더가 없으면 생성
    dst.parent.mkdir(parents=True, exist_ok=True)
    
    #同名 파일 처리
    if dst.exists() and not overwrite:
        print(f"[에러] 대상 파일 존재: {destination}")
        return False
    
    try:
        shutil.move(str(src), str(dst))
        print(f"[이동] {src.name} → {dst}")
        return True
    except Exception as e:
        print(f"[에러] 파일 이동 실패: {e}")
        return False


def rename_file(source: str, new_name: str, overwrite: bool = False) -> bool:
    """
    파일명 변경
    
    Args:
        source: 원본 파일 경로
        new_name: 새 파일명
        overwrite:同名 파일 시 덮어쓰기 여부
        
    Returns:
        성공 True, 실패 False
    """
    src = Path(source)
    dst = src.parent / new_name
    
    if not src.exists():
        print(f"[에러] 원본 파일 없음: {source}")
        return False
    
    if dst.exists() and not overwrite:
        print(f"[에러] 대상 파일 존재: {new_name}")
        return False
    
    try:
        src.rename(dst)
        print(f"[이름변경] {src.name} → {new_name}")
        return True
    except Exception as e:
        print(f"[에러] 파일명 변경 실패: {e}")
        return False


def get_latest_file(folder: str, pattern: str = "*") -> Optional[str]:
    """
    폴더에서 최신 파일 조회
    
    Args:
        folder: 검색할 폴더 경로
        pattern: 파일 패턴 (기본: 모든 파일)
        
    Returns:
        최신 파일 경로 또는 None
    """
    folder_path = Path(folder)
    if not folder_path.exists():
        return None
    
    files = list(folder_path.glob(pattern))
    if not files:
        return None
    
    # 수정일 기준 정렬
    latest = max(files, key=lambda f: f.stat().st_mtime)
    return str(latest)


def copy_file(source: str, destination: str, overwrite: bool = False) -> bool:
    """
    파일 복사
    
    Args:
        source: 원본 파일 경로
        destination: 대상 경로
        overwrite: 덮어쓰기 여부
        
    Returns:
        성공 True, 실패 False
    """
    src = Path(source)
    dst = Path(destination)
    
    if not src.exists():
        print(f"[에러] 원본 파일 없음: {source}")
        return False
    
    dst.parent.mkdir(parents=True, exist_ok=True)
    
    if dst.exists() and not overwrite:
        print(f"[에러] 대상 파일 존재: {destination}")
        return False
    
    try:
        shutil.copy2(str(src), str(dst))
        print(f"[복사] {src.name} → {dst}")
        return True
    except Exception as e:
        print(f"[에러] 파일 복사 실패: {e}")
        return False