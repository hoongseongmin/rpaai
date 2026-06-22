window.RPA_CUSTOMERS = window.RPA_CUSTOMERS || {};

window.RPA_CUSTOMERS['nice_lotte'] = {
    monthOffset: 0, // 나이스씨엠에스는 전월(-1)이 아닌 당월(0) 기준
    tasks: [
        // 💡 원래 작성하셨던(또는 원하시는) 작업 목록을 여기에 넣어주세요!
        { id: 'nice_lotte_1', op: 'doc_excel', title: '1.유지보수료 리스트 작성(Excel)', date: '매월 초' },
        { id: 'nice_lotte_2', op: 'doc_official', title: '2.청구공문 생성 (Word)', date: '매월 초' },
        { id: 'nice_lotte_3', op: 'doc_excel', title: '붙임_1.정산기_청구현황 (Excel)', date: '매월 초' },
        { id: 'nice_lotte_4', op: 'doc_excel', title: '붙임_2.정산기_지점별 발행리스트 (Excel)', date: '매월 초' },
        { id: 'nice_lotte_5', op: 'doc_excel', title: '붙임_3.정산기_휴일지원내역(Excel)', date: '매월 초' },
        { id: 'nice_lotte_6', op: 'check_simple', title: '붙임_4.세금계산서', date: '매월 초' }
    ],
    
    renderOneclick: function(savedData) {
        // 나이스 계열은 특별한 추가 UI 폼이 없으므로 빈 문자열 반환
        return '';
    },
    
    onOneclickRendered: function() {},

    getDashboardKeys: function(operation, customerId) {
        return ['합계금액', '공급가액', '부가세'];
    },

    renderDashboardInput: function(key, value, operation, customerId) {
        return null; // null을 반환하면 공통(기본) 입력칸 스타일을 사용합니다.
    },

    onDashboardRendered: function(context, operation, customerId) {}
};