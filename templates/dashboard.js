document.getElementById('task_customer').addEventListener('change', function() {
    const customer = this.value;
    const tbody = document.getElementById('checklistBody');
    const progressSummary = document.getElementById('progressSummary');
    
    const module = typeof RpaRenderer !== 'undefined' ? RpaRenderer.getCustomerModule(customer) : null;
    const tasks = (module && module.tasks) ? module.tasks : [{ id: customer, op: 'doc_official', title: '1. 📝 맞춤형 공문 생성 (Word)', date: '상시' }];
    const total = tasks.length;
    
    progressSummary.style.display = 'block';
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressText').innerText = `0 / ${total} 완료 (0%)`;
    
    let savedChecks = {};
    try { savedChecks = JSON.parse(localStorage.getItem(`rpa_checks_${baseCustomer}`) || '{}'); } catch(e) {}

    let savedData = {};
    try { savedData = JSON.parse(localStorage.getItem(`rpaCommonData_${baseCustomer}`) || '{}'); } catch(e) {}

    tbody.innerHTML = tasks.map(task => {
        if (task.op === 'check_only') {
            const tTotal = savedData[`${task.id}_합계금액`] || '';
            const tSupply = savedData[`${task.id}_공급가액`] || '';
            const tVat = savedData[`${task.id}_부가세`] || '';
            return `
            <tr style="background: #fdf5f0; border-bottom: 2px solid #fff;">
                <td colspan="4" style="padding: 10px 15px; vertical-align: middle;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 15px;">
                        <label style="cursor: pointer; display: flex; align-items: center; margin: 0; font-weight: bold; font-size: 1.05em; color: #d35400; flex: 1;">
                            <input type="checkbox" data-task-id="${task.id}" ${savedChecks[task.id] ? 'checked' : ''} onchange="updateProgress(${total}); if(typeof saveCheckState === 'function') saveCheckState('${baseCustomer}', '${task.id}', this.checked)" style="transform: scale(1.2); margin-right: 10px;">
                            <span style="white-space: nowrap;">${task.title}</span>
                        </label>
                        <div style="display: flex; align-items: center; gap: 10px; flex: 2; justify-content: flex-end;">
                            <div style="display: flex; align-items: center; gap: 5px;"><span style="font-size: 0.85em; color: #a04000; font-weight: bold; white-space: nowrap;">공급가액</span><input type="text" id="${task.id}_supply" class="check-input" data-task="${task.id}" data-type="공급가액" value="${tSupply}" oninput="formatMoney(this); RpaCalculator.calculateFromSupply(this, '${task.id}_total', '${task.id}_vat'); if(typeof saveCheckData === 'function') window.saveCheckData('${baseCustomer}')" style="width: 110px; padding: 6px; border: 1px solid #fce4d6; border-radius: 4px; font-weight: bold; text-align: right; background: #fff;"></div>
                            <div style="display: flex; align-items: center; gap: 5px;"><span style="font-size: 0.85em; color: #a04000; font-weight: bold; white-space: nowrap;">부가세</span><input type="text" id="${task.id}_vat" class="check-input" data-task="${task.id}" data-type="부가세" value="${tVat}" placeholder="자동계산" readonly style="width: 90px; padding: 6px; border: 1px solid #fadbd8; border-radius: 4px; background: #fffcfb; color: #888; font-weight: bold; text-align: right;"></div>
                            <div style="display: flex; align-items: center; gap: 5px;"><span style="font-size: 0.85em; color: #a04000; font-weight: bold; white-space: nowrap;">합계금액</span><input type="text" id="${task.id}_total" class="check-input" data-task="${task.id}" data-type="합계금액" value="${tTotal}" placeholder="자동계산" readonly style="width: 110px; padding: 6px; border: 1px solid #fadbd8; border-radius: 4px; background: #fffcfb; color: #888; font-weight: bold; text-align: right;"></div>
                        </div>
                    </div>
                </td>
            </tr>`;
        } else if (task.op === 'check_simple') {
            return `
            <tr style="background: #fdf5f0; border-bottom: 2px solid #fff;">
                <td colspan="4" style="padding: 10px 15px; vertical-align: middle;">
                    <label style="cursor: pointer; display: flex; align-items: center; margin: 0; font-weight: bold; font-size: 1.05em; color: #d35400;">
                        <input type="checkbox" data-task-id="${task.id}" ${savedChecks[task.id] ? 'checked' : ''} onchange="updateProgress(${total}); if(typeof saveCheckState === 'function') saveCheckState('${baseCustomer}', '${task.id}', this.checked)" style="transform: scale(1.2); margin-right: 10px;">
                        <span style="white-space: nowrap;">${task.title}</span>
                    </label>
                </td>
            </tr>`;
        } else {
            return `<tr>
                <td>${task.title}</td>
                <td>${task.date}</td>
                <td><input type="checkbox" data-task-id="${task.id}" ${savedChecks[task.id] ? 'checked' : ''} onchange="updateProgress(${total}); if(typeof saveCheckState === 'function') saveCheckState('${baseCustomer}', '${task.id}', this.checked)" style="transform: scale(1.2); cursor: pointer;"></td>
                <td><button class="btn btn-primary" onclick="executeTask('${task.id}', '${task.op}', null, false, this)">생성 실행</button></td>
            </tr>`;
        }
    }).join('');
});

