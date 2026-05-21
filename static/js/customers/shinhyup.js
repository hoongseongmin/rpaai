window.RPA_CUSTOMERS = window.RPA_CUSTOMERS || {};

window.RPA_CUSTOMERS['shinhyup'] = {
    monthOffset: 0,
    tasks: [
        // 문서 생성 로직(doc_official)을 태우지 않도록 op를 'check_only'로 설정합니다.
        { id: 'shinhyup_1', op: 'check_only', title: '1. 폴라리스에이아이', date: '상시' },
        { id: 'shinhyup_2', op: 'check_only', title: '2. 휴노테크_중부', date: '상시' },
        { id: 'shinhyup_3', op: 'check_only', title: '3. 휴노테크_호남', date: '상시' },
        { id: 'shinhyup_4', op: 'check_only', title: '4. 휴노테크_영남', date: '상시' },
        { id: 'shinhyup_5', op: 'check_only', title: '5. 계산서발행', date: '상시' }
    ],
    
    renderOneclick: function(savedData) {
        return '';
    },
    
    onOneclickRendered: function() {},

    getDashboardKeys: function(operation, customerId) { return []; },

    renderDashboardInput: function(key, value, operation, customerId) { return null; },

    onDashboardRendered: function(context, operation, customerId) {}
};