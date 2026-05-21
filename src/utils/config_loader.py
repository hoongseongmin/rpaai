"""
설정 파일 관리 유틸리티
- config.json 로드/저장
- 설정값 조회
"""
import json
from pathlib import Path
from typing import Any, Optional


class ConfigLoader:
    """설정 파일 로더"""
    
    def __init__(self, config_path: str = None):
        if config_path is None:
            # 기본 경로: 프로젝트_root/config/config.json
            base = Path(__file__).parent.parent.parent
            config_path = base / "config" / "config.json"
        
        self.config_path = Path(config_path)
        self._config: dict = {}
        self.load()
    
    def load(self) -> dict:
        """설정 파일 로드"""
        if not self.config_path.exists():
            print(f"[경고] 설정 파일 없음: {self.config_path}")
            return {}
        
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self._config = json.load(f)
            print(f"[설정] 로드 완료: {self.config_path.name}")
            return self._config
        except Exception as e:
            print(f"[에러] 설정 로드 실패: {e}")
            return {}
    
    def save(self) -> bool:
        """설정 파일 저장"""
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(self._config, f, ensure_ascii=False, indent=2)
            print(f"[설정] 저장 완료: {self.config_path.name}")
            return True
        except Exception as e:
            print(f"[에러] 설정 저장 실패: {e}")
            return False
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        설정값 조회 (점notation 지원)
        예: config.get('paths.download')
        """
        keys = key.split('.')
        value = self._config
        
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
                if value is None:
                    return default
            else:
                return default
        
        return value
    
    def set(self, key: str, value: Any) -> bool:
        """
        설정값 변경 (점notation 지원)
        예: config.set('paths.download', 'C:/new/path')
        """
        keys = key.split('.')
        target = self._config
        
        for k in keys[:-1]:
            if k not in target:
                target[k] = {}
            target = target[k]
        
        target[keys[-1]] = value
        return True
    
    @property
    def all(self) -> dict:
        """전체 설정 반환"""
        return self._config


# 전역 인스턴스
_config = None


def get_config() -> ConfigLoader:
    """전역 설정 인스턴스 반환"""
    global _config
    if _config is None:
        _config = ConfigLoader()
    return _config


# 테스트
if __name__ == "__main__":
    cfg = get_config()
    print(f"프로젝트명: {cfg.get('project.name')}")
    print(f"다운로드 경로: {cfg.get('paths.download')}")
    print(f"저장 폴더: {cfg.get('paths.inspection_folder')}")