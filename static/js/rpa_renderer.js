/**
 * RPA/AI 자동화 플랫폼
 * 고객사별 렌더링 및 공통 기능 분리 처리기
 */
window.RpaRenderer = {
    // 1. 고객사 ID에서 베이스 고객사 추출
    getBaseCustomer: function(customer) {
        if (!customer) return '';
        return customer.startsWith('nice_') ? customer.split('_').slice(0, 2).join('_') : customer.split('_')[0];
    },

    // 2. 엑셀 백그라운드 데이터 로드 후 연산 트리거 (oneclick.html)
    onBackgroundDataLoaded: function(customer, targetInputKey) {
        const baseCustomer = this.getBaseCustomer(customer);
        if (window.RPA_CUSTOMERS && window.RPA_CUSTOMERS[baseCustomer] && window.RPA_CUSTOMERS[baseCustomer].onBackgroundLoaded) {
            window.RPA_CUSTOMERS[baseCustomer].onBackgroundLoaded(targetInputKey);
        } else {
            // 기본 로직
            if (targetInputKey === '월유지비용' && typeof calculateActualPayment === 'function') calculateActualPayment();
            else if (targetInputKey === '당초청구금액_4' && typeof calculateClaimAmount === 'function') calculateClaimAmount('4');
        }
    },

    // 3. PDF 추출 후 연산 트리거 (rpa_dashboard.html, oneclick.html)
    onPdfExtracted: function(customer) {
        const baseCustomer = this.getBaseCustomer(customer);
        if (window.RPA_CUSTOMERS && window.RPA_CUSTOMERS[baseCustomer] && window.RPA_CUSTOMERS[baseCustomer].onPdfExtracted) {
            window.RPA_CUSTOMERS[baseCustomer].onPdfExtracted();
        } else {
            // 기본 로직
            if (typeof calculateSatisfaction === 'function') calculateSatisfaction();
            if (typeof calculateRate === 'function') {
                calculateRate('정기점검');
                calculateRate('이전설치');
            }
        }
    },

    // 4. 대시보드 렌더링 직후 초기화 연산 트리거
    onDashboardRendered: function(context, operation, customer) {
        const baseCustomer = this.getBaseCustomer(customer);
        if (window.RPA_CUSTOMERS && window.RPA_CUSTOMERS[baseCustomer] && window.RPA_CUSTOMERS[baseCustomer].onDashboardRendered) {
            window.RPA_CUSTOMERS[baseCustomer].onDashboardRendered(context, operation, customer);
        } else {
            const totalInput = document.getElementById('input_total');
            if (totalInput && typeof calculateVAT === 'function') calculateVAT(totalInput);
            if (typeof calculateClaimAmount === 'function') calculateClaimAmount();
            if (typeof calculateActualPayment === 'function') calculateActualPayment();
        }
    },

    // 5. 대시보드 인풋 렌더링 (rpa_dashboard.html)
    renderDashboardInput: function(key, value, isExposed, operation, customer) {
        const baseCustomer = this.getBaseCustomer(customer);
        
        // 고객사별 커스텀 렌더링 우선 적용
        if (window.RPA_CUSTOMERS && window.RPA_CUSTOMERS[baseCustomer] && window.RPA_CUSTOMERS[baseCustomer].renderDashboardInput) {
            const customHtml = window.RPA_CUSTOMERS[baseCustomer].renderDashboardInput(key, value, operation, customer);
            if (customHtml) return customHtml;
        }

        // 공통 / 기본 렌더링 로직
        if (isExposed) {
            if (key === '만족도조사_건수' || key === '만족도조사_총점') {
                return `<input type="number" class="edit-input" data-key="${key}" value="${value}" oninput="calculateSatisfaction();" style="width: 100%; padding: 10px; border: 2px solid var(--primary); border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #f4faff;">`;
            } else if (key === '만족도조사_평점') {
                return `<input type="text" class="edit-input" data-key="${key}" value="${value}" placeholder="자동 계산됨" readonly style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #f5f5f5; color: #888;">`;
            } else if (key === '정기점검_총대상수' || key === '정기점검_완료수') {
                return `<input type="number" class="edit-input" data-key="${key}" value="${value}" oninput="calculateRate('정기점검');" style="width: 100%; padding: 10px; border: 2px solid var(--primary); border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #f4faff;">`;
            } else if (key === '이전설치_총대상수' || key === '이전설치_완료수') {
                return `<input type="number" class="edit-input" data-key="${key}" value="${value}" oninput="calculateRate('이전설치');" style="width: 100%; padding: 10px; border: 2px solid var(--primary); border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #f4faff;">`;
            } else if (key === '정기점검_달성률' || key === '이전설치_달성률') {
                return `<input type="text" class="edit-input" data-key="${key}" value="${value}" placeholder="자동 계산됨" readonly style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #f5f5f5; color: #888;">`;
            } else if (key === '장애_적기처리건수' || key === '장애_지연처리건수') {
                return `<input type="number" class="edit-input" data-key="${key}" value="${value}" style="width: 100%; padding: 10px; border: 2px solid var(--primary); border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #f4faff;">`;
            } else if (key === '청구금액' || key === '실지급액' || key === '부가세' || key === '공급가액') {
                let oninputStr = "formatMoney(this)";
                if (key === '공급가액') oninputStr += "; calculateFromSupply(this);";
                let extraId = key === '합계금액' ? 'id="input_total"' : (key === '공급가액' ? 'id="input_supply"' : (key === '부가세' ? 'id="input_vat"' : ''));
                return `<input type="text" class="edit-input money-input" ${extraId} data-key="${key}" value="${value}" placeholder="자동 계산됨" oninput="${oninputStr}" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #fafafa;" ${key !== '공급가액' ? 'readonly' : ''}>`;
            } else if (['합계금액', '당초청구금액', '정산감액', '미사용차감수량', '미사용차감금액'].includes(key)) {
                let oninputStr = "formatMoney(this)";
                if (key === '합계금액') oninputStr += "; calculateVAT(this);";
                else if (key === '당초청구금액' || key === '정산감액') oninputStr += "; calculateClaimAmount();";
                else if (key === '미사용차감금액') oninputStr += "; calculateActualPayment();";
                let extraId = key === '합계금액' ? 'id="input_total"' : '';
                return `<input type="text" class="edit-input money-input" ${extraId} data-key="${key}" value="${value}" oninput="${oninputStr}" style="width: 100%; padding: 10px; border: 2px solid var(--primary); border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #f4faff;">`;
            } else {
                const isMoney = ['금액', '단가', '가액', '부가세', '지방세', '국세', '비용', '지급액'].some(k => key.includes(k));
                if (isMoney) {
                    return `<input type="text" class="edit-input money-input" data-key="${key}" value="${value}" oninput="formatMoney(this)" style="width: 100%; padding: 10px; border: 2px solid var(--primary); border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #f4faff;">`;
                }
                return `<input type="text" class="edit-input" data-key="${key}" value="${value}" style="width: 100%; padding: 10px; border: 2px solid var(--primary); border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #f4faff;">`;
            }
        } else {
            if (key === '합계금액') {
                return `<input type="text" class="edit-input money-input" id="input_total" data-key="${key}" value="${value}" placeholder="예: 1,650,000" oninput="formatMoney(this); calculateVAT(this);" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; box-sizing: border-box;">`;
            } else if (key === '공급가액') {
                return `<input type="text" class="edit-input money-input" id="input_supply" data-key="${key}" value="${value}" placeholder="자동 계산됨" oninput="formatMoney(this); calculateFromSupply(this);" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; box-sizing: border-box;">`;
            } else if (key === '부가세') {
                return `<input type="text" class="edit-input money-input" id="input_vat" data-key="${key}" value="${value}" placeholder="자동 계산됨" oninput="formatMoney(this)" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; box-sizing: border-box;">`;
            } else if (key === '당초청구금액' || key === '정산감액') {
                const isReadonly = (typeof CustomerManager !== 'undefined') ? CustomerManager.isReadonlyField(key, operation) : false;
                if (isReadonly) {
                    let displayVal = (key === '정산감액') ? '0' : value;
                    return `<input type="text" class="edit-input money-input" data-key="${key}" value="${displayVal}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; color: #888;" readonly>`;
                } else {
                    return `<input type="text" class="edit-input money-input" data-key="${key}" value="${value}" oninput="formatMoney(this); calculateClaimAmount();" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; box-sizing: border-box;">`;
                }
            } else if (key === '청구금액') {
                return `<input type="text" class="edit-input money-input" data-key="${key}" value="${value}" placeholder="자동 계산됨" oninput="formatMoney(this)" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; box-sizing: border-box;">`;
            } else if (key === '월유지비용' || key === '미사용차감수량' || key === '미사용차감금액') {
                return `<input type="text" class="edit-input money-input" data-key="${key}" value="${value}" oninput="formatMoney(this); calculateActualPayment();" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; box-sizing: border-box;">`;
            } else if (key === '실지급액') {
                return `<input type="text" class="edit-input money-input" data-key="${key}" value="${value}" placeholder="자동 계산됨" oninput="formatMoney(this)" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; box-sizing: border-box;">`;
            } else if (key === '고객사코드') {
                return `<input type="text" class="edit-input" data-key="${key}" value="${value}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; color: #888;" readonly>`;
            } else if (key === '만족도조사_건수' || key === '만족도조사_총점') {
                return `<input type="number" class="edit-input" data-key="${key}" value="${value}" oninput="calculateSatisfaction();" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; box-sizing: border-box;">`;
            } else if (key === '만족도조사_평점') {
                return `<input type="text" class="edit-input" data-key="${key}" value="${value}" placeholder="자동 계산됨" readonly style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; color: #888;">`;
            } else if (key === '정기점검_총대상수' || key === '정기점검_완료수') {
                return `<input type="number" class="edit-input" data-key="${key}" value="${value}" oninput="calculateRate('정기점검');" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; box-sizing: border-box;">`;
            } else if (key === '정기점검_달성률' || key === '이전설치_달성률') {
                return `<input type="text" class="edit-input" data-key="${key}" value="${value}" placeholder="자동 계산됨" readonly style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; color: #888;">`;
            } else if (key === '이전설치_총대상수' || key === '이전설치_완료수') {
                return `<input type="number" class="edit-input" data-key="${key}" value="${value}" oninput="calculateRate('이전설치');" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; box-sizing: border-box;">`;
            } else {
                const isMoney = ['금액', '단가', '가액', '부가세', '지방세', '국세', '비용', '지급액'].some(k => key.includes(k));
                if (isMoney) {
                    return `<input type="text" class="edit-input money-input" data-key="${key}" value="${value}" oninput="formatMoney(this)" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; box-sizing: border-box;">`;
                }
                return `<input type="text" class="edit-input" data-key="${key}" value="${value}" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; box-sizing: border-box;">`;
            }
        }
    }
};