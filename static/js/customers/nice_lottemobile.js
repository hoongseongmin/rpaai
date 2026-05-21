window.RPA_CUSTOMERS = window.RPA_CUSTOMERS || {};

window.RPA_CUSTOMERS['nice_lottemobile'] = {
    monthOffset: 0,
    tasks: [
        { id: 'nice_lottemobile_1', op: 'doc_official', title: '1. 📝 청구공문 생성 (Word)', date: '매월 초' }
    ],
    
    renderOneclick: function(savedData) {
        return '';
    },
    
    onOneclickRendered: function() {},

    getDashboardKeys: function(operation, customerId) {
        return ['합계금액', '공급가액', '부가세'];
    },

    renderDashboardInput: function(key, value, operation, customerId) {
        return null;
    },

    onDashboardRendered: function(context, operation, customerId) {}
};