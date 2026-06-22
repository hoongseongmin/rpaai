/**
 * RPA/AI 자동화 플랫폼 고객사 및 템플릿 공통 관리 모듈
 * 고객사가 추가될 때마다 HTML을 수정할 필요 없이 이 파일만 수정하면 됩니다.
 */
window.CustomerManager = {
    // 1. 등록된 고객사 목록
    customers: [
        // === 월간 청구 대상 ===
        { value: "hanabank", name: "하나은행" },
        { value: "koreapost", name: "우정사업본부 (완료)" },
        { value: "hanwhagalleria", name: "한화갤러리아" },
        { value: "nice_emarthdc", name: "나이스씨엠에스 이마트신세계HDC" },
        { value: "nice_lotte", name: "나이스씨엠에스 롯데백화점" },
        { value: "nice_hyundai", name: "나이스씨엠에스 현대백화점" },
        { value: "nice_ibk", name: "나이스씨엠에스 기업은행한남동 (완료)" },
        { value: "nice_lottemobile", name: "나이스씨엠에스 롯데백화점모바일상품권" },
        { value: "hannet_glory", name: "한네트 글로리 (완료)" },
        { value: "hannet_atm", name: "한네트 자동화기기(청구공문완료)" },
        { value: "shinhyup", name: "신협 (완료)" },
        // === 분기별 청구 대상 ===
        { value: "scbank", name: "SC은행", isQuarterly: true },
        { value: "shinhancard", name: "신한카드(완료)", isQuarterly: true },
        { value: "hanwhainsure", name: "한화손해보험", isQuarterly: true }
    ],

    // 2. 기본/고객사별 설정 (월 계산 오프셋, 공문번호 노출 여부 등)
    getConfig: function(customerValue) {
        const baseCustomer = this.getBaseCustomer(customerValue);
        const customerInfo = this.customers.find(c => c.value === customerValue) || this.customers.find(c => c.value === baseCustomer) || {};
        
        let config = { 
            monthOffset: 0, 
            showDocNum: true,
            isQuarterly: customerInfo.isQuarterly || false
        };

        if (baseCustomer === 'koreapost') {
            config.monthOffset = -1; // 우체국은 청구연월이 항상 1달 전 기준
            config.showDocNum = false;
        } else if (customerValue === 'hannet_glory') {
            config.showDocNum = false; // 한네트 글로리 공문번호 숨김 (자동화기기는 노출)
        }
        return config;
    },

    getBaseCustomer: function(customer) {
        if (!customer) return '';
        return (customer.startsWith('nice_') || customer.startsWith('hannet_')) ? customer.split('_').slice(0, 2).join('_') : customer.split('_')[0];
    },

    initSelectBox: function(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        let html = '<option value="" selected disabled>고객사를 선택하세요</option>';
        
        let monthlyHtml = '<optgroup label="[ 월간 청구 대상 ]">';
        let quarterlyHtml = '<optgroup label="[ 분기별 청구 대상 ]">';
        
        this.customers.forEach(c => { 
            const isCompleted = c.name.includes('완료');
            const style = isCompleted ? 'style="background-color: #e8f5e9; color: #1e8449; font-weight: bold;"' : '';

            if (c.isQuarterly) {
                quarterlyHtml += `<option value="${c.value}" ${style}>🔹 ${c.name} (분기)</option>`;
            } else {
                monthlyHtml += `<option value="${c.value}" ${style}>${c.name}</option>`;
            }
        });
        
        monthlyHtml += '</optgroup>';
        quarterlyHtml += '</optgroup>';
        
        select.innerHTML = html + monthlyHtml + quarterlyHtml;
    },

    // 3. 서버 전송 및 스토리지 저장 전 데이터 매핑 (우체국 Task별 금액 분리 등)
    mapDataForServer: function(operation, contextOverride) {
        if (operation === 'kp_task3') {
            if (contextOverride['당초청구금액_3'] !== undefined) contextOverride['당초청구금액'] = contextOverride['당초청구금액_3'];
            if (contextOverride['정산감액_3'] !== undefined) contextOverride['정산감액'] = contextOverride['정산감액_3'];
            if (contextOverride['청구금액_3'] !== undefined) contextOverride['청구금액'] = contextOverride['청구금액_3'];
        } else if (operation === 'kp_task4') {
            if (contextOverride['당초청구금액_4'] !== undefined) contextOverride['당초청구금액'] = contextOverride['당초청구금액_4'];
            if (contextOverride['정산감액_4'] !== undefined) contextOverride['정산감액'] = contextOverride['정산감액_4'];
            if (contextOverride['청구금액_4'] !== undefined) contextOverride['청구금액'] = contextOverride['청구금액_4'];
        }
        return contextOverride;
    },

    mapDataForStorage: function(operation, contextOverride) {
        if (operation === 'kp_task3') {
            if (contextOverride['당초청구금액'] !== undefined) contextOverride['당초청구금액_3'] = contextOverride['당초청구금액'];
            if (contextOverride['정산감액'] !== undefined) contextOverride['정산감액_3'] = contextOverride['정산감액'];
            if (contextOverride['청구금액'] !== undefined) contextOverride['청구금액_3'] = contextOverride['청구금액'];
        } else if (operation === 'kp_task4') {
            if (contextOverride['당초청구금액'] !== undefined) contextOverride['당초청구금액_4'] = contextOverride['당초청구금액'];
            if (contextOverride['정산감액'] !== undefined) contextOverride['정산감액_4'] = contextOverride['정산감액'];
            if (contextOverride['청구금액'] !== undefined) contextOverride['청구금액_4'] = contextOverride['청구금액'];
        }
        return contextOverride;
    },

    // 4. OneClick 화면의 Task UI 렌더링 예외 처리
    renderOneClickTask: function(task, customer, isChecked = false) {
        const checkedAttr = isChecked ? 'checked' : '';
        const baseCustomer = this.getBaseCustomer(customer);
        const checkboxHtml = `<input type="checkbox" class="task-checkbox" data-task-id="${task.id}" ${checkedAttr} style="margin-right: 10px; transform: scale(1.2); cursor: pointer;" onchange="if(typeof saveCheckState === 'function') saveCheckState('${baseCustomer}', '${task.id}', this.checked)">`;
        
        let existingData = {};
        try { existingData = JSON.parse(localStorage.getItem('rpaCommonData_' + baseCustomer) || '{}'); } catch(e) {}

        if (task.op === 'kp_task5') {
            return `<tr>
                <td style="padding: 10px 15px; font-weight: bold; font-size: 1.05em; vertical-align: middle;">
                    <label style="cursor: pointer; display: flex; align-items: center; margin: 0;">${checkboxHtml} <span>${task.title}</span></label>
                    <span style="font-size: 0.85em; color: var(--text-light); font-weight: normal; margin-left: 26px; display: block;">- 국세/지방세 납세증명, 4대보험 완납증명 직접 발급 링크</span>
                </td>
                <td style="padding: 10px 15px; text-align: center; vertical-align: middle;">
                    <div style="display: flex; justify-content: center; gap: 8px;">
                        <a href="https://plus.gov.kr/" target="_blank" class="btn" style="font-size: 0.85em; padding: 4px 10px; background: #f8fafc; color: #1e293b; border: 1px solid #e2e8f0; text-decoration: none; font-weight: bold; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--primary)';" onmouseout="this.style.borderColor='#e2e8f0';">정부24</a>
                        <a href="https://si4n.nhis.or.kr/jpba/JpBaa00101.do" target="_blank" class="btn" style="font-size: 0.85em; padding: 4px 10px; background: #f8fafc; color: #1e293b; border: 1px solid #e2e8f0; text-decoration: none; font-weight: bold; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--primary)';" onmouseout="this.style.borderColor='#e2e8f0';">징수포털</a>
                    </div>
                </td>
            </tr>`;
        }
        if (task.op === 'check_only') {
            const tTotal = existingData[`${task.id}_합계금액`] || '';
            const tSupply = existingData[`${task.id}_공급가액`] || '';
            const tVat = existingData[`${task.id}_부가세`] || '';

            return `<tr style="background: #fdf5f0; border-bottom: 2px solid #fff;">
                <td colspan="2" style="padding: 10px 15px; vertical-align: middle;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 15px;">
                        <label style="cursor: pointer; display: flex; align-items: center; margin: 0; font-weight: bold; font-size: 1.05em; color: #d35400; flex: 1;">
                            ${checkboxHtml} <span style="white-space: nowrap;">${task.title}</span>
                        </label>
                        <div style="display: flex; align-items: center; gap: 10px; flex: 2; justify-content: flex-end;">
                            <div style="display: flex; align-items: center; gap: 5px;"><span style="font-size: 0.85em; color: #a04000; font-weight: bold; white-space: nowrap;">공급가액</span><input type="text" id="${task.id}_supply" class="check-input" data-task="${task.id}" data-type="공급가액" value="${tSupply}" oninput="formatMoney(this); RpaCalculator.calculateFromSupply(this, '${task.id}_total', '${task.id}_vat'); window.saveCheckData('${baseCustomer}')" style="width: 110px; padding: 6px; border: 1px solid #fce4d6; border-radius: 4px; font-weight: bold; text-align: right; background: #fff;"></div>
                            <div style="display: flex; align-items: center; gap: 5px;"><span style="font-size: 0.85em; color: #a04000; font-weight: bold; white-space: nowrap;">부가세</span><input type="text" id="${task.id}_vat" class="check-input" data-task="${task.id}" data-type="부가세" value="${tVat}" placeholder="자동계산" readonly style="width: 90px; padding: 6px; border: 1px solid #fadbd8; border-radius: 4px; background: #fffcfb; color: #888; font-weight: bold; text-align: right;"></div>
                            <div style="display: flex; align-items: center; gap: 5px;"><span style="font-size: 0.85em; color: #a04000; font-weight: bold; white-space: nowrap;">합계금액</span><input type="text" id="${task.id}_total" class="check-input" data-task="${task.id}" data-type="합계금액" value="${tTotal}" placeholder="자동계산" readonly style="width: 110px; padding: 6px; border: 1px solid #fadbd8; border-radius: 4px; background: #fffcfb; color: #888; font-weight: bold; text-align: right;"></div>
                        </div>
                    </div>
                </td>
            </tr>`;
        }
        if (task.op === 'check_simple') {
            return `<tr style="background: #fdf5f0; border-bottom: 2px solid #fff;">
                <td colspan="2" style="padding: 10px 15px; vertical-align: middle;">
                    <label style="cursor: pointer; display: flex; align-items: center; margin: 0; font-weight: bold; font-size: 1.05em; color: #d35400;">
                        ${checkboxHtml} <span style="white-space: nowrap;">${task.title}</span>
                    </label>
                </td>
            </tr>`;
        }
        return `<tr>
            <td style="padding: 10px 15px; font-weight: bold; font-size: 1.05em; vertical-align: middle;">
                <label style="cursor: pointer; display: flex; align-items: center; margin: 0;">${checkboxHtml} <span>${task.title}</span></label>
            </td>
            <td style="padding: 10px 15px; text-align: center; vertical-align: middle;">
                <div style="display: flex; justify-content: center; gap: 8px;">
                    <button class="btn btn-primary" style="font-size: 0.85em; padding: 4px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onclick="fastGenerate('${task.id}', '${task.op}', this)">바로 생성</button>
                    <a href="#" class="btn dl-btn" style="font-size: 0.85em; padding: 4px 10px; background: #e2e8f0; color: #94a3b8; cursor: not-allowed; pointer-events: none; text-decoration: none;">다운로드</a>
                    <a href="#" class="btn pdf-btn" style="font-size: 0.85em; padding: 4px 10px; background: #e2e8f0; color: #94a3b8; cursor: not-allowed; pointer-events: none; text-decoration: none;">PDF 변환</a>
                </div>
            </td>
        </tr>`;
    },

    // 5. RPA Dashboard 예외 로직
    showPdfUploadInput: function(customer) { return customer === 'koreapost_2'; },
    isGuideTask: function(operation) { return operation === 'kp_task5'; },
    isReadonlyField: function(key, operation) {
        return (key === '당초청구금액' && (operation === 'kp_task4' || operation === 'kp_task3')) || 
               (key === '정산감액' && operation === 'kp_task3');
    }
};

