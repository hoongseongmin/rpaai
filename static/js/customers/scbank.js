window.RPA_CUSTOMERS = window.RPA_CUSTOMERS || {};

window.RPA_CUSTOMERS['scbank'] = {
    monthOffset: 0,
    tasks: [
        { id: 'scbank_1', op: 'check_simple', title: '1. 운영현황 작성 및 송부(매월)', date: '월별 상시' },
        { id: 'scbank_2', op: 'check_simple', title: '2. 정기점검서 요청', date: '분기별 상시' },       
        { id: 'scbank_3', op: 'check_simple', title: '3. 점검결과 공문 작성(분기)', date: '분기별 상시' },
        { id: 'scbank_4', op: 'check_simple', title: '4. 검수확인서(유지보수) 작성(분기)', date: '분기별 상시' },
        { id: 'scbank_5', op: 'check_simple', title: '5. 분기 청구내역 작성(분기)', date: '분기별 상시' },
        { id: 'scbank_6', op: 'check_simple', title: '6. 취약점 점검 요청(반기)', date: '반기별 상시' },
        { id: 'scbank_7', op: 'check_simple', title: '7. 취약점 점검(반기)', date: '반기별 상시' }
    ],
    
    renderOneclick: function(savedData) { return ''; },
    
    onOneclickRendered: function() {},

    getDashboardKeys: function(operation, customerId) { return []; },

    renderDashboardInput: function(key, value, operation, customerId) { return null; },

    onDashboardRendered: function(context, operation, customerId) {}
};