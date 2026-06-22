function syncValue(sourceKey, targetKey) {
    const sourceInput = document.querySelector(`input[data-key="${sourceKey}"]`);
    const targetInput = document.querySelector(`input[data-key="${targetKey}"]`);
    if (sourceInput && targetInput) targetInput.value = sourceInput.value;
}

function syncAndRecalculate(sourceKey, targetKey, calcSuffix) {
    syncValue(sourceKey, targetKey);
    if (calcSuffix) calculateClaimAmount(calcSuffix);
}

// 💡 페이지 로딩이 완벽히 끝난 후 안전하게 초기 날짜(이번 달/오늘) 세팅
function setInitialDates() {
    const today = new Date();
    const monthInput = document.getElementById('global_month');
    const dateInput = document.getElementById('global_date');
    if (monthInput) monthInput.value = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월`;
    if (dateInput) dateInput.value = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월 ${String(today.getDate()).padStart(2, '0')}일`;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setInitialDates);
} else {
    setInitialDates();
}

document.getElementById('fast_customer').addEventListener('change', function() {
    const customer = this.value;
    const baseCustomer = typeof RpaRenderer !== 'undefined' ? RpaRenderer.getBaseCustomer(customer) : customer.split('_')[0];
    
    let savedData = {};
    try {
        const stored = localStorage.getItem(`rpaCommonData_${baseCustomer}`);
        if (stored) {
            savedData = JSON.parse(stored);
            const ignoreVals = ["엑셀 자동 로드", "문서 생성 시 자동 계산", "엑셀파일 연동", "데이터 불러오는 중...", "로드 실패 (생성 시 적용됨)", "로드 실패 (엑셀/양식 확인)"];
            for(const k in savedData) {
                if(ignoreVals.includes(savedData[k])) delete savedData[k];
            }
            
            // 💡 고객사 변경 시 로컬 스토리지에 남아있는 과거 날짜 파기
            delete savedData['청구연월'];
            delete savedData['작성일자'];
        }
    } catch(e) {}
    
    // 💡 고객사별 청구연월 기준 달 설정
    let offset = -1;
    if (typeof CustomerManager !== 'undefined') {
        offset = CustomerManager.getConfig(customer).monthOffset;
    } else if (typeof RpaRenderer !== 'undefined') {
        const module = RpaRenderer.getCustomerModule(customer);
        if (module && module.monthOffset !== undefined) offset = module.monthOffset;
    }

    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    
    // 💡 로컬 캐시를 무시하고 날짜는 항상 오늘 날짜(또는 기준월)로 새로 초기화합니다.
    const defaultMonth = `${targetDate.getFullYear()}년 ${String(targetDate.getMonth() + 1).padStart(2, '0')}월`;
    const defaultDate = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월 ${String(today.getDate()).padStart(2, '0')}일`;

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

    const module = typeof RpaRenderer !== 'undefined' ? RpaRenderer.getCustomerModule(customer) : null;
    let commonHtml = '';
    
    if (module && typeof module.renderOneclick === 'function') {
        commonHtml = module.renderOneclick(savedData);
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

    if (module && typeof module.onOneclickRendered === 'function') {
        module.onOneclickRendered();
    }

    const tasks = (module && module.tasks) ? module.tasks : [{ id: customer, op: 'doc_official', title: '1. 📝 맞춤형 공문 생성' }];

    document.getElementById('fastTaskList').innerHTML = tasks.map(task => {
        if (typeof CustomerManager !== 'undefined' && CustomerManager.renderOneClickTask) {
            return CustomerManager.renderOneClickTask(task, customer);
        }
        if (task.op === 'kp_task5') {
            return `<tr>
                <td style="padding: 10px 15px; font-weight: bold; font-size: 1.05em; vertical-align: middle;">${task.title} <br><span style="font-size: 0.85em; color: var(--text-light); font-weight: normal;">- 국세/지방세 납세증명, 4대보험 완납증명 직접 발급 링크</span></td>
                <td style="padding: 10px 15px; text-align: center; vertical-align: middle;">
                    <div style="display: flex; justify-content: center; gap: 8px;">
                        <a href="https://plus.gov.kr/" target="_blank" class="btn" style="font-size: 0.85em; padding: 4px 10px; background: #f8fafc; color: #1e293b; border: 1px solid #e2e8f0; text-decoration: none; font-weight: bold;">정부24</a>
                        <a href="https://si4n.nhis.or.kr/jpba/JpBaa00101.do" target="_blank" class="btn" style="font-size: 0.85em; padding: 4px 10px; background: #f8fafc; color: #1e293b; border: 1px solid #e2e8f0; text-decoration: none; font-weight: bold;">징수포털</a>
                    </div>
                </td>
            </tr>`;
        }
        return `<tr>
            <td style="padding: 10px 15px; font-weight: bold; font-size: 1.05em; vertical-align: middle;">${task.title}</td>
            <td style="padding: 10px 15px; text-align: center; vertical-align: middle;">
                <div style="display: flex; justify-content: center; gap: 8px;">
                <button class="btn btn-primary" style="font-size: 0.85em; padding: 4px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onclick="fastGenerate('${task.id}', '${task.op}', this)">바로 생성</button>
                    <a href="#" class="btn dl-btn" style="font-size: 0.85em; padding: 4px 10px; background: #e2e8f0; color: #94a3b8; cursor: not-allowed; pointer-events: none; text-decoration: none;">다운로드</a>
                    <a href="#" class="btn pdf-btn" style="font-size: 0.85em; padding: 4px 10px; background: #e2e8f0; color: #94a3b8; cursor: not-allowed; pointer-events: none; text-decoration: none;">PDF 변환</a>
                </div>
            </td>
        </tr>`;
    }).join('');
    
    document.getElementById('taskListSection').style.display = 'block';
    
    if (module && typeof module.fetchInitialData === 'function') {
        module.fetchInitialData(fetchBackgroundData);
    }
});

async function fastGenerate(customer, operation, btnElement) {
    const module = typeof RpaRenderer !== 'undefined' ? RpaRenderer.getCustomerModule(customer) : null;
    if (module && typeof module.getActualTaskId === 'function') {
        customer = module.getActualTaskId(customer, operation) || customer;
    }

    const row = btnElement.closest('tr');
    const dlBtn = row.querySelector('.dl-btn');
    const pdfBtn = row.querySelector('.pdf-btn');

    const inputs = document.querySelectorAll('.common-input');
    const contextOverride = {};
    let missingField = null;

    // 💡 생성 실행 시 화면(UI)에 보이는 현재 날짜를 강제로 덮어씌움
    const gMonth = document.getElementById('global_month');
    if (gMonth && gMonth.value) contextOverride['청구연월'] = gMonth.value;
    const gDate = document.getElementById('global_date');
    if (gDate && gDate.value) contextOverride['작성일자'] = gDate.value;

    inputs.forEach(input => {
        // 💡 주의: offsetParent === null을 쓰면 details 태그가 접혀있을 때 데이터를 통째로 날려먹는 버그 발생!
        if (input.type === 'hidden' || input.style.display === 'none') return;

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

    if (typeof CustomerManager !== 'undefined' && typeof CustomerManager.mapDataForServer === 'function') {
        CustomerManager.mapDataForServer(operation, contextOverride);
    }

    if (dlBtn) {
        dlBtn.style.background = '#e2e8f0'; dlBtn.style.color = '#94a3b8'; dlBtn.style.cursor = 'not-allowed'; dlBtn.style.pointerEvents = 'none'; dlBtn.href = '#';
    }
    if (pdfBtn) {
        pdfBtn.style.background = '#e2e8f0'; pdfBtn.style.color = '#94a3b8'; pdfBtn.style.cursor = 'not-allowed'; pdfBtn.style.pointerEvents = 'none'; pdfBtn.onclick = null; pdfBtn.innerHTML = '📄 PDF 변환';
    }

    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'flex';
    
    const baseCustomer = typeof RpaRenderer !== 'undefined' ? RpaRenderer.getBaseCustomer(customer) : customer.split('_')[0];
    let existingData = {};
    try { existingData = JSON.parse(localStorage.getItem(`rpaCommonData_${baseCustomer}`) || '{}'); } catch(e) {}

    const dataToStore = { ...existingData, ...contextOverride };
    delete dataToStore['청구연월'];
    delete dataToStore['작성일자'];

    localStorage.setItem(`rpaCommonData_${baseCustomer}`, JSON.stringify(dataToStore));

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
        if (overlay) overlay.style.display = 'none';
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
                if (targetInputKey === '월유지비용') {
                    calculateActualPayment();
                } else if (targetInputKey === '당초청구금액_4') {
                    calculateClaimAmount('4');
                }
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