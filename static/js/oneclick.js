function syncValue(sourceKey, targetKey) {
    const sourceInput = document.querySelector(`input[data-key="${sourceKey}"]`);
    const targetInput = document.querySelector(`input[data-key="${targetKey}"]`);
    if (sourceInput && targetInput) targetInput.value = sourceInput.value;
}

function syncAndRecalculate(sourceKey, targetKey, calcSuffix) {
    syncValue(sourceKey, targetKey);
    if (calcSuffix) calculateClaimAmount(calcSuffix);
}

const customerTasks = {
    'koreapost': [
        { id: 'koreapost_1', op: 'doc_official', title: '1. 📝 이전설치 공문 (Word)' },
        { id: 'koreapost_2', op: 'doc_official', title: '2. 📝 이행실적 공문 (Word)' },
        { id: 'koreapost_3', op: 'kp_task3', title: '3. 📊 이전실비 청구서 (Excel)' },
        { id: 'koreapost_4', op: 'kp_task4', title: '4. 📊 유지보수료 청구서 (Excel)' },
        { id: 'koreapost',   op: 'kp_task5', title: '5. 제증명 서류 3종 가이드' }
    ]
};

// 💡 페이지 로딩이 완벽히 끝난 후 안전하게 초기 날짜(이번 달/오늘) 세팅
function setInitialDates() {
    const today = new Date();
    const monthInput = document.getElementById('global_month');
    const dateInput = document.getElementById('global_date');
    if (monthInput && !monthInput.value) monthInput.value = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월`;
    if (dateInput && !dateInput.value) dateInput.value = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월 ${String(today.getDate()).padStart(2, '0')}일`;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setInitialDates);
} else {
    setInitialDates();
}