function updateProgress(total) {
    const checked = document.querySelectorAll('#checklistBody input[type="checkbox"]:checked').length;
    const percent = Math.round((checked / total) * 100);
    document.getElementById('progressBar').style.width = percent + '%';
    document.getElementById('progressText').innerText = `${checked} / ${total} 완료 (${percent}%)`;
}

function saveCheckState(baseCustomer, taskId, isChecked) {
    let checks = {};
    try { checks = JSON.parse(localStorage.getItem(`rpa_checks_${baseCustomer}`) || '{}'); } catch(e) {}
    checks[taskId] = isChecked;
    localStorage.setItem(`rpa_checks_${baseCustomer}`, JSON.stringify(checks));
}

let currentTaskCustomer = '';
let currentTaskOperation = '';

function executeTask(customer, operation, overrides = null, isRefreshing = false, btnElement = null) {
    const module = typeof RpaRenderer !== 'undefined' ? RpaRenderer.getCustomerModule(customer) : null;
    if (module && typeof module.getActualTaskId === 'function') {
        customer = module.getActualTaskId(customer, operation) || customer;
    }

    if (typeof CustomerManager !== 'undefined' && CustomerManager.isGuideTask && CustomerManager.isGuideTask(operation)) {
        renderCertificateGuideUI();
        return;
    }

    // 💡 탭 이동 자동 저장: 화면에 입력된 값을 다른 문서 탭을 누르기 직전에 자동 저장(Sync)합니다.
    if (!isRefreshing && document.getElementById('previewSection') && document.getElementById('previewSection').style.display === 'block') {
        const inputs = document.querySelectorAll('.edit-input');
        const tempOverride = {};
        inputs.forEach(input => {
            const ignoreVals = ["엑셀 자동 로드", "문서 생성 시 자동 계산", "엑셀파일 연동", "데이터 불러오는 중...", "로드 실패 (생성 시 적용됨)", "로드 실패 (엑셀/양식 확인)"];
            if (!ignoreVals.includes(input.value)) tempOverride[input.dataset.key] = input.value;
        });
        if (currentTaskCustomer) {
            const bCust = typeof RpaRenderer !== 'undefined' ? RpaRenderer.getBaseCustomer(currentTaskCustomer) : currentTaskCustomer.split('_')[0];
            let extData = {};
            try { extData = JSON.parse(localStorage.getItem(`rpaCommonData_${bCust}`) || '{}'); } catch(e) {}
            
            const curModule = typeof RpaRenderer !== 'undefined' ? RpaRenderer.getCustomerModule(currentTaskCustomer) : null;
            if (curModule && typeof curModule.mapDataForStorage === 'function') {
                curModule.mapDataForStorage(currentTaskOperation, currentTaskCustomer, tempOverride);
            } else if (typeof CustomerManager !== 'undefined' && typeof CustomerManager.mapDataForStorage === 'function') {
                CustomerManager.mapDataForStorage(currentTaskOperation, tempOverride);
            }
            localStorage.setItem(`rpaCommonData_${bCust}`, JSON.stringify({ ...extData, ...tempOverride }));
        }
    }

    currentTaskCustomer = customer;
    currentTaskOperation = operation;
    
    let originalBtnText = '';
    if (!btnElement && isRefreshing) {
        // 상세 편집 대시보드의 '계산 적용' 버튼 찾기
        btnElement = document.querySelector('button[onclick*="applyChanges"]');
    }
    
    if (btnElement) {
        originalBtnText = btnElement.innerHTML;
        btnElement.disabled = true;
        btnElement.innerHTML = isRefreshing ? '⏳ 계산 중...' : '⏳ 생성 중...';
    }
    
    showLoading(isRefreshing ? "데이터를 계산하고 화면을 업데이트 중입니다..." : "데이터를 불러오는 중입니다...");

    const optionsObj = { preview_only: (operation !== 'kp_task_all' && (operation === 'doc_official' || operation.startsWith('kp_task'))), billing_amount: "", doc_number: "" };
    
    if (overrides) {
        optionsObj.context_override = overrides;
    } else {
        let savedData = {};
        const baseCustomer = typeof RpaRenderer !== 'undefined' ? RpaRenderer.getBaseCustomer(customer) : customer.split('_')[0];
        try {
            const stored = localStorage.getItem(`rpaCommonData_${baseCustomer}`);
            if (stored) {
                savedData = JSON.parse(stored);
                const ignoreVals = ["엑셀 자동 로드", "문서 생성 시 자동 계산", "엑셀파일 연동", "데이터 불러오는 중...", "로드 실패 (생성 시 적용됨)", "로드 실패 (엑셀/양식 확인)"];
                for(const k in savedData) if(ignoreVals.includes(savedData[k])) delete savedData[k];
            }
        } catch(e) {}

        // 💡 전역 날짜/공문번호 입력칸에서 값을 가져옵니다.
        const monthInput = document.getElementById('global_month');
        const dateInput = document.getElementById('global_date');
        const docNumInput = document.getElementById('global_doc_num');
        if (monthInput && monthInput.value) savedData['청구연월'] = monthInput.value;
        if (dateInput && dateInput.value) savedData['작성일자'] = dateInput.value;
        if (docNumInput && docNumInput.value && document.getElementById('global_doc_num_container').style.display !== 'none') {
            savedData['공문번호'] = docNumInput.value;
        }
        
        const curModule = typeof RpaRenderer !== 'undefined' ? RpaRenderer.getCustomerModule(customer) : null;
        if (curModule && typeof curModule.mapDataForServer === 'function') {
            curModule.mapDataForServer(operation, customer, savedData);
        } else if (typeof CustomerManager !== 'undefined' && typeof CustomerManager.mapDataForServer === 'function') {
            CustomerManager.mapDataForServer(operation, savedData);
        }
        optionsObj.context_override = savedData;
    }
    
    fetch(`/files/process?operation=${operation}&customer=${customer}&options=${encodeURIComponent(JSON.stringify(optionsObj))}`, { method: 'POST', body: new FormData() })
    .then(res => res.text())
    .then(text => {
        const data = JSON.parse(text);
        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            if (optionsObj.preview_only && result.output === "") renderPreviewEditor(result.summary.context, isRefreshing);
            else showDownloadResult(result, isRefreshing);
        } else {
            alert(`오류 발생: ${data.message || data.detail}`);
        }
    })
    .catch(err => alert(`오류: ${err.message}`))
    .finally(() => {
        hideLoading();
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = originalBtnText;
        }
    });
}

