// === 공통 포맷터 및 알림 ===
function formatMoney(input) {
    if (!input || !input.value) return;
    let valStr = String(input.value);
    const ignoreVals = ["엑셀 자동 로드", "문서 생성 시 자동 계산", "엑셀파일 연동", "데이터 불러오는 중...", "로드 실패 (생성 시 적용됨)", "로드 실패 (엑셀/양식 확인)"];
    if (ignoreVals.includes(valStr)) return;
    
    let value = valStr.replace(/[^\d\-]/g, '');
    if (value && !isNaN(parseInt(value, 10))) {
        input.value = parseInt(value, 10).toLocaleString('ko-KR');
    } else {
        input.value = value;
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = 'show';
    setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
}

// === 공통 금액/통계 연산기 ===
function calculateActualPayment() {
    const baseInput = document.querySelector('input[data-key="월유지비용"]');
    const deductInput = document.querySelector('input[data-key="미사용차감금액"]');
    const actualInput = document.querySelector('input[data-key="실지급액"]');
    
    if (baseInput && actualInput) {
        const ignoreVals = ["엑셀 자동 로드", "문서 생성 시 자동 계산", "엑셀파일 연동", "데이터 불러오는 중...", "로드 실패 (생성 시 적용됨)", "로드 실패 (엑셀/양식 확인)"];
        if (baseInput.readOnly && (ignoreVals.includes(baseInput.value) || isNaN(parseInt(baseInput.value.replace(/[^\d\-]/g, ''), 10)))) {
            actualInput.value = "문서 생성 시 자동 계산";
            return;
        }
        let base = parseInt(baseInput.value.replace(/[^\d\-]/g, ''), 10) || 0;
        let deduct = deductInput ? parseInt(deductInput.value.replace(/[^\d\-]/g, ''), 10) || 0 : 0;
        let actual = base - deduct;
        actualInput.value = actual.toLocaleString('ko-KR');
    }
}

function calculateClaimAmount(suffix = '') {
    const keySuffix = suffix ? `_${suffix}` : '';
    const baseInput = document.querySelector(`input[data-key="당초청구금액${keySuffix}"]`);
    const deductInput = document.querySelector(`input[data-key="정산감액${keySuffix}"]`);
    const claimInput = document.querySelector(`input[data-key="청구금액${keySuffix}"]`);
    
    if (baseInput && claimInput) {
        const ignoreVals = ["엑셀 자동 로드", "문서 생성 시 자동 계산", "엑셀파일 연동", "데이터 불러오는 중...", "로드 실패 (생성 시 적용됨)", "로드 실패 (엑셀/양식 확인)"];
        if (baseInput.readOnly && (ignoreVals.includes(baseInput.value) || isNaN(parseInt(baseInput.value.replace(/[^\d\-]/g, ''), 10)))) {
            claimInput.value = "문서 생성 시 자동 계산";
            return;
        }
        let base = parseInt(baseInput.value.replace(/[^\d\-]/g, ''), 10) || 0;
        let deduct = deductInput ? parseInt(deductInput.value.replace(/[^\d\-]/g, ''), 10) || 0 : 0;
        let claim = base - deduct;
        claimInput.value = claim.toLocaleString('ko-KR');
    }
}

function calculateVAT(input) {
    let total = parseInt(input.value.replace(/[^\d\-]/g, ''), 10);
    const supplyInput = document.getElementById('fast_supply') || document.getElementById('input_supply');
    const vatInput = document.getElementById('fast_vat') || document.getElementById('input_vat');
    
    if (!isNaN(total)) {
        let vat = Math.floor(total / 11);
        let supply = total - vat;
        if (supplyInput) supplyInput.value = supply.toLocaleString('ko-KR');
        if (vatInput) vatInput.value = vat.toLocaleString('ko-KR');
    } else {
        if (supplyInput) supplyInput.value = '';
        if (vatInput) vatInput.value = '';
    }
}

function calculateFromSupply(input) {
    let supply = parseInt(input.value.replace(/[^\d\-]/g, ''), 10);
    const totalInput = document.getElementById('fast_total') || document.getElementById('input_total');
    const vatInput = document.getElementById('fast_vat') || document.getElementById('input_vat');
    
    if (!isNaN(supply)) {
        let vat = Math.floor(supply * 0.1);
        let total = supply + vat;
        if (totalInput) totalInput.value = total.toLocaleString('ko-KR');
        if (vatInput) vatInput.value = vat.toLocaleString('ko-KR');
    } else {
        if (totalInput) totalInput.value = '';
        if (vatInput) vatInput.value = '';
    }
}

function calculateSatisfaction() {
    const countInput = document.querySelector('input[data-key="만족도조사_건수"]');
    const totalInput = document.querySelector('input[data-key="만족도조사_총점"]');
    const avgInput = document.querySelector('input[data-key="만족도조사_평점"]');
    if (countInput && totalInput && avgInput) {
        let count = parseFloat(countInput.value) || 0;
        let total = parseFloat(totalInput.value) || 0;
        avgInput.value = count > 0 ? parseFloat((total / count).toFixed(1)) : "0";
    }
}

function calculateRate(prefix) {
    const totalInput = document.querySelector(`input[data-key="${prefix}_총대상수"]`);
    const doneInput = document.querySelector(`input[data-key="${prefix}_완료수"]`);
    const rateInput = document.querySelector(`input[data-key="${prefix}_달성률"]`);
    if (totalInput && doneInput && rateInput) {
        let total = parseFloat(totalInput.value) || 0;
        let done = parseFloat(doneInput.value) || 0;
        rateInput.value = total > 0 ? parseFloat(((done / total) * 100).toFixed(1)) : "100";
    }
}

// === 공통 표 데이터 복사 단축키 (Ctrl+C) ===
document.addEventListener('keydown', async function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        const selectedRows = document.querySelectorAll('.preview-table-container tbody tr.selected-row');
        if (selectedRows.length > 0 && window.getSelection().toString() === '') {
            e.preventDefault();
            const lines = Array.from(selectedRows).map(row => Array.from(row.cells).map(td => td.innerText).join('\t'));
            try {
                await navigator.clipboard.writeText(lines.join('\n'));
                showToast(`✅ ${selectedRows.length}개의 행이 복사되었습니다. (엑셀에 붙여넣기 가능)`);
            } catch (err) { console.error('복사 실패:', err); }
        }
    }
});