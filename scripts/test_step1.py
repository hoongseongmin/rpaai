"""1단계 테스트 스크립트"""
from src.automation.status_loader import StatusLoader, ComparisonEngine
from src.utils.config_loader import get_config

config = get_config()
loader = StatusLoader(config)

# 고객사별 설정 확인
print("=" * 50)
print("1단계: 고객사별 설정 확인")
print("=" * 50)

for customer in config.get('customers', {}).keys():
    cfg = config.get(f'customers.{customer}')
    print(f"\n[{customer}]")
    print(f"  템플릿: {cfg.get('inspection_template')}")
    print(f"  운영현황: {cfg.get('status_file')}")
    print(f"  매칭필드: {cfg.get('match_field')}")
    print(f"  비교필드: {cfg.get('comparison_fields')}")

print("\n" + "=" * 50)
print("설정 로드 완료")
print("=" * 50)