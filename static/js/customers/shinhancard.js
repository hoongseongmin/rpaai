window.RPA_CUSTOMERS = window.RPA_CUSTOMERS || {};

window.RPA_CUSTOMERS['shinhancard'] = {
    monthOffset: 0,
    tasks: [
        // 문서 생성(doc_official)을 타지 않도록 op를 'check_simple'로 설정
        { id: 'shinhancard_1', op: 'check_simple', title: '1. 장애지원내역 작성 및 계산서 발행(분기)', date: '분기별 상시' }
    ],
    
    renderOneclick: function(savedData) {
        return '';
    },
    
    onOneclickRendered: function() {},

    getDashboardKeys: function(operation, customerId) { return []; },

    renderDashboardInput: function(key, value, operation, customerId) { return null; },

    onDashboardRendered: function(context, operation, customerId) {}
};