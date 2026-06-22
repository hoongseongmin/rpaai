window.uploadHanaFile = function(inputId, statusId, hiddenId) {
    const fileInput = document.getElementById(inputId);
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('업로드할 엑셀 파일을 먼저 선택해주세요.');
        return;
    }
    
    const formData = new FormData();
    formData.append('files', fileInput.files[0]);
    formData.append('task_type', 'compare');
    
    const statusText = document.getElementById(statusId);
    statusText.style.color = '#0056b3';
    statusText.textContent = '업로드 중입니다... 잠시만 기다려주세요.';
    
    fetch('/files/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'completed' && data.filenames && data.filenames.length > 0) {
            const filename = data.filenames[0];
            const hiddenInput = document.getElementById(hiddenId);
            if (hiddenInput) {
                hiddenInput.value = filename;
                const evt = new Event('change', { bubbles: true });
                hiddenInput.dispatchEvent(evt);
            }
            statusText.style.color = '#28a745';
            statusText.innerHTML = '✅ 업로드 완료! 이제 <b>[생성]</b> 버튼을 눌러주세요.<br>(업로드된 파일: ' + filename + ')';
        } else { throw new Error('업로드 처리 실패'); }
    })
    .catch(error => {
        statusText.style.color = '#d9534f';
        statusText.textContent = '업로드 중 오류가 발생했습니다: ' + error.message;
    });
};

window.RPA_CUSTOMERS = window.RPA_CUSTOMERS || {};

window.RPA_CUSTOMERS['hanabank'] = {
    monthOffset: 0, // 청구 기준일 (0: 당월, -1: 전월)
    tasks: [
        // 전용 작업 코드로 정상 복구
        { id: 'hanabank_1', op: 'hanabank_task1', title: '1. 📝 엑셀 로우데이터 수정하기 (Openpyxl 단독)', date: '매월 초' },
        { id: 'hanabank_2', op: 'hanabank_task2_hybrid', title: '2. 📝 엑셀 로우데이터 수정하기 (Pandas + Openpyxl 혼합)', date: '테스트용' }
    ],
    renderOneclick: function(savedData) {
        return `
            <div style="background: #f0f7ff; border: 1px solid #cce4f7; border-radius: 8px; padding: 20px; width: 100%; box-sizing: border-box; margin-top:15px;">
                <h4 style="color: #0056b3; margin-top: 0; margin-bottom: 15px; font-size: 1.1em;">🟦 [하나은행] 엑셀 편집</h4>
                <p style="color: #666; font-size: 0.9em; margin-bottom: 15px;">이 화면에서 원본 엑셀 파일을 첨부하면 설정된 업체의 데이터만 추출하여 서식 유지된 편집본을 생성합니다.</p>
                
                <div style="background: #fff; padding: 15px; border: 2px dashed #0056b3; border-radius: 6px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 8px; color: #0056b3;">📂 여기에 원본 엑셀 파일을 첨부하세요</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="file" id="oneclick_hana_file" accept=".xlsx, .xls" style="flex: 1; cursor: pointer; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
                        <button type="button" onclick="window.uploadHanaFile('oneclick_hana_file', 'oneclick_hana_status', 'oneclick_hana_hidden')" style="padding: 5px 15px; background: #0056b3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">업로드 (고정)</button>
                    </div>
                    <p id="oneclick_hana_status" style="margin-top: 10px; margin-bottom: 0; font-size: 0.9em; color: #d9534f;">※ 파일을 선택하고 반드시 <b>[업로드 (고정)]</b> 버튼을 먼저 눌러주세요.</p>
                    <input type="hidden" class="form-control context-input" data-key="원본_엑셀_업로드" id="oneclick_hana_hidden">
                </div>
            </div>
        `;
    },
    onOneclickRendered: function() {},
    getDashboardKeys: function(operation, customerId) { return ['원본_엑셀_업로드', '추출_업체명']; },
    renderDashboardInput: function(key, value, operation, customerId) { 
        if (key === '추출_업체명') {
            return `<input type="text" class="form-control context-input" data-key="${key}" value="${value || '에이텍'}" placeholder="예: 에이텍, 글로벌">`;
        }
        if (key === '원본_엑셀_업로드') {
            return `
                <div style="background: #f0f7ff; padding: 15px; border: 2px dashed #0056b3; border-radius: 6px; margin-bottom: 10px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 5px; color: #0056b3;">📂 상세 편집 대시보드 - 엑셀 첨부란</label>
                    <p style="font-size: 0.85em; color: #666; margin-top: 0; margin-bottom: 10px;">이곳에 엑셀 파일을 선택하고 반드시 <b>[업로드]</b> 버튼을 먼저 누른 뒤, 생성 버튼을 눌러주세요.</p>
                    <div style="display: flex; gap: 10px;">
                        <input type="file" id="dashboard_hana_file" accept=".xlsx, .xls" style="flex: 1; cursor: pointer; padding: 5px; border: 1px solid #ccc; background:#fff; border-radius: 4px;">
                        <button type="button" onclick="window.uploadHanaFile('dashboard_hana_file', 'dashboard_hana_status', 'dashboard_hana_hidden')" style="padding: 5px 15px; background: #0056b3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">업로드</button>
                    </div>
                    <p id="dashboard_hana_status" style="margin-top: 10px; margin-bottom: 0; font-size: 0.9em; color: #d9534f;">※ 파일을 업로드해야 생성 가능합니다.</p>
                    <input type="hidden" class="form-control context-input" data-key="${key}" id="dashboard_hana_hidden" value="${value || ''}">
                </div>
            `;
        }
        return null; 
    },
    onDashboardRendered: function(context, operation, customerId) {}
};