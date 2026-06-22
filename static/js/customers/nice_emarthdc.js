window.RPA_CUSTOMERS = window.RPA_CUSTOMERS || {};

window.RPA_CUSTOMERS['nice_emarthdc'] = {
    monthOffset: 0,
    tasks: [
        // 💡 이마트신세계HDC용 작업 목록
        { id: 'nice_emarthdc_1', op: 'doc_official', title: '1. 📝 청구공문 생성 (Word)', date: '매월 초' },
        { id: 'nice_emarthdc_2', op: 'nice_emarthdc_2', title: '2. 📊 송부본 및 발행리스트 파생 (Excel)', date: '매월 초' },
        { id: 'nice_emarthdc_3', op: 'check_simple', title: '3. 정기점검서 요청', date: '분기별 상시' }
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