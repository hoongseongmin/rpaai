window.RPA_CUSTOMERS = window.RPA_CUSTOMERS || {};

window.RPA_CUSTOMERS['hanwhagalleria'] = {
    monthOffset: 0, // 청구 기준일 (0: 당월, -1: 전월)
    tasks: [
        { id: 'hanwhagalleria_1', op: 'check_simple', title: '1. 프로젝트 산출물(매월)', date:    '매월' },
        { id: 'hanwhagalleria_2', op: 'check_simple', title: '2. 기성청구 내역서(매월)', date: '매월'  },
        { id: 'hanwhagalleria_3', op: 'check_simple', title: '3. 신청액 산정표(매월)', date: '매월'  },
        { id: 'hanwhagalleria_4', op: 'check_simple', title: '4. 정기점검서 요청(2,5,8,11월)', date: '분기별 상시' },    
        { id: 'hanwhagalleria_5', op: 'check_simple', title: '5. 정기점검서 취합(3,6,9,12월)', date: '분기별 상시' }
    ],
    renderOneclick: function(savedData) {
        return `
            <div style="background: #f0f7ff; border: 1px solid #cce4f7; border-radius: 8px; padding: 20px; width: 100%; box-sizing: border-box; margin-top:15px;">
                <h4 style="color: #0056b3; margin-top: 0; margin-bottom: 15px; font-size: 1.1em;">🟦 [한화갤러리아] 청구 정보</h4>
                <p style="color: #666; font-size: 0.9em; margin-bottom: 0;">아직 별도 지정된 금액 입력 양식이 없습니다. (기본 템플릿으로 진행됩니다.)</p>
            </div>
        `;
    },
    onOneclickRendered: function() {},
    getDashboardKeys: function(operation, customerId) { return []; },
    renderDashboardInput: function(key, value, operation, customerId) { return null; },
    onDashboardRendered: function(context, operation, customerId) {}
};