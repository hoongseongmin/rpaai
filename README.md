# 정기점검서 자동화

여러 고객사의 정기점검서业务流程를 자동화하는 RPA 프로젝트입니다.

## 프로세스

```
1. 메일 전송 (서비스운영 → 센터)
2. 메일 수신 + PDF 첨부파일 다운로드 (센터 → 서비스운영)
3. 파일명 자동 변경 + 지정 폴더 저장
4. 운영현황 Excel과 비교
5. 취합 후 병합 (최종본 생성)
```

## 프로젝트 구조

```
rpaai/
├── config/
│   └── config.json          # 고객사별 설정
├── data/
│   └── 운영현황_*.xlsx      # 고객사별 운영현황 파일
├── outputs/
│   └── 한화손해보험_정기점검서/  # 출력 폴더
├── src/
│   ├── automation/
│   │   ├── document_generator.py # 고객사별 공문 및 청구자료 생성기
│   │   ├── inspection_flow.py    # 업무 프로세스
│   │   └── status_loader.py      # 운영현황 비교 엔진 (Pandas)
│   └── utils/
│       ├── config_loader.py      # 설정 로더
│       └── file_handler.py       # 파일 유틸리티
│       └── task_manager.py       # 작업 상태 로깅
├── templates/
│   ├── index.html            # [파일 처리] 다목적 파일 도구 UI
│   ├── rpa_dashboard.html    # [청구자료 작성] 고객사 맞춤형 대시보드
│   └── schedule.html         # [업무 스케줄] 고객사별 산출물 체크리스트
├── scripts/
│   └── test_step1.py       # 테스트
└── main.py                  # FastAPI 웹 메인 및 라우터
```

## 설정 (config.json)

### 고객사별 설정

```json
{
  "customers": {
    "한화손해보험": {
      "inspection_template": "정기점검서_{year}년{month}월.pdf",
      "status_file": "운영현황_한화손해보험.xlsx",
      "match_field": "순번",
      "comparison_fields": ["검수항목", "결과"]
    }
  }
}
```

| 필드 | 설명 |
|------|------|
| `inspection_template` | 정기점검서 파일명 패턴 |
| `status_file` | 운영현황 Excel 파일명 |
| `match_field` | 비교 기준 필드 (순번, no 등) |
| `comparison_fields` | 비교할 필드 목록 |

### 경로 설정

```json
{
  "paths": {
    "download": "C:/Users/User/Downloads",
    "base_output": "C:/Users/User/Desktop/rpaai/outputs",
    "data_folder": "C:/Users/User/Desktop/rpaai/data"
  }
}
```

## 사용법

### 1. 가상환경 활성화

```powershell
.\venv\Scripts\activate
```

### 2. 설정 확인

```powershell
.\venv\Scripts\python.exe scripts\test_step1.py
```

### 3. 고객사 추가

`config/config.json`의 `customers`에 추가:

```json
"새고객사": {
  "name": "새고객사",
  "inspection_template": "검수_{year}년{month}월.pdf",
  "status_file": "운영현황_새고객사.xlsx",
  "match_field": "순번",
  "comparison_fields": ["항목", "결과"]
}
```

### 4. 운영현황 파일 준비

`data/` 폴더에 Excel 파일 배치:
- `운영현황_한화손해보험.xlsx`
- `운영현황_현대해상.xlsx`

## 모듈 설명

| 모듈 | 기능 |
|------|------|
| `config_loader.py` | config.json 로드/저장 |
| `file_handler.py` | 폴더 생성, 파일 이동/이름변경 |
| `status_loader.py` | 운영현황 Excel 로드, 비교 엔진 |
| `inspection_flow.py` |业务流程 자동화 |

## 진행 상황

- [x] 1단계: 설정 + 유틸리티 기반
- [ ] 2단계: 메일 자동화
- [ ] 3단계: 파일 처리
- [ ] 4단계: 비교 & 병합
- [ ] 5단계: 청구자료 (선택)

## 환경

- Python 3.10+
- pandas, openpyxl
- Windows

📅 워드 템플릿용 날짜 변수 총정리
(※ 예시 기준: 사용자가 화면에서 청구연월: 2026년 05월, 작성일자: 2026년 05월 14일로 설정했을 때)

1. 청구연월 (작업 대상 월) 관련 변수
워드 입력 태그	실제 출력되는 결과	설명
{{청구연월}}	2026년 05월	화면에 입력된 청구연월 원본
{{청구연도}}	2026	청구연월에서 연도(4자리 숫자)만 추출
{{청구월}}	05월	청구연월에서 월(0이 붙은 숫자+월)만 추출
{{전월연도}}	2026	청구월 기준 바로 이전 달의 연도
{{전월}}	04월	청구월 기준 바로 이전 달
(※ 만약 청구월이 1월이라면, 전월연도는 작년도로 바뀌고 전월은 12월로 똑똑하게 자동 계산됩니다!)

2. 작성일자 (공문 발행일) 관련 변수
워드 입력 태그	실제 출력되는 결과	설명
{{작성일자}}	2026년 05월 14일	화면에 입력된 작성일자 원본
{{작성일자_숫자}}	20260514	연월일 사이에 기호 없이 숫자 8자리만 출력
{{작성일자_점}}	2026.05.14	연.월.일 형태로 점(.)으로 구분하여 출력
{{작성연도_숫자}}	2026	작성일자에서 연도(4자리 숫자)만 추출
{{작성월_숫자}}	05	작성일자에서 월(숫자 2자리)만 추출
{{작성일자_일}}	14	작성일자에서 일(숫자 2자리)만 추출