document.getElementById('fast_customer').addEventListener('change', function() {
    const customer = this.value;
    const baseCustomer = customer.split('_')[0];
    
    let savedData = {};
    try {
        const stored = localStorage.getItem(`rpaCommonData_${baseCustomer}`);
        if (stored) {
            savedData = JSON.parse(stored);
            const ignoreVals = ["엑셀 자동 로드", "문서 생성 시 자동 계산", "엑셀파일 연동", "데이터 불러오는 중...", "로드 실패 (생성 시 적용됨)", "로드 실패 (엑셀/양식 확인)"];
            for(const k in savedData) {
                if(ignoreVals.includes(savedData[k])) delete savedData[k];
            }
        }
    } catch(e) {}
    
    // 💡 고객사별 청구연월 기준 달 설정 (0: 당월, -1: 전월, 1: 익월)
    const monthOffsetMap = {
        'koreapost': -1,
        'nice_ibk': 0,
        'nice_emart': 0,
        'nice_lotte': 0,
        'nice_hyundai': 0,
        'nice_hdc': 0
    };
    const offset = monthOffsetMap[baseCustomer] !== undefined ? monthOffsetMap[baseCustomer] : -1;

    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    
    // 💡 브라우저 캐시(저장된 값)가 있으면 우선 적용하고, 없을 때만 오늘 날짜 기준으로 세팅
    const defaultMonth = savedData['청구연월'] || `${targetDate.getFullYear()}년 ${String(targetDate.getMonth() + 1).padStart(2, '0')}월`;
    const defaultDate = savedData['작성일자'] || `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월 ${String(today.getDate()).padStart(2, '0')}일`;

    // 💡 선택한 고객사의 기준(당월/전월)에 맞춰 공통 날짜 박스의 값을 자동 업데이트
    const monthInput = document.getElementById('global_month');
    const dateInput = document.getElementById('global_date');
    const docNumContainer = document.getElementById('global_doc_num_container');
    const docNumInput = document.getElementById('global_doc_num');

    if (monthInput) monthInput.value = defaultMonth;
    if (dateInput) dateInput.value = defaultDate;

    // 💡 우체국(koreapost)이 아닌 모든 고객사에서 공문번호를 표시합니다
    if (baseCustomer !== 'koreapost') {
        if (docNumContainer) docNumContainer.style.display = 'block';
        if (docNumInput) docNumInput.value = savedData['공문번호'] || '';
    } else {
        if (docNumContainer) docNumContainer.style.display = 'none';
        if (docNumInput) docNumInput.value = '';
    }

    let commonHtml = '';
    
    if (baseCustomer === 'koreapost') {
        commonHtml += `
        <!-- 🟧 1번 문서 전용 -->
        <div style="background: #fff8f0; border: 1px solid #fde6ce; border-radius: 8px; padding: 20px; width: 100%; box-sizing: border-box; margin-top:15px;">
            <h4 style="color: #e67e22; margin-top: 0; margin-bottom: 15px; font-size: 1.1em;">🟧 [1번 문서 전용] 이전설치 공문 금액</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                <div style="flex: 1; min-width: 200px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 5px; color: #155724;">합계금액</label>
                    <input type="text" class="common-input" id="fast_total" data-key="합계금액" data-name="합계금액" value="${savedData['합계금액'] || ''}" oninput="formatMoney(this); calculateVAT(this); syncValue('합계금액', '당초청구금액_3'); syncValue('합계금액', '청구금액_3');" style="width: 100%; padding: 10px; border: 1px solid #fbdba7; border-radius: 4px; font-weight: bold; background-color: #fff;">
                </div>
                <div style="flex: 1; min-width: 200px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 5px; color: #155724;">공급가액</label>
                    <input type="text" class="common-input" id="fast_supply" data-key="공급가액" data-name="공급가액" value="${savedData['공급가액'] || ''}" placeholder="자동 계산" readonly style="width: 100%; padding: 10px; border: 1px solid #fde6ce; border-radius: 4px; font-weight: bold; background-color: #fffcf8; color: #888;">
                </div>
                <div style="flex: 1; min-width: 200px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 5px; color: #155724;">부가세</label>
                    <input type="text" class="common-input" id="fast_vat" data-key="부가세" value="${savedData['부가세'] || ''}" placeholder="자동 계산" readonly style="width: 100%; padding: 10px; border: 1px solid #fde6ce; border-radius: 4px; font-weight: bold; background-color: #fffcf8; color: #666;">
                </div>
            </div>
        </div>

        <!-- 🟨 2번 문서 전용 -->
        <div style="background: #f4fbf5; border: 1px solid #ccecd4; border-radius: 8px; padding: 20px; width: 100%; box-sizing: border-box; margin-top:15px;">
            <h4 style="color: #d39e00; margin-top: 0; margin-bottom: 15px; font-size: 1.1em;">🟨 [2번 문서 전용] 이행실적 통계 및 금액</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1; min-width: 200px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 5px; color: #856404;">월유지비용 (기본)</label>
                    <input type="text" class="common-input" data-key="월유지비용" data-name="월유지비용" value="엑셀파일 연동" readonly style="width: 100%; padding: 10px; border: 1px solid #fce8b2; border-radius: 4px; font-weight: bold; background-color: #fffcf8; color: #888;">
                </div>
                <div style="flex: 1; min-width: 200px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 5px; color: #856404;">미사용차감수량</label>
                    <input type="number" class="common-input" data-key="미사용차감수량" data-name="미사용차감수량" value="${savedData['미사용차감수량'] !== undefined ? savedData['미사용차감수량'] : '0'}" style="width: 100%; padding: 10px; border: 1px solid #ffeeba; border-radius: 4px; font-weight: bold; background-color: #fff;">
                </div>
                <div style="flex: 1; min-width: 200px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 5px; color: #856404;">미사용차감금액</label>
                    <input type="text" class="common-input" data-key="미사용차감금액" data-name="미사용차감금액" value="${savedData['미사용차감금액'] !== undefined ? savedData['미사용차감금액'] : '0'}" oninput="formatMoney(this); calculateActualPayment(); syncAndRecalculate('미사용차감금액', '정산감액_4', 4);" style="width: 100%; padding: 10px; border: 1px solid #ffeeba; border-radius: 4px; font-weight: bold; background-color: #fff;">
                </div>
                <div style="flex: 1; min-width: 200px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 5px; color: #856404;">실지급액</label>
                    <input type="text" class="common-input" data-key="실지급액" value="${savedData['실지급액'] || ''}" placeholder="자동 계산" readonly style="width: 100%; padding: 10px; border: 1px solid #fff3cd; border-radius: 4px; font-weight: bold; background-color: #fffcf8; color: #666;">
                </div>
            </div>
            <details style="border: 1px solid #ccecd4; border-radius: 6px; background: #fff;">
                <summary style="font-weight: bold; cursor: pointer; color: #856404; padding: 12px 15px; font-size: 1.0em; background: #fdfdfd; border-radius: 6px; list-style: none; user-select: none;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span>🔽 하위 통계 데이터 11개 입력 및 확인 (클릭하여 펴기/접기)</span>
                        <div>
                            <button type="button" class="btn" style="background: #fff3cd; color: #856404; border: 1px solid #ffeeba; font-size: 0.85em; padding: 6px 12px; font-weight: bold; border-radius: 4px;" onclick="event.preventDefault(); event.stopPropagation(); document.getElementById('pdfUploadInput').click();">📄 서비스 수준 관리 보고서 불러오기(PDF)</button>
                            <input type="file" id="pdfUploadInput" accept=".pdf" style="display: none;" onchange="extractPdfStats(this)">
                        </div>
                    </div>
                </summary>
                <div style="padding: 15px; border-top: 1px solid #ccecd4; background: #fafdfa;">
                    <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                        <div style="flex: 1; min-width: 200px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #856404;">장애 적기처리건수</label><input type="number" class="common-input" data-key="장애_적기처리건수" value="${savedData['장애_적기처리건수'] || ''}" style="width: 100%; padding: 10px; border: 1px solid #ffeeba; border-radius: 4px; font-weight: bold; background-color: #fff;"></div>
                        <div style="flex: 1; min-width: 200px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #856404;">장애 지연처리건수</label><input type="number" class="common-input" data-key="장애_지연처리건수" value="${savedData['장애_지연처리건수'] || ''}" style="width: 100%; padding: 10px; border: 1px solid #ffeeba; border-radius: 4px; font-weight: bold; background-color: #fff;"></div>
                        <div style="width: 100%; height: 1px; background: #ccecd4; margin: 5px 0;"></div>
                        <div style="flex: 1; min-width: 150px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #856404;">만족도조사 건수</label><input type="number" class="common-input" data-key="만족도조사_건수" value="${savedData['만족도조사_건수'] || ''}" oninput="calculateSatisfaction()" style="width: 100%; padding: 10px; border: 1px solid #ffeeba; border-radius: 4px; font-weight: bold; background-color: #fff;"></div>
                        <div style="flex: 1; min-width: 150px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #856404;">만족도조사 총점</label><input type="number" class="common-input" data-key="만족도조사_총점" value="${savedData['만족도조사_총점'] || ''}" oninput="calculateSatisfaction()" style="width: 100%; padding: 10px; border: 1px solid #ffeeba; border-radius: 4px; font-weight: bold; background-color: #fff;"></div>
                        <div style="flex: 1; min-width: 150px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #856404;">만족도조사 평점</label><input type="text" class="common-input" data-key="만족도조사_평점" value="${savedData['만족도조사_평점'] || ''}" readonly style="width: 100%; padding: 10px; border: 1px solid #fff3cd; border-radius: 4px; font-weight: bold; background-color: #fffdf5; color: #888;"></div>
                        <div style="width: 100%; height: 1px; background: #ccecd4; margin: 5px 0;"></div>
                        <div style="flex: 1; min-width: 150px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #856404;">정기점검 총대상수</label><input type="number" class="common-input" data-key="정기점검_총대상수" value="${savedData['정기점검_총대상수'] || ''}" oninput="calculateRate('정기점검')" style="width: 100%; padding: 10px; border: 1px solid #ffeeba; border-radius: 4px; font-weight: bold; background-color: #fff;"></div>
                        <div style="flex: 1; min-width: 150px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #856404;">정기점검 완료수</label><input type="number" class="common-input" data-key="정기점검_완료수" value="${savedData['정기점검_완료수'] || ''}" oninput="calculateRate('정기점검')" style="width: 100%; padding: 10px; border: 1px solid #ffeeba; border-radius: 4px; font-weight: bold; background-color: #fff;"></div>
                        <div style="flex: 1; min-width: 150px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #856404;">정기점검 달성률(%)</label><input type="text" class="common-input" data-key="정기점검_달성률" value="${savedData['정기점검_달성률'] || ''}" readonly style="width: 100%; padding: 10px; border: 1px solid #fff3cd; border-radius: 4px; font-weight: bold; background-color: #fffdf5; color: #888;"></div>
                        <div style="width: 100%; height: 1px; background: #ccecd4; margin: 5px 0;"></div>
                        <div style="flex: 1; min-width: 150px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #856404;">이전설치 총대상수</label><input type="number" class="common-input" data-key="이전설치_총대상수" value="${savedData['이전설치_총대상수'] || ''}" oninput="calculateRate('이전설치')" style="width: 100%; padding: 10px; border: 1px solid #ffeeba; border-radius: 4px; font-weight: bold; background-color: #fff;"></div>
                        <div style="flex: 1; min-width: 150px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #856404;">이전설치 완료수</label><input type="number" class="common-input" data-key="이전설치_완료수" value="${savedData['이전설치_완료수'] || ''}" oninput="calculateRate('이전설치')" style="width: 100%; padding: 10px; border: 1px solid #ffeeba; border-radius: 4px; font-weight: bold; background-color: #fff;"></div>
                        <div style="flex: 1; min-width: 150px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #856404;">이전설치 달성률(%)</label><input type="text" class="common-input" data-key="이전설치_달성률" value="${savedData['이전설치_달성률'] || ''}" readonly style="width: 100%; padding: 10px; border: 1px solid #fff3cd; border-radius: 4px; font-weight: bold; background-color: #fffdf5; color: #888;"></div>
                    </div>
                </div>
            </details>
        </div>

        <!-- 🟪 3번 문서 전용 -->
        <div style="background: #f8f0ff; border: 1px solid #e9d8fd; border-radius: 8px; padding: 20px; width: 100%; box-sizing: border-box; margin-top:15px;">
            <h4 style="color: #8e44ad; margin-top: 0; margin-bottom: 15px; font-size: 1.1em;">🟪 [3번 문서 전용] 이전실비 청구서 금액</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                <div style="flex: 1; min-width: 200px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #6c3483;">당초청구금액</label><input type="text" class="common-input" data-key="당초청구금액_3" value="${savedData['당초청구금액_3'] || ''}" placeholder="1번 합계금액 연동" readonly style="width: 100%; padding: 10px; border: 1px solid #e9d8fd; border-radius: 4px; font-weight: bold; background-color: #fbfaff; color: #888;"></div>
                <div style="flex: 1; min-width: 200px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #6c3483;">정산감액</label><input type="text" class="common-input" data-key="정산감액_3" value="0" readonly style="width: 100%; padding: 10px; border: 1px solid #e9d8fd; border-radius: 4px; font-weight: bold; background-color: #fbfaff; color: #888;"></div>
                <div style="flex: 1; min-width: 200px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #6c3483;">청구금액</label><input type="text" class="common-input" data-key="청구금액_3" value="${savedData['청구금액_3'] || ''}" placeholder="1번 합계금액 연동" readonly style="width: 100%; padding: 10px; border: 1px solid #f3eafd; border-radius: 4px; font-weight: bold; background-color: #fbfaff; color: #666;"></div>
            </div>
        </div>

        <!-- 🟫 4번 문서 전용 -->
        <div style="background: #fdf5f0; border: 1px solid #fce4d6; border-radius: 8px; padding: 20px; width: 100%; box-sizing: border-box; margin-top:15px;">
            <h4 style="color: #d35400; margin-top: 0; margin-bottom: 15px; font-size: 1.1em;">🟫 [4번 문서 전용] 유지보수료 청구서 금액</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                <div style="flex: 1; min-width: 200px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #a04000;">당초청구금액</label><input type="text" class="common-input" data-key="당초청구금액_4" value="엑셀파일 연동" readonly style="width: 100%; padding: 10px; border: 1px solid #fce4d6; border-radius: 4px; font-weight: bold; background-color: #fffcfb; color: #888;"></div>
                <div style="flex: 1; min-width: 200px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #a04000;">정산감액</label><input type="text" class="common-input" data-key="정산감액_4" value="${savedData['정산감액_4'] !== undefined ? savedData['정산감액_4'] : '0'}" readonly style="width: 100%; padding: 10px; border: 1px solid #fadbd8; border-radius: 4px; font-weight: bold; background-color: #fffcfb; color: #888;"></div>
                <div style="flex: 1; min-width: 200px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: #a04000;">청구금액</label><input type="text" class="common-input" data-key="청구금액_4" value="${savedData['청구금액_4'] || ''}" readonly style="width: 100%; padding: 10px; border: 1px solid #fdedec; border-radius: 4px; font-weight: bold; background-color: #fffcfb; color: #666;"></div>
            </div>
        </div>
        `;
    }
    
    document.getElementById('commonInputs').innerHTML = commonHtml;
    // 💡 동적으로 만들어진 입력칸이 있다면 숨김 해제(flex), 없다면 다시 숨김(none)
    if (commonHtml !== '') {
        document.getElementById('commonInputs').style.display = 'flex';
    } else {
        document.getElementById('commonInputs').style.display = 'none';
    }
    document.getElementById('commonInputSection').style.display = 'block';

    const totalInput = document.getElementById('fast_total');
    if (totalInput) calculateVAT(totalInput);
    calculateActualPayment();
    calculateClaimAmount('3');
    calculateClaimAmount('4');

    const tasks = customerTasks[customer] || [{ id: customer, op: 'doc_official', title: '1. 📝 맞춤형 공문 생성' }];
    document.getElementById('fastTaskList').innerHTML = tasks.map(task => {
        if (task.op === 'kp_task5') {
            return `<tr>
                <td style="font-weight: bold; font-size: 1.05em; vertical-align: middle;">${task.title} <br><span style="font-size: 0.85em; color: var(--text-light); font-weight: normal;">- 국세/지방세 납세증명, 4대보험 완납증명 직접 발급 링크</span></td>
                <td style="text-align: center; vertical-align: middle;">
                    <div style="display: flex; justify-content: center; gap: 8px;">
                        <a href="https://plus.gov.kr/" target="_blank" class="btn" style="font-size: 0.9em; padding: 8px 15px; background: #f8fafc; color: #1e293b; border: 1px solid #e2e8f0; text-decoration: none; font-weight: bold;">🏛️ 정부24</a>
                        <a href="https://si4n.nhis.or.kr/jpba/JpBaa00101.do" target="_blank" class="btn" style="font-size: 0.9em; padding: 8px 15px; background: #f8fafc; color: #1e293b; border: 1px solid #e2e8f0; text-decoration: none; font-weight: bold;">🏥 징수포털</a>
                    </div>
                </td>
            </tr>`;
        }
        return `<tr>
            <td style="font-weight: bold; font-size: 1.05em; vertical-align: middle;">${task.title}</td>
            <td style="text-align: center; vertical-align: middle;">
                <div style="display: flex; justify-content: center; gap: 8px;">
                    <button class="btn btn-primary" style="font-size: 0.9em; padding: 8px 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onclick="fastGenerate('${task.op === 'doc_official' ? task.id : customer}', '${task.op}', this)">⚡ 바로 생성</button>
                    <a href="#" class="btn dl-btn" style="font-size: 0.9em; padding: 8px 15px; background: #e2e8f0; color: #94a3b8; cursor: not-allowed; pointer-events: none; text-decoration: none;">⬇️ 다운로드</a>
                    <a href="#" class="btn pdf-btn" style="font-size: 0.9em; padding: 8px 15px; background: #e2e8f0; color: #94a3b8; cursor: not-allowed; pointer-events: none; text-decoration: none;">📄 PDF 변환</a>
                </div>
            </td>
        </tr>`;
    }).join('');
    
    document.getElementById('taskListSection').style.display = 'block';
    
    if (baseCustomer === 'koreapost') {
        fetchBackgroundData('koreapost_2', 'doc_official', '월유지비용', '월유지비용');
        fetchBackgroundData('koreapost', 'kp_task4', '당초청구금액', '당초청구금액_4');
    }
});

