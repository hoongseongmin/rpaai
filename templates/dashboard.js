const customerTasks = {
    'koreapost': [
        { id: 'koreapost_1', op: 'doc_official', title: '1. 📝 이전설치 공문 (Word)', date: '매월 5일' },
        { id: 'koreapost_2', op: 'doc_official', title: '2. 📝 이행실적 공문 (Word)', date: '매월 5일' },
        { id: 'koreapost_3', op: 'kp_task3', title: '3. 📊 이전실비 청구서 (Excel)', date: '매월 10일' },
        { id: 'koreapost_4', op: 'kp_task4', title: '4. 📊 유지보수료 청구서 (Excel)', date: '매월 10일' },
        { id: 'koreapost',   op: 'kp_task5', title: '5. 제증명 서류 3종 <br><span style="font-size: 0.85em; color: var(--text-light);">- 국세/지방세/4대보험</span>', date: '매월 10일' }
    ]
};

document.getElementById('task_customer').addEventListener('change', function() {
    const customer = this.value;
    const tbody = document.getElementById('checklistBody');
    const progressSummary = document.getElementById('progressSummary');
    
    const tasks = customerTasks[customer] || [{ id: customer, op: 'doc_official', title: '1. 📝 맞춤형 공문 생성 (Word)', date: '상시' }];
    const total = tasks.length;
    
    progressSummary.style.display = 'block';
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressText').innerText = `0 / ${total} 완료 (0%)`;
    
    tbody.innerHTML = tasks.map(task => `
        <tr>
            <td>${task.title}</td>
            <td>${task.date}</td>
            <td><input type="checkbox" onchange="updateProgress(${total})"></td>
            <td><button class="btn btn-primary" onclick="executeTask('${task.op === 'doc_official' ? task.id : customer}', '${task.op}')">생성 실행</button></td>
        </tr>
    `).join('');
});

function updateProgress(total) {
    const checked = document.querySelectorAll('#checklistBody input[type="checkbox"]:checked').length;
    const percent = Math.round((checked / total) * 100);
    document.getElementById('progressBar').style.width = percent + '%';
    document.getElementById('progressText').innerText = `${checked} / ${total} 완료 (${percent}%)`;
}

let currentTaskCustomer = '';
let currentTaskOperation = '';