async function extractPdfStatsDash(input) {
    if (!input.files || input.files.length === 0) return;
    showToast("📄 PDF에서 데이터를 추출하는 중입니다...");
    const formData = new FormData();
    formData.append('file', input.files[0]);
    
    try {
        const response = await fetch('/files/extract-stats', { method: 'POST', body: formData });
        const data = await response.json();
        if (response.ok && data.success) {
            let successCount = 0;
            for (const [key, value] of Object.entries(data.stats)) {
                const inputEl = document.querySelector(`.edit-input[data-key="${key}"]`);
                if (inputEl && value !== "") {
                    inputEl.value = value;
                    successCount++;
                    inputEl.style.backgroundColor = '#e8f5e9';
                    setTimeout(() => { inputEl.style.backgroundColor = '#fff'; }, 1500);
                }
            }
            calculateSatisfaction();
            calculateRate('정기점검');
            calculateRate('이전설치');
            showToast(`✅ PDF 데이터 추출 완료! (${successCount}개 항목 적용됨)`);
        } else {
            alert(`추출 실패: ${data.detail || data.message}`);
        }
    } catch (error) {
        alert(`서버 통신 오류: ${error.message}`);
    } finally {
        input.value = "";
    }
}

function applyChanges() {
    const inputs = document.querySelectorAll('.edit-input');
    const contextOverride = {};
    inputs.forEach(input => {
        const ignoreVals = ["엑셀 자동 로드", "문서 생성 시 자동 계산", "엑셀파일 연동", "데이터 불러오는 중...", "로드 실패 (생성 시 적용됨)", "로드 실패 (엑셀/양식 확인)"];
        if (!ignoreVals.includes(input.value)) contextOverride[input.dataset.key] = input.value;
    });
    
    // 💡 상세 에디터에서 수정한 날짜를 메인 화면(파란 박스)에도 즉시 동기화
    if (contextOverride['청구연월']) {
        const globalMonth = document.getElementById('global_month');
        if (globalMonth) globalMonth.value = contextOverride['청구연월'];
    }
    if (contextOverride['작성일자']) {
        const globalDate = document.getElementById('global_date');
        if (globalDate) globalDate.value = contextOverride['작성일자'];
    }

    if (currentTaskCustomer) {
        const baseCustomer = currentTaskCustomer.split('_')[0];
        let existingData = {};
        try { existingData = JSON.parse(localStorage.getItem(`rpaCommonData_${baseCustomer}`) || '{}'); } catch(e) {}
        
        const curModule = typeof RpaRenderer !== 'undefined' ? RpaRenderer.getCustomerModule(currentTaskCustomer) : null;
        if (curModule && typeof curModule.mapDataForStorage === 'function') {
            curModule.mapDataForStorage(currentTaskOperation, currentTaskCustomer, contextOverride);
        } else if (typeof CustomerManager !== 'undefined' && typeof CustomerManager.mapDataForStorage === 'function') {
            CustomerManager.mapDataForStorage(currentTaskOperation, contextOverride);
        }

        const dataToStore = { ...existingData, ...contextOverride };
        delete dataToStore['청구연월'];
        delete dataToStore['작성일자'];

        localStorage.setItem(`rpaCommonData_${baseCustomer}`, JSON.stringify(dataToStore));
    }
    executeTask(currentTaskCustomer, currentTaskOperation, contextOverride, true);
}

