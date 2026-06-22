window.RPA_CUSTOMERS = window.RPA_CUSTOMERS || {};

window.calculateHannetTotal = function() {
    const qtyInput = document.querySelector('input[data-key="수량"]');
    const priceInput = document.querySelector('input[data-key="단가"]');
    const totalInput = document.querySelector('input[data-key="청구금액"]') || document.getElementById('fast_total') || document.getElementById('input_total');

    if (qtyInput && priceInput && totalInput) {
        const qty = parseFloat(qtyInput.value) || 0;
        const price = parseInt(priceInput.value.replace(/[^0-9\-]/g, ''), 10) || 0;
        
        if (qty > 0 && price > 0) {
            const total = qty * price;
            totalInput.value = total.toLocaleString('ko-KR');
        } else if (qty === 0 && priceInput.value !== '엑셀파일 연동' && priceInput.value !== '데이터 불러오는 중...') {
            totalInput.value = '0';
        }
        if (typeof calculateVAT === 'function') calculateVAT(totalInput);
    }
};

const hannetBase = {
    monthOffset: 0,
    getDashboardKeys: function(operation, customerId) { return ['수량', '단가', '청구금액']; },
    renderDashboardInput: function(key, value, operation, customerId) {
        if (key === '수량') return `<input type="number" class="edit-input" data-key="${key}" value="${value}" placeholder="대수 입력" oninput="if(typeof calculateHannetTotal === 'function') calculateHannetTotal();" style="width: 100%; padding: 10px; border: 2px solid var(--primary); border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #f4faff;">`;
        if (key === '단가') return `<input type="text" class="edit-input money-input" data-key="${key}" value="${value}" placeholder="직접 입력 또는 연동" oninput="formatMoney(this); if(typeof calculateHannetTotal === 'function') calculateHannetTotal();" style="width: 100%; padding: 10px; border: 1px solid #cce4f7; border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #fff; color: #333;">`;
        if (key === '청구금액') return `<input type="text" id="input_total" class="edit-input money-input" data-key="${key}" value="${value}" placeholder="수량×단가 또는 직접입력" oninput="formatMoney(this); if(typeof calculateVAT === 'function') calculateVAT(this);" style="width: 100%; padding: 10px; border: 1px solid #cce4f7; border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #fff; color: #333;">`;
        return null;
    },
    onDashboardRendered: function(context, operation, customerId) {
        if(typeof calculateHannetTotal === 'function') calculateHannetTotal();
    },
    onBackgroundLoaded: function(targetInputKey) {
        if(targetInputKey === '단가' && typeof calculateHannetTotal === 'function') calculateHannetTotal();
    }
};

window.RPA_CUSTOMERS['hannet_glory'] = Object.assign({}, hannetBase, {
    tasks: [{ id: 'hannet_glory', op: 'doc_official', title: '1. 📝 청구공문 생성 (Word)', date: '매월 초' }],
    renderOneclick: function(savedData) {
        return '';
    },
    onOneclickRendered: function() {
    }
});

window.RPA_CUSTOMERS['hannet_atm'] = Object.assign({}, hannetBase, {
    tasks: [{ id: 'hannet_atm', op: 'doc_official', title: '1. 📝 청구공문 생성 (Word)', date: '매월 초' }],
    renderOneclick: function(savedData) {
        return `
            <div style="background: #f0f7ff; border: 1px solid #cce4f7; border-radius: 8px; padding: 20px; width: 100%; box-sizing: border-box; margin-top:15px;">
                <h4 style="color: #0056b3; margin-top: 0; margin-bottom: 15px; font-size: 1.1em;">🟦 [한네트 자동화기기] 청구 정보</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                    <div style="flex: 1; min-width: 150px;">
                        <label style="font-weight: bold; display: block; margin-bottom: 5px; color: #0056b3;">기기 수량 (대)</label>
                        <input type="number" class="common-input" data-key="수량" data-name="수량" value="${savedData['수량'] || ''}" placeholder="예: 5" oninput="if(typeof calculateHannetTotal === 'function') calculateHannetTotal();" style="width: 100%; padding: 10px; border: 2px solid var(--primary); border-radius: 4px; font-weight: bold; background-color: #fff;">
                    </div>
                    <div style="flex: 1; min-width: 150px;">
                        <label style="font-weight: bold; display: block; margin-bottom: 5px; color: #0056b3;">단가</label>
                        <input type="text" class="common-input money-input" data-key="단가" value="엑셀파일 연동" readonly style="width: 100%; padding: 10px; border: 1px solid #cce4f7; border-radius: 4px; font-weight: bold; background-color: #e9ecef; color: #6c757d;">
                    </div>
                    <div style="display: none; flex: 1; min-width: 150px;">
                        <label style="font-weight: bold; display: block; margin-bottom: 5px; color: #0056b3;">청구금액</label>
                        <input type="text" class="common-input money-input" id="fast_total" data-key="청구금액" value="">
                    </div>
                </div>
            </div>
        `;
    },
    onOneclickRendered: function() {
        if(typeof calculateHannetTotal === 'function') calculateHannetTotal();
    }
});