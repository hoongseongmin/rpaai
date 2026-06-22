window.RPA_CUSTOMERS = window.RPA_CUSTOMERS || {};

window.RPA_CUSTOMERS['hanwhainsure'] = {
    monthOffset: -1,
    tasks: [
        { id: 'hanwhainsure_1', op: 'doc_official', title: '1. 유지보수 청구서 공문 작성(1,4,7,10월)', date: '분기별 상시' },
        { id: 'hanwhainsure_2', op: 'check_simple', title: '2. 정기점검서 요청(3,6,9,12월)', date: '분기별 상시' },
        { id: 'hanwhainsure_3', op: 'check_simple', title: '3. 정기점검서 취합(4,7,10,1월)', date: '분기별 상시' }
    ],
    
    renderOneclick: function(savedData) { return ''; },
    
    onOneclickRendered: function() {},

    getDashboardKeys: function(operation, customerId) { return []; },

    renderDashboardInput: function(key, value, operation, customerId) { return null; },

    onDashboardRendered: function(context, operation, customerId) {}
};