// 산책 진행 화면 로직 (상태 버튼 + 인증 + 후기)
const STATUS_LABEL_MAP = {
  pending: '대기중',
  accepted: '수락됨',
  rejected: '거절됨',
  cancelled: '취소됨',
  completed: '완료',
};

let currentRequestId = null;

function initWalkPage() {
  currentRequestId = new URLSearchParams(window.location.search).get('id');

  if (!currentRequestId) {
    document.querySelector('[data-walk-summary]').innerHTML = `<p class="form_error">잘못된 접근입니다.</p>`;
    return;
  }

  bindStatusButtons();
  bindReviewForm();
  refreshWalkDetail();
}

async function refreshWalkDetail() {
  try {
    const detail = await api.get(`/requests/${currentRequestId}`);
    renderSummary(detail);
    renderStatusSection(detail);
    renderCertifySection(detail);
    renderReviewSection(detail);
  } catch (error) {
    document.querySelector('[data-walk-summary]').innerHTML = `<p class="form_error">${error.message}</p>`;
  }
}

function renderSummary(detail) {
  const myUserId = getCurrentUserId();
  const isSentByMe = detail.fromUserId === myUserId;
  const otherName = isSentByMe ? detail.toUser?.name : detail.fromUser?.name;
  const otherPetName = isSentByMe ? detail.toPet?.name : detail.fromPet?.name;

  document.querySelector('[data-walk-summary]').innerHTML = `
    <p class="request_card_title">${otherName || '알수없음'}님 · ${otherPetName || ''}</p>
    <p class="request_card_meta">🕓 ${detail.timeSlot} · 📍 ${detail.place}</p>
    <span class="status_badge status_${detail.status}">${STATUS_LABEL_MAP[detail.status]}</span>
    ${detail.status === 'cancelled' && detail.cancelInfo
      ? `<p class="request_cancel_reason">취소 사유: ${detail.cancelInfo.reason}${detail.cancelInfo.note ? ` · ${detail.cancelInfo.note}` : ''}</p>`
      : ''}
    ${detail.status === 'rejected' && detail.rejectInfo
      ? `<p class="request_reject_reason">거절 사유: ${detail.rejectInfo.reason}${detail.rejectInfo.note ? ` · ${detail.rejectInfo.note}` : ''}</p>`
      : ''}
  `;
}

function formatStatusLogText(log) {
  if (log.message === '취소할게요' && log.cancelReason) {
    return {
      title: '취소할게요',
      reason: `${log.cancelReason}${log.cancelNote ? ` · ${log.cancelNote}` : ''}`,
    };
  }

  return {
    title: log.message,
    reason: '',
  };
}

function renderStatusSection(detail) {
  const sectionElement = document.querySelector('[data-walk-status-section]');
  sectionElement.hidden = detail.status !== 'accepted';

  const logElement = document.querySelector('[data-status-log]');

  if (detail.statusLog.length === 0) {
    logElement.innerHTML = `<li class="status_log_empty">아직 전달된 상태가 없어요.</li>`;
    return;
  }

  logElement.innerHTML = detail.statusLog
    .slice()
    .reverse()
    .map((log) => {
      const time = new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const logText = formatStatusLogText(log);

      return `
        <li>
          🔔 ${time} · ${logText.title}
          ${logText.reason ? `<span class="status_log_reason">${logText.reason}</span>` : ''}
        </li>
      `;
    })
    .join('');
}

function renderCertifySection(detail) {
  const sectionElement = document.querySelector('[data-certify-section]');
  const labelElement = sectionElement.querySelector('[data-certify-label]');
  const buttonElement = sectionElement.querySelector('[data-certify-button]');
  const errorElement = sectionElement.querySelector('[data-certify-error]');

  errorElement.hidden = true;
  renderCertifyPhotos(detail);

  if (detail.status !== 'accepted') {
    sectionElement.hidden = true;
    return;
  }

  if (detail.walkPhase === 'not_started') {
    sectionElement.hidden = false;
    labelElement.textContent = '만나서 산책을 시작했다면 인증 사진을 촬영해주세요.';
    buttonElement.textContent = '📸 산책 시작 인증 촬영';
    buttonElement.dataset.phase = 'start';
    buttonElement.disabled = false;
  } else if (detail.walkPhase === 'started') {
    sectionElement.hidden = false;
    labelElement.textContent = '산책이 끝났다면 종료 인증 사진을 촬영해주세요.';
    buttonElement.textContent = '📸 산책 종료 인증 촬영';
    buttonElement.dataset.phase = 'end';
    buttonElement.disabled = false;
  } else {
    sectionElement.hidden = true;
  }
}