function executeTask(customer, operation, overrides = null, isRefreshing = false) {
    if (operation === 'kp_task5') {
        renderCertificateGuideUI();
        return;
    }

    currentTaskCustomer = customer;
    currentTaskOperation = operation;
    showLoading(isRefreshing ? "데이터를 계산하고 화면을 업데이트 중입니다..." : "데이터를 불러오는 중입니다...");

    const optionsObj = { preview_only: (operation === 'doc_official' || operation.startsWith('kp_task')), billing_amount: "", doc_number: "" };
    
    if (overrides) {
        optionsObj.context_override = overrides;
    } else {
        let savedData = {};
        const baseCustomer = customer.split('_')[0];
        try {
            const stored = localStorage.getItem(`rpaCommonData_${baseCustomer}`);
            if (stored) {
                savedData = JSON.parse(stored);
                const ignoreVals = ["엑셀 자동 로드", "문서 생성 시 자동 계산", "엑셀파일 연동", "데이터 불러오는 중...", "로드 실패 (생성 시 적용됨)", "로드 실패 (엑셀/양식 확인)"];
                for(const k in savedData) if(ignoreVals.includes(savedData[k])) delete savedData[k];
            }
        } catch(e) {}

        const today = new Date();
        let targetYear = today.getFullYear();
        let targetMonth = today.getMonth();
        if (targetMonth === 0) { targetMonth = 12; targetYear -= 1; }
        
        // 💡 나이스CMS 등 당월 청구 고객사는 청구연월을 '이번 달'로 세팅
        if (baseCustomer.startsWith('nice_')) {
            savedData['청구연월'] = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월`;
        } else {
            savedData['청구연월'] = `${targetYear}년 ${String(targetMonth).padStart(2, '0')}월`;
        }
        savedData['작성일자'] = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월 ${String(today.getDate()).padStart(2, '0')}일`;
        
        if (operation === 'kp_task3') {
            if (savedData['당초청구금액_3']) savedData['당초청구금액'] = savedData['당초청구금액_3'];
            if (savedData['정산감액_3']) savedData['정산감액'] = savedData['정산감액_3'];
            if (savedData['청구금액_3']) savedData['청구금액'] = savedData['청구금액_3'];
        } else if (operation === 'kp_task4') {
            if (savedData['당초청구금액_4']) savedData['당초청구금액'] = savedData['당초청구금액_4'];
            if (savedData['정산감액_4']) savedData['정산감액'] = savedData['정산감액_4'];
            if (savedData['청구금액_4']) savedData['청구금액'] = savedData['청구금액_4'];
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
    .finally(() => hideLoading());
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
    
    if (currentTaskCustomer) {
        const baseCustomer = currentTaskCustomer.split('_')[0];
        let existingData = {};
        try { existingData = JSON.parse(localStorage.getItem(`rpaCommonData_${baseCustomer}`) || '{}'); } catch(e) {}
        
        if (currentTaskOperation === 'kp_task3') {
            if (contextOverride['당초청구금액'] !== undefined) contextOverride['당초청구금액_3'] = contextOverride['당초청구금액'];
            if (contextOverride['정산감액'] !== undefined) contextOverride['정산감액_3'] = contextOverride['정산감액'];
            if (contextOverride['청구금액'] !== undefined) contextOverride['청구금액_3'] = contextOverride['청구금액'];
        } else if (currentTaskOperation === 'kp_task4') {
            if (contextOverride['당초청구금액'] !== undefined) contextOverride['당초청구금액_4'] = contextOverride['당초청구금액'];
            if (contextOverride['정산감액'] !== undefined) contextOverride['정산감액_4'] = contextOverride['정산감액'];
            if (contextOverride['청구금액'] !== undefined) contextOverride['청구금액_4'] = contextOverride['청구금액'];
        }
        localStorage.setItem(`rpaCommonData_${baseCustomer}`, JSON.stringify({ ...existingData, ...contextOverride }));
    }
    executeTask(currentTaskCustomer, currentTaskOperation, contextOverride, true);
}

function renderPreviewEditor(context, isRefreshing = false) {
    const previewContent = document.getElementById('previewContent');
    let html = `<div style="padding: 15px; background: #e8f5e9; color: #2e7d32; border-radius: 6px; margin-bottom: 20px; font-weight: bold;">✅ 엑셀 데이터 불러오기 완료. 필수 입력 항목을 확인하고 저장해 주세요.</div>`;
    delete context['모든_변수_확인용'];
    
    let exposedKeys = [];
    if (currentTaskCustomer === 'koreapost_1') exposedKeys = ['합계금액', '공급가액', '부가세'];
    else if (currentTaskCustomer === 'koreapost_2') exposedKeys = ['월유지비용', '미사용차감수량', '미사용차감금액', '실지급액', '장애_적기처리건수', '장애_지연처리건수', '만족도조사_건수', '만족도조사_총점', '만족도조사_평점', '정기점검_총대상수', '정기점검_완료수', '정기점검_달성률', '이전설치_총대상수', '이전설치_완료수', '이전설치_달성률'];
    else if (currentTaskOperation === 'kp_task3' || currentTaskOperation === 'kp_task4') exposedKeys = ['당초청구금액', '정산감액', '청구금액', '합계금액', '공급가액', '부가세'];

    const dateKeys = ['청구연월', '작성일자'];
    
    if (exposedKeys.length > 0) {
        if (currentTaskCustomer === 'koreapost_2') {
            html += `<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;"><h4 style="margin: 0; color: var(--text);">📌 필수 확인 및 통계 정보</h4><button type="button" class="btn" style="background: #fff3cd; color: #856404; border: 1px solid #ffeeba; font-size: 0.85em; padding: 6px 12px; font-weight: bold; border-radius: 4px;" onclick="document.getElementById('dashPdfUploadInput').click();">📄 서비스 수준 관리 보고서 불러오기(PDF)</button><input type="file" id="dashPdfUploadInput" accept=".pdf" style="display: none;" onchange="extractPdfStatsDash(this)"></div>`;
        } else html += `<h4 style="margin-bottom: 15px; color: var(--text);">📌 필수 확인 및 금액 정보</h4>`;
        html += `<div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">`;
        
        for (const key of exposedKeys) {
            if (context[key] !== undefined) {
                let inputHtml = `<input type="text" class="edit-input" data-key="${key}" value="${context[key]}" style="width: 100%; padding: 10px; border: 2px solid var(--primary); border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #f4faff;">`;
                if (['월유지비용', '당초청구금액', '정산감액'].includes(key) && (key === '월유지비용' && (currentTaskCustomer === 'koreapost_1' || currentTaskCustomer === 'koreapost_2') || key === '당초청구금액' && (currentTaskOperation === 'kp_task4' || currentTaskOperation === 'kp_task3') || key === '정산감액' && currentTaskOperation === 'kp_task3')) {
                    inputHtml = `<input type="text" class="edit-input money-input" data-key="${key}" value="${key==='정산감액' && currentTaskOperation === 'kp_task3' ? '0' : context[key]}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-weight: bold; background-color: #f5f5f5; color: #888;" readonly>`;
                } else if (['청구금액', '실지급액', '부가세', '공급가액', '만족도조사_평점', '정기점검_달성률', '이전설치_달성률'].includes(key)) {
                    let oninputStr = "formatMoney(this)";
                    if (key === '공급가액') oninputStr += "; calculateFromSupply(this);";
                    let extraId = key === '합계금액' ? 'id="input_total"' : (key === '공급가액' ? 'id="input_supply"' : (key === '부가세' ? 'id="input_vat"' : ''));
                    inputHtml = `<input type="text" class="edit-input ${key.includes('달성률')||key.includes('평점')?'':'money-input'}" ${extraId} data-key="${key}" value="${context[key]}" placeholder="자동 계산됨" oninput="${oninputStr}" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-weight: bold; background-color: ${key==='공급가액'?'#fafafa':'#f5f5f5'}; color: ${key==='공급가액'?'inherit':'#888'};" ${key !== '공급가액' ? 'readonly' : ''}>`;
                } else if (['합계금액', '당초청구금액', '정산감액', '미사용차감수량', '미사용차감금액', '만족도조사_건수', '만족도조사_총점', '정기점검_총대상수', '정기점검_완료수', '이전설치_총대상수', '이전설치_완료수', '장애_적기처리건수', '장애_지연처리건수'].includes(key)) {
                    let oninputStr = key.includes('수') || key.includes('점') ? "" : "formatMoney(this)";
                    if (key === '합계금액') oninputStr += "; calculateVAT(this);";
                    else if (key === '당초청구금액' || key === '정산감액') oninputStr += "; calculateClaimAmount();";
                    else if (key === '미사용차감금액') oninputStr += "; calculateActualPayment();";
                    else if (key.includes('만족도')) oninputStr = "calculateSatisfaction();";
                    else if (key.includes('정기점검')) oninputStr = "calculateRate('정기점검');";
                    else if (key.includes('이전설치')) oninputStr = "calculateRate('이전설치');";
                    let extraId = key === '합계금액' ? 'id="input_total"' : '';
                    inputHtml = `<input type="${key.includes('수')||key.includes('점')?'number':'text'}" class="edit-input ${key.includes('수')||key.includes('점')?'':'money-input'}" ${extraId} data-key="${key}" value="${context[key]}" oninput="${oninputStr}" style="width: 100%; padding: 10px; border: 2px solid var(--primary); border-radius: 4px; font-weight: bold; background-color: #f4faff;">`;
                }
                html += `<div style="flex: 1; min-width: 200px;"><label style="font-weight: bold; display: block; margin-bottom: 5px; color: var(--text);">${key}</label>${inputHtml}</div>`;
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
    showLoading("최종 문서를 생성 중입니다...");
    const inputs = document.querySelectorAll('.edit-input');
    const contextOverride = {};
    inputs.forEach(input => {
        const ignoreVals = ["엑셀 자동 로드", "문서 생성 시 자동 계산", "엑셀파일 연동", "데이터 불러오는 중...", "로드 실패 (생성 시 적용됨)", "로드 실패 (엑셀/양식 확인)"];
        if (!ignoreVals.includes(input.value)) contextOverride[input.dataset.key] = input.value;
    });
    
    if (currentTaskCustomer) {
        const baseCustomer = currentTaskCustomer.split('_')[0];
        let existingData = {};
        try { existingData = JSON.parse(localStorage.getItem(`rpaCommonData_${baseCustomer}`) || '{}'); } catch(e) {}
        if (currentTaskOperation === 'kp_task3') {
            if (contextOverride['당초청구금액'] !== undefined) contextOverride['당초청구금액_3'] = contextOverride['당초청구금액'];
            if (contextOverride['정산감액'] !== undefined) contextOverride['정산감액_3'] = contextOverride['정산감액'];
            if (contextOverride['청구금액'] !== undefined) contextOverride['청구금액_3'] = contextOverride['청구금액'];
        } else if (currentTaskOperation === 'kp_task4') {
            if (contextOverride['당초청구금액'] !== undefined) contextOverride['당초청구금액_4'] = contextOverride['당초청구금액'];
            if (contextOverride['정산감액'] !== undefined) contextOverride['정산감액_4'] = contextOverride['정산감액'];
            if (contextOverride['청구금액'] !== undefined) contextOverride['청구금액_4'] = contextOverride['청구금액'];
        }
        localStorage.setItem(`rpaCommonData_${baseCustomer}`, JSON.stringify({ ...existingData, ...contextOverride }));
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
    if (overlay) overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}