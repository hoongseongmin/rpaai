window.RPA_CUSTOMERS = window.RPA_CUSTOMERS || {};

window.RPA_CUSTOMERS['nice_hyundai'] = {
    monthOffset: 0,
    tasks: [
        // 💡 현대백화점용 작업 목록
        { id: 'nice_hyundai_1', op: 'doc_official', title: '1. 📝 청구공문 생성 (Word)', date: '매월 초' },
        { id: 'nice_hyundai_2', op: 'doc_official', title: '2. 📝 두번째 작업 입력', date: '매월 초' },
        { id: 'nice_hyundai_3', op: 'doc_official', title: '3. 📊 세번째 작업 입력', date: '매월 초' },
        { id: 'nice_hyundai_4', op: 'doc_official', title: '4. 📊 네번째 작업 입력', date: '매월 초' },
        { id: 'nice_hyundai_5', op: 'doc_official', title: '5. 📝 다섯번째 작업 입력', date: '매월 초' },
        { id: 'nice_hyundai_6', op: 'doc_official', title: '6. 📝 여섯번째 작업 입력', date: '매월 초' },
        { id: 'nice_hyundai_7', op: 'doc_official', title: '7. 📝 일곱번째 작업 입력', date: '매월 초' }
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