async function fastGenerate(customer, operation, btnElement) {
    const row = btnElement.closest('tr');
    const dlBtn = row.querySelector('.dl-btn');
    const pdfBtn = row.querySelector('.pdf-btn');

    const inputs = document.querySelectorAll('.common-input');
    const contextOverride = {};
    let missingField = null;

    inputs.forEach(input => {
        // 💡 화면에 숨겨진 입력칸은 수집 및 필수 체크에서 제외
        if (input.offsetParent === null) return;

        const ignoreVals = ["엑셀 자동 로드", "문서 생성 시 자동 계산", "엑셀파일 연동", "데이터 불러오는 중...", "로드 실패 (생성 시 적용됨)", "로드 실패 (엑셀/양식 확인)"];
        if (!ignoreVals.includes(input.value)) {
            contextOverride[input.dataset.key] = input.value;
        }
        if (!input.readOnly && input.value.trim() === '') {
            if (!missingField) missingField = input.dataset.name || input.dataset.key;
        }
    });
    
    if (missingField) {
        alert(`[${missingField}] 항목이 비어있습니다.\n빈칸 없이 모든 필수 정보를 입력해야 문서를 바로 생성할 수 있습니다.`);
        return;
    }

    if (operation === 'kp_task3') {
        if (contextOverride['당초청구금액_3'] !== undefined) contextOverride['당초청구금액'] = contextOverride['당초청구금액_3'];
        if (contextOverride['정산감액_3'] !== undefined) contextOverride['정산감액'] = contextOverride['정산감액_3'];
        if (contextOverride['청구금액_3'] !== undefined) contextOverride['청구금액'] = contextOverride['청구금액_3'];
    } else if (operation === 'kp_task4') {
        if (contextOverride['당초청구금액_4'] !== undefined) contextOverride['당초청구금액'] = contextOverride['당초청구금액_4'];
        if (contextOverride['정산감액_4'] !== undefined) contextOverride['정산감액'] = contextOverride['정산감액_4'];
        if (contextOverride['청구금액_4'] !== undefined) contextOverride['청구금액'] = contextOverride['청구금액_4'];
    }

    dlBtn.style.background = '#e2e8f0'; dlBtn.style.color = '#94a3b8'; dlBtn.style.cursor = 'not-allowed'; dlBtn.style.pointerEvents = 'none'; dlBtn.href = '#';
    pdfBtn.style.background = '#e2e8f0'; pdfBtn.style.color = '#94a3b8'; pdfBtn.style.cursor = 'not-allowed'; pdfBtn.style.pointerEvents = 'none'; pdfBtn.onclick = null; pdfBtn.innerHTML = '📄 PDF 변환';

    document.getElementById('loadingOverlay').style.display = 'flex';
    
    const baseCustomer = customer.split('_')[0];
    let existingData = {};
    try { existingData = JSON.parse(localStorage.getItem(`rpaCommonData_${baseCustomer}`) || '{}'); } catch(e) {}
    localStorage.setItem(`rpaCommonData_${baseCustomer}`, JSON.stringify({ ...existingData, ...contextOverride }));

    try {
        const response = await fetch(`/files/process?operation=${operation}&customer=${customer}&options=${encodeURIComponent(JSON.stringify({preview_only: false, context_override: contextOverride}))}`, { method: 'POST', body: new FormData() });
        const data = JSON.parse(await response.text());
        
        if (response.ok && data.results && data.results.length > 0) {
            const filename = data.results[0].output.split(/[/\\]/).pop();
            dlBtn.href = `/files/download/${filename}`;
            dlBtn.style.background = '#10b981'; dlBtn.style.color = '#fff'; dlBtn.style.cursor = 'pointer'; dlBtn.style.pointerEvents = 'auto';
            
            if (filename.endsWith('.docx') || filename.endsWith('.xlsx')) {
                pdfBtn.style.background = '#dc3545'; pdfBtn.style.color = '#fff'; pdfBtn.style.cursor = 'pointer'; pdfBtn.style.pointerEvents = 'auto';
                pdfBtn.onclick = (e) => { e.preventDefault(); requestPdfConversionFast(filename, pdfBtn, customer); };
            } else {
                pdfBtn.style.display = 'none';
            }
            showToast(`✅ 생성이 완료되었습니다! 다운로드 버튼을 클릭하세요.`);
        } else {
            alert(`오류 발생: ${data.message || data.detail}`);
        }
    } catch (error) {
        alert(`서버 통신 오류: ${error.message}`);
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

async function requestPdfConversionFast(filename, btnElement, customer) {
    btnElement.innerHTML = `⏳ 변환 중...`;
    btnElement.onclick = (e) => e.preventDefault();
    btnElement.style.opacity = '0.7';

    try {
        const response = await fetch(`/files/process?operation=doc_convert_pdf&customer=${customer}&options=${encodeURIComponent(JSON.stringify({filename: filename}))}`, { method: 'POST', body: new FormData() });
        const data = JSON.parse(await response.text());
        if (data.results && data.results.length > 0) {
            btnElement.href = `/files/download/${data.results[0].output.split(/[/\\]/).pop()}`;
            btnElement.innerHTML = `⬇️ PDF 다운로드`;
            btnElement.onclick = null;
            btnElement.style.opacity = '1';
            showToast(`✅ PDF 변환이 완료되었습니다!`);
        } else {
            alert(`오류 발생: ${data.message || data.detail}`);
            resetPdfButton(filename, btnElement, customer);
        }
    } catch(error) {
        alert(`오류: ${error.message}`);
        resetPdfButton(filename, btnElement, customer);
    }
}

function resetPdfButton(filename, btnElement, customer) {
    btnElement.innerHTML = `📄 PDF로 변환`;
    btnElement.style.opacity = '1';
    btnElement.onclick = (e) => { e.preventDefault(); requestPdfConversionFast(filename, btnElement, customer); };
}

let tempExtractedStats = {};
async function extractPdfStats(input) {
    if (!input.files || input.files.length === 0) return;
    showToast("📄 PDF에서 데이터를 추출하는 중입니다...");
    const formData = new FormData();
    formData.append('file', input.files[0]);
    
    try {
        const response = await fetch('/files/extract-stats', { method: 'POST', body: formData });
        const data = await response.json();
        if (response.ok && data.success) {
            tempExtractedStats = data.stats;
            let tbodyHtml = '';
            for (const [key, value] of Object.entries(tempExtractedStats)) {
                if (value !== "") tbodyHtml += `<tr><th style="vertical-align: middle;">${key}</th><td><input type="text" id="modal_input_${key}" value="${value}" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; color: var(--primary); box-sizing: border-box;"></td></tr>`;
            }
            document.getElementById('pdfPreviewTableBody').innerHTML = tbodyHtml || "<tr><td colspan='2' style='text-align: center; color: #888;'>추출된 데이터가 없습니다.</td></tr>";
            document.getElementById('pdfPreviewModal').style.display = 'flex';
            showToast(`✅ PDF 데이터 추출 완료! 결과를 확인해주세요.`);
        } else {
            alert(`추출 실패: ${data.detail || data.message}`);
        }
    } catch (error) {
        alert(`서버 통신 오류: ${error.message}`);
    } finally {
        input.value = ""; 
    }
}

function closePdfModal() {
    document.getElementById('pdfPreviewModal').style.display = 'none';
    tempExtractedStats = {};
}

function applyPdfStats() {
    let successCount = 0;
    for (const [key, value] of Object.entries(tempExtractedStats)) {
        const modalInput = document.getElementById(`modal_input_${key}`);
        if (!modalInput) continue;
        const inputEl = document.querySelector(`input[data-key="${key}"]`);
        if (inputEl && modalInput.value !== "") {
            inputEl.value = modalInput.value;
            successCount++;
            inputEl.style.backgroundColor = '#e8f5e9';
            setTimeout(() => { inputEl.style.backgroundColor = '#fff'; }, 1500);
        }
    }
    calculateSatisfaction();
    calculateRate('정기점검');
    calculateRate('이전설치');
    showToast(`✅ ${successCount}개 항목이 적용되었습니다!`);
    closePdfModal();
}

async function fetchBackgroundData(customer, operation, sourceKey, targetInputKey) {
    try {
        const response = await fetch(`/files/process?operation=${operation}&customer=${customer}&options=${encodeURIComponent(JSON.stringify({ preview_only: true }))}`, { method: 'POST', body: new FormData() });
        const data = JSON.parse(await response.text());
        if (response.ok && data.results && data.results.length > 0) {
            const input = document.querySelector(`input[data-key="${targetInputKey}"]`);
            if (input) {
                input.value = data.results[0].summary.context[sourceKey] || "0";
                formatMoney(input);
                if (targetInputKey === '월유지비용') calculateActualPayment();
                else if (targetInputKey === '당초청구금액_4') calculateClaimAmount('4');
            }
        } else {
            const input = document.querySelector(`input[data-key="${targetInputKey}"]`);
            if (input && (input.value === "데이터 불러오는 중..." || input.value === "엑셀파일 연동")) input.value = "로드 실패 (엑셀/양식 확인)";
        }
    } catch (e) {
        const input = document.querySelector(`input[data-key="${targetInputKey}"]`);
        if (input && (input.value === "데이터 불러오는 중..." || input.value === "엑셀파일 연동")) input.value = "로드 실패 (생성 시 적용됨)";
    }
}