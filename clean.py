import os
from pathlib import Path

base = Path(__file__).parent
bad_files = [
    base / "config.py",
    base / "files.py",
    base / "file_service.py",
    base / "src" / "config.py",
    base / "src" / "files.py",
    base / "src" / "file_service.py",
    base / "src" / "core.py",
    base / "src" / "routes.py",
    base / "src" / "services.py",
]

print("🧹 파이썬을 헷갈리게 하는 중복 파일 정리를 시작합니다...")
for f in bad_files:
    if f.exists() and f.is_file():
        f.unlink()
        print(f"🗑️ 방해 파일 삭제 완료: {f.relative_to(base)}")

print("\n✨ 정리 끝! 이제 터미널에서 'uvicorn main:app --reload' 를 다시 실행해주세요.")