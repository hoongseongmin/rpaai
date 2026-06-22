window.RPA_CUSTOMERS = window.RPA_CUSTOMERS || {};

window.RPA_CUSTOMERS['nice_hyundai'] = {
    monthOffset: 0,
    tasks: [
        // 💡 현대백화점용 작업 목록
        { id: 'nice_hyundai_1', op: 'doc_official', title: '1. 📝 청구공문 생성 (Word)', date: '매월 초' },
        { id: 'nice_hyundai_2', op: 'check_simple', title: '2. 정기점검서 요청', date: '분기별 상시' }
    ],

    renderOneclick: function(savedData) { return ''; },
    
    onOneclickRendered: function() {},

    getDashboardKeys: function(operation, customerId) {
        return ['합계금액', '공급가액', '부가세'];
    },

    renderDashboardInput: function(key, value, operation, customerId) {
        return null;
    },

    onDashboardRendered: function(context, operation, customerId) {}
};