function renderPreviewEditor(context, isRefreshing = false) {
    const previewContent = document.getElementById('previewContent');
    let html = `<div style="padding: 15px; background: #e8f5e9; color: #2e7d32; border-radius: 6px; margin-bottom: 20px; font-weight: bold;">✅ 엑셀 데이터 불러오기 완료. 필수 입력 항목을 확인하고 저장해 주세요.</div>`;
    delete context['모든_변수_확인용'];
    
    const module = typeof RpaRenderer !== 'undefined' ? RpaRenderer.getCustomerModule(currentTaskCustomer) : null;
    const exposedKeys = module && typeof module.getDashboardKeys === 'function' ? module.getDashboardKeys(currentTaskOperation, currentTaskCustomer) : [];

    const dateKeys = ['청구연월', '작성일자'];
    
    if (exposedKeys.length > 0) {
        const showPdf = typeof CustomerManager !== 'undefined' && typeof CustomerManager.showPdfUploadInput === 'function' ? CustomerManager.showPdfUploadInput(currentTaskCustomer) : (currentTaskCustomer === 'koreapost_2');
        if (showPdf) {
            html += `<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;"><h4 style="margin: 0; color: var(--text);">📌 필수 확인 및 통계 정보</h4><button type="button" class="btn" style="background: #fff3cd; color: #856404; border: 1px solid #ffeeba; font-size: 0.85em; padding: 6px 12px; font-weight: bold; border-radius: 4px;" onclick="document.getElementById('dashPdfUploadInput').click();">📄 서비스 수준 관리 보고서 불러오기(PDF)</button><input type="file" id="dashPdfUploadInput" accept=".pdf" style="display: none;" onchange="extractPdfStatsDash(this)"></div>`;
        } else html += `<h4 style="margin-bottom: 15px; color: var(--text);">📌 필수 확인 및 금액 정보</h4>`;
        html += `<div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">`;
        
        for (const key of exposedKeys) {
            if (context[key] !== undefined) {
                let inputHtml = '';
                if (typeof RpaRenderer !== 'undefined') {
                    inputHtml = RpaRenderer.renderDashboardInput(key, context[key], true, currentTaskOperation, currentTaskCustomer);
                } else {
                    inputHtml = `<input type="text" class="edit-input" data-key="${key}" value="${context[key]}" style="width: 100%; padding: 10px; border: 2px solid var(--primary); border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #f4faff;">`;
                }
                let labelHtml = `<label style="font-weight: bold; display: block; margin-bottom: 5px; color: var(--text);">${key}</label>`;
                html += `<div style="flex: 1; min-width: 200px;">${labelHtml}${inputHtml}</div>`;
            }
        }
        html += `</div>`;
    }

    html += `<details style="margin-bottom: 20px; border: 1px solid var(--border); border-radius: 6px; background: #fff;"><summary style="font-weight: bold; cursor: pointer; color: var(--text); padding: 15px; font-size: 1.05em; background: #f8fafc; border-radius: 6px;">⚙️ 상세 변수 확인 및 직접 수정하기 (클릭)</summary><div style="padding: 15px; border-top: 1px solid var(--border);"><div class="preview-table-container"><table style="width: 100%; border-collapse: collapse;">`;
    
    const hiddenKeys = ['청구연도', '청구월', '전월연도', '전월', '작성일자_숫자', '작성일자_점', '작성연도_숫자', '작성월_숫자', '작성일자_일', '공문끝번호', '표데이터'];
    let hiddenHtml = '';
    for (const [key, value] of Object.entries(context)) {
        if (hiddenKeys.includes(key) || key.match(/\.\d+$/) || key.startsWith('Unnamed')) {
            hiddenHtml += `<input type="hidden" class="edit-input" data-key="${key}" value="${typeof value === 'object' ? '' : value}">`; continue;
        }
        if (exposedKeys.includes(key) || dateKeys.includes(key)) continue;
        html += `<tr><th style="background: #f8fafc; border-bottom: 1px solid var(--border); padding: 10px; width: 30%; text-align: left;">${key}</th><td style="border-bottom: 1px solid var(--border); padding: 10px;"><input type="text" class="edit-input" data-key="${key}" value="${value}" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; box-sizing: border-box;"></td></tr>`;
    }
    html += `</table></div></div></details><h4 style="margin-bottom: 15px; color: var(--text);">📅 필수 날짜 정보 (고정)</h4><div style="display: flex; gap: 15px; margin-bottom: 10px;">`;
    for (const key of dateKeys) {
        if (context[key] !== undefined) html += `<div style="flex: 1; min-width: 200px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: var(--text);">${key}</label><input type="text" class="edit-input" data-key="${key}" value="${context[key]}" style="width: 100%; padding: 10px; border: 2px solid var(--primary); border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #f4faff;"></div>`;
    }
    html += `</div><div style="font-size: 0.85em; color: var(--text-light); margin-bottom: 20px;">💡 금액/날짜 수정 후 하단의 <b>[💾 계산 적용 (저장)]</b> 버튼을 누르면 연관 변수가 자동 업데이트됩니다.</div>${hiddenHtml}`;
    previewContent.innerHTML = html;
    
    document.querySelectorAll('.money-input').forEach(input => { if(input.value) formatMoney(input); });
    const totalInput = document.getElementById('input_total');
    if (totalInput) calculateVAT(totalInput);
    calculateClaimAmount(); calculateActualPayment();
    
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.innerHTML = `🚀 이 내용으로 문서 생성 및 다운로드`; downloadBtn.href = "#";
    downloadBtn.onclick = (e) => { e.preventDefault(); submitFinalDocument(); };
    
    const pdfBtn = document.getElementById('pdfDownloadBtn'); if(pdfBtn) pdfBtn.style.display = 'none';
    const rBtn = document.getElementById('retryBtn'); if(rBtn) rBtn.style.display = 'inline-block';
    const sticky = document.getElementById('stickyActionBar'); if(sticky) sticky.style.display = 'flex';
    
    const previewSection = document.getElementById('previewSection');
    previewSection.style.display = 'block';
    if (!isRefreshing) previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function submitFinalDocument() {
    const downloadBtn = document.getElementById('downloadBtn');
    let originalText = '';
    if (downloadBtn) {
        originalText = downloadBtn.innerHTML;
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '⏳ 최종 문서 생성 중...';
    }
    
    showLoading("최종 문서를 생성 중입니다...");
    const inputs = document.querySelectorAll('.edit-input');
    const contextOverride = {};
    inputs.forEach(input => {
        const ignoreVals = ["엑셀 자동 로드", "문서 생성 시 자동 계산", "엑셀파일 연동", "데이터 불러오는 중...", "로드 실패 (생성 시 적용됨)", "로드 실패 (엑셀/양식 확인)"];
        if (!ignoreVals.includes(input.value)) contextOverride[input.dataset.key] = input.value;
    });
    
    // 💡 최종 생성 시에도 수정한 날짜를 메인 화면(파란 박스)에 동기화
    if (contextOverride['청구연월']) {
        const globalMonth = document.getElementById('global_month');
        if (globalMonth) globalMonth.value = contextOverride['청구연월'];
    }
    if (contextOverride['작성일자']) {
        const globalDate = document.getElementById('global_date');
        if (globalDate) globalDate.value = contextOverride['작성일자'];
    }
    if (contextOverride['공문번호']) {
        const globalDocNum = document.getElementById('global_doc_num');
        if (globalDocNum) globalDocNum.value = contextOverride['공문번호'];
    }

    if (currentTaskCustomer) {
        const baseCustomer = typeof RpaRenderer !== 'undefined' ? RpaRenderer.getBaseCustomer(currentTaskCustomer) : currentTaskCustomer.split('_')[0];
        let existingData = {};
        try { existingData = JSON.parse(localStorage.getItem(`rpaCommonData_${baseCustomer}`) || '{}'); } catch(e) {}
        
        const curModule = typeof RpaRenderer !== 'undefined' ? RpaRenderer.getCustomerModule(currentTaskCustomer) : null;
        if (curModule && typeof curModule.mapDataForStorage === 'function') {
            curModule.mapDataForStorage(currentTaskOperation, currentTaskCustomer, contextOverride);
        } else if (typeof CustomerManager !== 'undefined' && typeof CustomerManager.mapDataForStorage === 'function') {
            CustomerManager.mapDataForStorage(currentTaskOperation, contextOverride);
        }

        const dataToStore = { ...existingData, ...contextOverride };
        delete dataToStore['청구연월'];
        delete dataToStore['작성일자'];

        localStorage.setItem(`rpaCommonData_${baseCustomer}`, JSON.stringify(dataToStore));
    }
    
    try {
        const response = await fetch(`/files/process?operation=${currentTaskOperation}&customer=${currentTaskCustomer}&options=${encodeURIComponent(JSON.stringify({context_override: contextOverride}))}`, { method: 'POST', body: new FormData() });
        const data = JSON.parse(await response.text());
        if (response.ok && data.results && data.results.length > 0) showDownloadResult(data.results[0], true);
        else alert(`오류 발생: ${data.message || data.detail}`);
    } catch (error) { alert(`오류: ${error.message}`); } finally { hideLoading(); }
}

function showDownloadResult(result, isFromEditor = false) {
    const filename = result.output.split(/[/\\]/).pop();
    const previewContent = document.getElementById('previewContent');
    document.getElementById('stickyActionBar').style.display = 'flex';

    if (!isFromEditor) previewContent.innerHTML = `<div style="padding: 15px; background: #e8f5e9; color: #2e7d32; border-radius: 6px; margin-bottom: 20px; font-weight: bold;">✅ ${result.summary?.message || '생성이 완료되었습니다.'}</div>`;
    else showToast("✅ 생성이 완료되었습니다!");
    
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.href = `/files/download/${filename}`;
    downloadBtn.innerHTML = `⬇️ <b>${filename}</b> (${filename.endsWith('.xlsx') ? 'Excel' : 'Word'}) 다운로드`;
    downloadBtn.onclick = null;
    
    const pdfBtn = document.getElementById('pdfDownloadBtn');
    if (pdfBtn) {
        if (filename.endsWith('.docx') || filename.endsWith('.xlsx')) {
            pdfBtn.href = "#"; pdfBtn.innerHTML = `⚙️ PDF로 변환하기`; pdfBtn.style.display = 'inline-block';
            pdfBtn.onclick = (e) => { e.preventDefault(); requestPdfConversion(filename, pdfBtn); };
        } else pdfBtn.style.display = 'none';
    }
    document.getElementById('previewSection').style.display = 'block';
    if(!isFromEditor) document.getElementById('previewSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCertificateGuideUI() {
    const previewContent = document.getElementById('previewContent');
    previewContent.innerHTML = `<div style="padding: 25px; background: #fff; border: 1px solid var(--border); border-radius: 8px;"><h3 style="color: var(--primary); margin-bottom: 10px;">🌐 제증명 서류 3종 발급 도우미</h3><p style="margin-bottom: 25px; color: var(--text-light); line-height: 1.6;">지방세 납세증명, 국세 납세증명서, 4대 사회보험 완납증명서는 정부/공공기관 사이트에서 <b>공동인증서(또는 간편인증)</b>를 통해 발급받아야 합니다.<br>아래 바로가기 링크를 통해 해당 사이트로 이동하여 서류를 직접 발급해 주세요.</p><div style="display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;"><a href="https://plus.gov.kr/" target="_blank" style="flex: 1; min-width: 200px; text-decoration: none; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; background: #f8fafc;"><div style="font-size: 30px; margin-bottom: 10px;">🏛️</div><strong style="color: #1e293b; font-size: 1.1em; display: block; margin-bottom: 5px;">정부24 (지방세/국세)</strong><span style="font-size: 0.9em; color: var(--text-light);">지방세 납세증명 / 납세증명서(국세) 발급</span></a><a href="https://si4n.nhis.or.kr/jpba/JpBaa00101.do" target="_blank" style="flex: 1; min-width: 200px; text-decoration: none; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; background: #f8fafc;"><div style="font-size: 30px; margin-bottom: 10px;">🏥</div><strong style="color: #1e293b; font-size: 1.1em; display: block; margin-bottom: 5px;">사회보험 징수포털</strong><span style="font-size: 0.9em; color: var(--text-light);">4대 사회보험 완납증명서 발급</span></a></div></div>`;
    const stickyActionBar = document.getElementById('stickyActionBar');
    if (stickyActionBar) stickyActionBar.style.display = 'none';
    const previewSection = document.getElementById('previewSection');
    previewSection.style.display = 'block';
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function requestPdfConversion(filename, btnElement) {
    showLoading("PDF로 변환 중입니다...");
    btnElement.innerHTML = `⏳ 변환 중... (잠시만 기다려주세요)`;
    btnElement.onclick = (e) => e.preventDefault();
    btnElement.style.opacity = '0.7';
    try {
        const response = await fetch(`/files/process?operation=doc_convert_pdf&customer=${currentTaskCustomer}&options=${encodeURIComponent(JSON.stringify({filename: filename}))}`, { method: 'POST', body: new FormData() });
        const data = JSON.parse(await response.text());
        if (data.results && data.results.length > 0) {
            const pdfName = data.results[0].output.split(/[/\\]/).pop();
            btnElement.href = `/files/download/${pdfName}`;
            btnElement.innerHTML = `📄 <b>${pdfName}</b> 다운로드`;
            btnElement.onclick = null; btnElement.style.opacity = '1';
            showToast("✅ PDF 변환이 완료되었습니다!");
        } else {
            alert(`오류 발생: ${data.message || data.detail}`);
            btnElement.innerHTML = `⚙️ PDF로 변환하기`; btnElement.style.opacity = '1';
            btnElement.onclick = (e) => { e.preventDefault(); requestPdfConversion(filename, btnElement); };
        }
    } catch(error) {
        alert(`오류: ${error.message}`);
        btnElement.innerHTML = `⚙️ PDF로 변환하기`; btnElement.style.opacity = '1';
        btnElement.onclick = (e) => { e.preventDefault(); requestPdfConversion(filename, btnElement); };
    } finally { hideLoading(); }
}

function retryTask() {
    if (currentTaskCustomer && currentTaskOperation) executeTask(currentTaskCustomer, currentTaskOperation);
}

function showLoading(message = "작업을 처리 중입니다...") {
    const msgEl = document.getElementById('loadingMessage');
    if (msgEl) msgEl.innerText = message;
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        // 화면 전체를 막는 배경 투명화 및 클릭 통과 설정 (답답함 해소)
        overlay.style.backgroundColor = 'transparent';
        overlay.style.pointerEvents = 'none'; 
        
        // 내부 알림 박스만 우측 하단 미니 팝업으로 디자인 변경
        const box = overlay.querySelector('div') || overlay; 
        if (box && box !== overlay) {
            box.style.position = 'fixed';
            box.style.bottom = '20px';
            box.style.right = '20px';
            box.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)';
            box.style.border = '2px solid #0056b3';
            box.style.borderRadius = '8px';
            box.style.padding = '15px 25px';
            box.style.margin = '0';
            box.style.transform = 'none';
        }
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}