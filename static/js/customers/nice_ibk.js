window.RPA_CUSTOMERS = window.RPA_CUSTOMERS || {};

window.RPA_CUSTOMERS['nice_ibk'] = {
    monthOffset: 0, // 나이스씨엠에스는 전월(-1)이 아닌 당월(0) 기준
    tasks: [
        { id: 'nice_ibk', op: 'doc_official', title: '1. 📝 맞춤형 공문 생성 (Word)', date: '상시' }
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