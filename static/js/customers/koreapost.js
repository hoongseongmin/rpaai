window.RPA_CUSTOMERS = window.RPA_CUSTOMERS || {};

window.RPA_CUSTOMERS['koreapost'] = {
    monthOffset: -1, // 전월 기준
    tasks: [
        { id: 'koreapost_1', op: 'doc_official', title: '1. 📝 이전설치 공문 (Word)', date: '매월 5일' },
        { id: 'koreapost_2', op: 'doc_official', title: '2. 📝 이행실적 공문 (Word)', date: '매월 5일' },
        { id: 'koreapost_3', op: 'kp_task3', title: '3. 📊 이전실비 청구서 (Excel)', date: '매월 10일' },
        { id: 'koreapost_4', op: 'kp_task4', title: '4. 📊 유지보수료 청구서 (Excel)', date: '매월 10일' },
        { id: 'koreapost',   op: 'kp_task5', title: '5. 제증명 서류 3종 <br><span style="font-size: 0.85em; color: var(--text-light);">- 국세/지방세/4대보험</span>', date: '매월 10일' }
    ],
    
    renderOneclick: function(savedData) {
        return `
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
    },
    
    onOneclickRendered: function() {
        const totalInput = document.getElementById('fast_total');
        if (totalInput) calculateVAT(totalInput);
        calculateActualPayment();
        calculateClaimAmount('3');
        calculateClaimAmount('4');
    },

    getDashboardKeys: function(operation, customerId) {
        if (customerId === 'koreapost_1') return ['합계금액', '공급가액', '부가세'];
        if (customerId === 'koreapost_2') return ['월유지비용', '미사용차감수량', '미사용차감금액', '실지급액', '장애_적기처리건수', '장애_지연처리건수', '만족도조사_건수', '만족도조사_총점', '만족도조사_평점', '정기점검_총대상수', '정기점검_완료수', '정기점검_달성률', '이전설치_총대상수', '이전설치_완료수', '이전설치_달성률'];
        if (operation === 'kp_task3' || operation === 'kp_task4') return ['당초청구금액', '정산감액', '청구금액', '합계금액', '공급가액', '부가세'];
        return [];
    },

    renderDashboardInput: function(key, value, operation, customerId) {
        if (key === '월유지비용' && (customerId === 'koreapost_1' || customerId === 'koreapost_2')) {
            return `<input type="text" class="edit-input money-input" data-key="${key}" value="${value}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #f5f5f5; color: #888;" readonly>`;
        }
        if (key === '당초청구금액' && (operation === 'kp_task4' || operation === 'kp_task3')) {
            return `<input type="text" class="edit-input money-input" data-key="${key}" value="${value}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #f5f5f5; color: #888;" readonly>`;
        }
        if (key === '정산감액' && operation === 'kp_task3') {
            return `<input type="text" class="edit-input money-input" data-key="${key}" value="0" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-weight: bold; background-color: #f5f5f5; color: #888;" readonly>`;
        }
        return null;
    },

    onDashboardRendered: function(context, operation, customerId) {
        const totalInput = document.getElementById('input_total');
        if (totalInput) calculateVAT(totalInput);
        calculateClaimAmount();
        calculateActualPayment();
    }
};