/**
 * 금액 및 수식 계산을 담당하는 공통 유틸리티
 */
window.RpaCalculator = {
    formatMoney: function(input) {
        if (!input || !input.value) return;
        let valStr = String(input.value);
        const ignoreVals = ["엑셀 자동 로드", "문서 생성 시 자동 계산", "엑셀파일 연동", "데이터 불러오는 중...", "로드 실패 (생성 시 적용됨)", "로드 실패 (엑셀/양식 확인)"];
        if (ignoreVals.includes(valStr)) return;
        let value = valStr.replace(/[^\d\-]/g, '');
        if (value && !isNaN(parseInt(value, 10))) input.value = parseInt(value, 10).toLocaleString('ko-KR');
        else input.value = value;
    },
    calculateVAT: function(input, supplyId, vatId) {
        let total = parseInt(input.value.replace(/[^\d\-]/g, ''), 10);
        const supplyInput = document.getElementById(supplyId), vatInput = document.getElementById(vatId);
        if (!isNaN(total)) {
            let vat = Math.floor(total / 11);
            if (supplyInput) supplyInput.value = (total - vat).toLocaleString('ko-KR');
            if (vatInput) vatInput.value = vat.toLocaleString('ko-KR');
        } else {
            if (supplyInput) supplyInput.value = '';
            if (vatInput) vatInput.value = '';
        }
    },
    calculateFromSupply: function(input, totalId, vatId) {
        let supply = parseInt(input.value.replace(/[^\d\-]/g, ''), 10);
        const totalInput = document.getElementById(totalId), vatInput = document.getElementById(vatId);
        if (!isNaN(supply)) {
            let vat = Math.floor(supply * 0.1);
            if (totalInput) totalInput.value = (supply + vat).toLocaleString('ko-KR');
            if (vatInput) vatInput.value = vat.toLocaleString('ko-KR');
        } else {
            if (totalInput) totalInput.value = '';
            if (vatInput) vatInput.value = '';
        }
    },
    calculateClaimAmount: function(suffix = '') {
        const baseInput = document.querySelector(suffix ? `input[data-key="당초청구금액_${suffix}"]` : `input[data-key="당초청구금액"]`);
        const deductInput = document.querySelector(suffix ? `input[data-key="정산감액_${suffix}"]` : `input[data-key="정산감액"]`);
        const claimInput = document.querySelector(suffix ? `input[data-key="청구금액_${suffix}"]` : `input[data-key="청구금액"]`);
        if (baseInput && claimInput) {
            const ignoreVals = ["엑셀 자동 로드", "문서 생성 시 자동 계산", "엑셀파일 연동", "데이터 불러오는 중...", "로드 실패 (생성 시 적용됨)", "로드 실패 (엑셀/양식 확인)"];
            if (baseInput.readOnly && (ignoreVals.includes(baseInput.value) || isNaN(parseInt(baseInput.value.replace(/[^\d\-]/g, ''), 10)))) {
                claimInput.value = "문서 생성 시 자동 계산"; return;
            }
            let base = parseInt(baseInput.value.replace(/[^\d\-]/g, ''), 10) || 0;
            let deduct = deductInput ? parseInt(deductInput.value.replace(/[^\d\-]/g, ''), 10) || 0 : 0;
            claimInput.value = (base - deduct).toLocaleString('ko-KR');
        }
    },
    calculateActualPayment: function() {
        const baseInput = document.querySelector('input[data-key="월유지비용"]'), deductInput = document.querySelector('input[data-key="미사용차감금액"]'), actualInput = document.querySelector('input[data-key="실지급액"]');
        if (baseInput && actualInput) {
            const ignoreVals = ["엑셀 자동 로드", "문서 생성 시 자동 계산", "엑셀파일 연동", "데이터 불러오는 중...", "로드 실패 (생성 시 적용됨)", "로드 실패 (엑셀/양식 확인)"];
            if (baseInput.readOnly && (ignoreVals.includes(baseInput.value) || isNaN(parseInt(baseInput.value.replace(/[^\d\-]/g, ''), 10)))) {
                actualInput.value = "문서 생성 시 자동 계산"; return;
            }
            let base = parseInt(baseInput.value.replace(/[^\d\-]/g, ''), 10) || 0;
            let deduct = deductInput ? parseInt(deductInput.value.replace(/[^\d\-]/g, ''), 10) || 0 : 0;
            actualInput.value = (base - deduct).toLocaleString('ko-KR');
        }
    },
    calculateSatisfaction: function() {
        const countInput = document.querySelector('input[data-key="만족도조사_건수"]'), totalInput = document.querySelector('input[data-key="만족도조사_총점"]'), avgInput = document.querySelector('input[data-key="만족도조사_평점"]');
        if (countInput && totalInput && avgInput) {
            let count = parseFloat(countInput.value) || 0, total = parseFloat(totalInput.value) || 0;
            avgInput.value = count > 0 ? parseFloat((total / count).toFixed(1)) : "0";
        }
    },
    calculateRate: function(prefix) {
        const totalInput = document.querySelector(`input[data-key="${prefix}_총대상수"]`), doneInput = document.querySelector(`input[data-key="${prefix}_완료수"]`), rateInput = document.querySelector(`input[data-key="${prefix}_달성률"]`);
        if (totalInput && doneInput && rateInput) {
            let total = parseFloat(totalInput.value) || 0, done = parseFloat(doneInput.value) || 0;
            rateInput.value = total > 0 ? parseFloat(((done / total) * 100).toFixed(1)) : "100";
        }
    }
};

// 전역으로 사용할 항목별 부가세 계산 자동 저장 함수
window.saveCheckData = function(baseCustomer) {
    let data = {};
    document.querySelectorAll('.check-input').forEach(input => {
        const taskId = input.getAttribute('data-task');
        const type = input.getAttribute('data-type');
        data[`${taskId}_${type}`] = input.value;
    });
    let existingData = {};
    try { existingData = JSON.parse(localStorage.getItem('rpaCommonData_' + baseCustomer) || '{}'); } catch(e) {}
    let dataToStore = { ...existingData, ...data };
    localStorage.setItem('rpaCommonData_' + baseCustomer, JSON.stringify(dataToStore));
};