function renderCertifyPhotos(detail) {
  const galleryElement = document.querySelector('[data-certify-gallery]');
  const startWrapElement = document.querySelector('[data-certify-start-wrap]');
  const endWrapElement = document.querySelector('[data-certify-end-wrap]');
  const startImageElement = document.querySelector('[data-certify-start-image]');
  const endImageElement = document.querySelector('[data-certify-end-image]');
  const certifyPhotos = detail.certifyPhotos || {};

  const hasStartPhoto = Boolean(certifyPhotos.start && certifyPhotos.start.dataUrl);
  const hasEndPhoto = Boolean(certifyPhotos.end && certifyPhotos.end.dataUrl);

  if (!hasStartPhoto && !hasEndPhoto) {
    galleryElement.hidden = true;
    startWrapElement.hidden = true;
    endWrapElement.hidden = true;
    return;
  }

  galleryElement.hidden = false;

  if (hasStartPhoto) {
    startWrapElement.hidden = false;
    startImageElement.src = certifyPhotos.start.dataUrl;
  } else {
    startWrapElement.hidden = true;
    startImageElement.removeAttribute('src');
  }

  if (hasEndPhoto) {
    endWrapElement.hidden = false;
    endImageElement.src = certifyPhotos.end.dataUrl;
  } else {
    endWrapElement.hidden = true;
    endImageElement.removeAttribute('src');
  }
}

function renderReviewSection(detail) {
  const reviewSectionElement = document.querySelector('[data-review-section]');
  const reviewResultElement = document.querySelector('[data-review-result]');

  if (detail.status === 'completed' && detail.review) {
    reviewSectionElement.hidden = true;
    reviewResultElement.hidden = false;
    reviewResultElement.innerHTML = `
      <p>후기를 남겨주셔서 감사해요! 🐾</p>
      <p>⭐ ${detail.review.rating}점 · ${detail.review.comment || '코멘트 없음'}</p>
    `;
    return;
  }

  reviewResultElement.hidden = true;
  reviewSectionElement.hidden = !(detail.status === 'accepted' && detail.walkPhase === 'ended');
}

function bindStatusButtons() {
  document.querySelectorAll('[data-status-message]').forEach((buttonElement) => {
    buttonElement.addEventListener('click', async () => {
      const statusMessage = buttonElement.dataset.statusMessage;

      try {
        if (statusMessage === '취소할게요') {
          const cancelPayload = await window.openCancelReasonDialog();
          if (!cancelPayload) {
            return;
          }

          await api.post(`/requests/${currentRequestId}/status-messages`, {
            message: statusMessage,
            cancelReason: cancelPayload.reason,
            cancelNote: cancelPayload.note,
          });
        } else {
          await api.post(`/requests/${currentRequestId}/status-messages`, { message: statusMessage });
        }

        showToast(statusMessage === '취소할게요' ? '약속을 취소했어요.' : '상태를 전달했어요.');
        refreshWalkDetail();
      } catch (error) {
        showToast(error.message);
      }
    });
  });

  document.querySelector('[data-certify-button]').addEventListener('click', async (event) => {
    const buttonElement = event.currentTarget;
    const phase = buttonElement.dataset.phase;
    const errorElement = document.querySelector('[data-certify-error]');
    errorElement.hidden = true;

    if (!window.walkCameraHelper) {
      errorElement.textContent = '카메라 기능을 불러오지 못했습니다.';
      errorElement.hidden = false;
      return;
    }

    buttonElement.disabled = true;
    const originalLabel = buttonElement.textContent;
    buttonElement.textContent = '카메라 여는 중...';

    try {
      const photoDataUrl = await window.walkCameraHelper.captureWalkCertifyPhoto();
      buttonElement.textContent = '인증 저장 중...';

      await api.post(`/requests/${currentRequestId}/certify`, { phase, photoDataUrl });
      showToast(phase === 'start' ? '산책 시작 인증이 완료되었어요.' : '산책 종료 인증이 완료되었어요.');
      await refreshWalkDetail();
    } catch (error) {
      buttonElement.textContent = originalLabel;

      if (error.message !== '사진 촬영이 취소되었습니다.') {
        errorElement.textContent = error.message;
        errorElement.hidden = false;
      }
    } finally {
      buttonElement.disabled = false;
    }
  });
}

function bindReviewForm() {
  const ratingGroupElement = document.querySelector('[data-rating-group]');

  ratingGroupElement.querySelectorAll('[data-rating]').forEach((chipElement) => {
    chipElement.addEventListener('click', () => {
      ratingGroupElement.querySelectorAll('[data-rating]').forEach((item) => item.classList.remove('is_selected'));
      chipElement.classList.add('is_selected');
    });
  });

  document.querySelector('[data-review-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorElement = document.querySelector('[data-review-error]');
    errorElement.hidden = true;

    const selectedRating = ratingGroupElement.querySelector('.is_selected')?.dataset.rating;

    if (!selectedRating) {
      errorElement.textContent = '별점을 선택해주세요.';
      errorElement.hidden = false;
      return;
    }

    const comment = new FormData(event.target).get('comment');

    try {
      await api.post(`/requests/${currentRequestId}/review`, { rating: Number(selectedRating), comment });
      showToast('후기를 남겼어요. 산책 완료!');
      refreshWalkDetail();
    } catch (error) {
      errorElement.textContent = error.message;
      errorElement.hidden = false;
    }
  });
}

// 모든 함수/변수 선언이 끝난 뒤에 초기화를 실행해야 TDZ(선언 전 접근) 오류가 발생하지 않음
if (requireLogin()) {
  initWalkPage();
}
