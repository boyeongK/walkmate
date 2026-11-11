// 산책/요청 취소·거절 시 사유를 선택·입력하는 다이얼로그
(function () {
  const REASON_OPTIONS = [
    '일정이 갑자기 바뀌었어요',
    '반려동물 컨디션이 좋지 않아요',
    '날씨/기온 때문에 어려워요',
    '다른 약속과 겹쳤어요',
    '기타 (직접 입력)',
  ];
  const CUSTOM_REASON_VALUE = '기타 (직접 입력)';

  const DIALOG_CONFIG = {
    cancel: {
      title: '취소 사유를 알려주세요',
      desc: '상대가 오해하지 않도록 간단한 이유를 남겨주세요.',
      submitLabel: '취소하기',
      selectError: '취소 사유를 선택해주세요.',
      inputError: '취소 사유를 입력해주세요.',
      customLabel: '직접 입력',
      customPlaceholder: '취소 사유를 입력해주세요',
    },
    reject: {
      title: '거절 사유를 알려주세요',
      desc: '상대가 오해하지 않도록 간단한 이유를 남겨주세요.',
      submitLabel: '거절하기',
      selectError: '거절 사유를 선택해주세요.',
      inputError: '거절 사유를 입력해주세요.',
      customLabel: '직접 입력',
      customPlaceholder: '거절 사유를 입력해주세요',
    },
  };

  let dialogElement = null;
  let titleElement = null;
  let descElement = null;
  let reasonGroupElement = null;
  let noteTextareaElement = null;
  let customReasonGroupElement = null;
  let customReasonLabelElement = null;
  let customReasonTextareaElement = null;
  let errorElement = null;
  let submitButtonElement = null;
  let resolveDialog = null;
  let currentDialogType = 'cancel';
  let currentConfig = DIALOG_CONFIG.cancel;

  function ensureDialog() {
    if (dialogElement) {
      return;
    }

    dialogElement = document.createElement('div');
    dialogElement.className = 'cancel_dialog_overlay';
    dialogElement.hidden = true;
    dialogElement.innerHTML = `
      <div class="cancel_dialog_panel" role="dialog" aria-modal="true" aria-labelledby="request_reason_dialog_title">
        <p class="cancel_dialog_title" id="request_reason_dialog_title" data-reason-dialog-title></p>
        <p class="cancel_dialog_desc" data-reason-dialog-desc></p>
        <div class="cancel_dialog_reason_group chip_select_group" data-reason-dialog-group></div>
        <div class="form_group cancel_dialog_note_group" data-custom-reason-group hidden>
          <label class="form_label" for="request_custom_reason" data-custom-reason-label>직접 입력</label>
          <textarea class="form_textarea" id="request_custom_reason" data-custom-reason-input placeholder="사유를 입력해주세요" maxlength="120"></textarea>
        </div>
        <div class="form_group cancel_dialog_note_group">
          <label class="form_label" for="request_reason_note">추가로 전할 말 (선택)</label>
          <textarea class="form_textarea" id="request_reason_note" data-reason-note-input placeholder="예) 다음에 다시 만나요" maxlength="120"></textarea>
        </div>
        <p class="form_error" data-reason-dialog-error hidden></p>
        <div class="cancel_dialog_actions">
          <button type="button" class="cancel_dialog_submit" data-reason-dialog-submit></button>
          <button type="button" class="cancel_dialog_close" data-reason-dialog-close>닫기</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialogElement);

    titleElement = dialogElement.querySelector('[data-reason-dialog-title]');
    descElement = dialogElement.querySelector('[data-reason-dialog-desc]');
    reasonGroupElement = dialogElement.querySelector('[data-reason-dialog-group]');
    noteTextareaElement = dialogElement.querySelector('[data-reason-note-input]');
    customReasonGroupElement = dialogElement.querySelector('[data-custom-reason-group]');
    customReasonLabelElement = dialogElement.querySelector('[data-custom-reason-label]');
    customReasonTextareaElement = dialogElement.querySelector('[data-custom-reason-input]');
    errorElement = dialogElement.querySelector('[data-reason-dialog-error]');
    submitButtonElement = dialogElement.querySelector('[data-reason-dialog-submit]');

    reasonGroupElement.innerHTML = REASON_OPTIONS.map((reason) => (
      `<button type="button" class="chip_select_option" data-reason-option="${reason}">${reason}</button>`
    )).join('');

    reasonGroupElement.addEventListener('click', (event) => {
      const chipElement = event.target.closest('[data-reason-option]');
      if (!chipElement) {
        return;
      }

      reasonGroupElement.querySelectorAll('[data-reason-option]').forEach((item) => {
        item.classList.remove('is_selected');
      });
      chipElement.classList.add('is_selected');

      const isCustomReason = chipElement.dataset.reasonOption === CUSTOM_REASON_VALUE;
      customReasonGroupElement.hidden = !isCustomReason;

      if (!isCustomReason) {
        customReasonTextareaElement.value = '';
      }

      hideError();
    });

    dialogElement.querySelector('[data-reason-dialog-close]').addEventListener('click', () => {
      closeDialog(null);
    });

    dialogElement.addEventListener('click', (event) => {
      if (event.target === dialogElement) {
        closeDialog(null);
      }
    });

    submitButtonElement.addEventListener('click', () => {
      const selectedReasonElement = reasonGroupElement.querySelector('.is_selected');
      if (!selectedReasonElement) {
        showError(currentConfig.selectError);
        return;
      }

      const selectedReason = selectedReasonElement.dataset.reasonOption;
      let reason = selectedReason;
      const note = noteTextareaElement.value.trim();

      if (selectedReason === CUSTOM_REASON_VALUE) {
        reason = customReasonTextareaElement.value.trim();
        if (!reason) {
          showError(currentConfig.inputError);
          return;
        }
      }

      closeDialog({ reason, note });
    });
  }

  function applyDialogConfig(dialogType) {
    currentDialogType = dialogType;
    currentConfig = DIALOG_CONFIG[dialogType] || DIALOG_CONFIG.cancel;

    titleElement.textContent = currentConfig.title;
    descElement.textContent = currentConfig.desc;
    submitButtonElement.textContent = currentConfig.submitLabel;
    customReasonLabelElement.textContent = currentConfig.customLabel;
    customReasonTextareaElement.placeholder = currentConfig.customPlaceholder;
  }

  function showError(message) {
    errorElement.textContent = message;
    errorElement.hidden = false;
  }

  function hideError() {
    errorElement.hidden = true;
    errorElement.textContent = '';
  }

  function resetDialog() {
    reasonGroupElement.querySelectorAll('[data-reason-option]').forEach((item) => {
      item.classList.remove('is_selected');
    });
    noteTextareaElement.value = '';
    customReasonTextareaElement.value = '';
    customReasonGroupElement.hidden = true;
    hideError();
  }

  function closeDialog(result) {
    dialogElement.hidden = true;
    document.body.style.overflow = '';

    if (resolveDialog) {
      resolveDialog(result);
      resolveDialog = null;
    }
  }

  function openRequestReasonDialog(dialogType) {
    ensureDialog();
    applyDialogConfig(dialogType);
    resetDialog();

    return new Promise((resolve) => {
      resolveDialog = resolve;
      dialogElement.hidden = false;
      document.body.style.overflow = 'hidden';
    });
  }

  window.openRequestReasonDialog = openRequestReasonDialog;
  window.openCancelReasonDialog = () => openRequestReasonDialog('cancel');
  window.openRejectReasonDialog = () => openRequestReasonDialog('reject');
})();
