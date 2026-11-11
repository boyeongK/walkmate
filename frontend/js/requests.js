// 내 요청 목록(받은 요청/보낸 요청) 화면 로직
const STATUS_LABEL = {
  pending: '대기중',
  accepted: '수락됨',
  rejected: '거절됨',
  cancelled: '취소됨',
  completed: '완료',
};

async function loadRequestList() {
  const receivedListElement = document.querySelector('[data-received-list]');
  const sentListElement = document.querySelector('[data-sent-list]');
  const receivedCountElement = document.querySelector('[data-received-count]');
  const sentCountElement = document.querySelector('[data-sent-count]');
  const myUserId = getCurrentUserId();

  try {
    const requestList = await api.get('/requests');
    // 완료된 약속은 이력 탭에서만 보여줌
    const activeList = requestList.filter((item) => item.status !== 'completed');

    const receivedList = activeList.filter((item) => item.toUserId === myUserId);
    const sentList = activeList.filter((item) => item.fromUserId === myUserId);

    receivedCountElement.textContent = String(receivedList.length);
    sentCountElement.textContent = String(sentList.length);

    receivedListElement.innerHTML = renderRequestSection(receivedList, myUserId, 'received');
    sentListElement.innerHTML = renderRequestSection(sentList, myUserId, 'sent');

    bindRequestActions(receivedListElement);
    bindRequestActions(sentListElement);
  } catch (error) {
    const errorHtml = `<li class="form_error">${error.message}</li>`;
    receivedListElement.innerHTML = errorHtml;
    sentListElement.innerHTML = '';
    receivedCountElement.textContent = '0';
    sentCountElement.textContent = '0';
  }
}

function renderRequestSection(list, myUserId, sectionType) {
  if (list.length === 0) {
    const emptyMessage = sectionType === 'received'
      ? '아직 받은 요청이 없어요.'
      : '아직 보낸 요청이 없어요.';

    return `
      <li class="empty_state request_empty_state">
        <p class="empty_state_icon">${sectionType === 'received' ? '📥' : '📤'}</p>
        <p>${emptyMessage}</p>
      </li>
    `;
  }

  return list.map((item) => renderRequestCard(item, myUserId)).join('');
}

function renderResponseReasonMeta(item) {
  if (item.status === 'cancelled' && item.cancelInfo) {
    const noteText = item.cancelInfo.note ? ` · ${item.cancelInfo.note}` : '';
    return `<p class="request_cancel_reason">취소 사유: ${item.cancelInfo.reason}${noteText}</p>`;
  }

  if (item.status === 'rejected' && item.rejectInfo) {
    const noteText = item.rejectInfo.note ? ` · ${item.rejectInfo.note}` : '';
    return `<p class="request_reject_reason">거절 사유: ${item.rejectInfo.reason}${noteText}</p>`;
  }

  return '';
}

function renderRequestCard(item, myUserId) {
  const isSentByMe = item.fromUserId === myUserId;
  const otherName = isSentByMe ? item.toUser?.name : item.fromUser?.name;
  const otherPetName = isSentByMe ? item.toPet?.name : item.fromPet?.name;

  return `
    <li class="card request_card" data-request-id="${item.id}">
      <div class="request_card_top">
        <div>
          <p class="request_card_title">${otherName || '알수없음'}님 · ${otherPetName || ''}</p>
        </div>
        <span class="status_badge status_${item.status}">${STATUS_LABEL[item.status]}</span>
      </div>
      <p class="request_card_meta">🕓 ${item.timeSlot} · 📍 ${item.place}</p>
      ${renderResponseReasonMeta(item)}
      <div class="request_card_actions" data-request-actions>
        ${renderRequestActions(item, isSentByMe)}
      </div>
    </li>
  `;
}

function renderRequestActions(item, isSentByMe) {
  if (item.status === 'pending' && !isSentByMe) {
    return `
      <button type="button" class="request_action_primary" data-action="accept" data-id="${item.id}">수락하기</button>
      <button type="button" class="request_action_danger" data-action="reject" data-id="${item.id}">거절하기</button>
    `;
  }

  if (item.status === 'pending' && isSentByMe) {
    return `<button type="button" class="request_action_danger" data-action="cancel" data-id="${item.id}">요청 취소</button>`;
  }

  if (item.status === 'accepted') {
    return `<a class="request_action_primary" href="walk.html?id=${item.id}">산책 페이지로 이동</a>`;
  }

  if (item.status === 'completed' && item.review) {
    return `<span class="request_card_meta">⭐ ${item.review.rating}점 · ${item.review.comment || '후기 없음'}</span>`;
  }

  return '';
}

function bindRequestActions(listElement) {
  listElement.querySelectorAll('[data-action="accept"]').forEach((buttonElement) => {
    buttonElement.addEventListener('click', async () => {
      const requestId = buttonElement.dataset.id;

      try {
        await api.patch(`/requests/${requestId}/respond`, { action: 'accept' });
        showToast('요청을 수락했어요.');
        loadRequestList();
      } catch (error) {
        showToast(error.message);
      }
    });
  });

  listElement.querySelectorAll('[data-action="reject"]').forEach((buttonElement) => {
    buttonElement.addEventListener('click', async () => {
      const requestId = buttonElement.dataset.id;
      const rejectPayload = await window.openRejectReasonDialog();

      if (!rejectPayload) {
        return;
      }

      try {
        await api.patch(`/requests/${requestId}/respond`, {
          action: 'reject',
          rejectReason: rejectPayload.reason,
          rejectNote: rejectPayload.note,
        });
        showToast('요청을 거절했어요.');
        loadRequestList();
      } catch (error) {
        showToast(error.message);
      }
    });
  });

  listElement.querySelectorAll('[data-action="cancel"]').forEach((buttonElement) => {
    buttonElement.addEventListener('click', async () => {
      const requestId = buttonElement.dataset.id;
      const cancelPayload = await window.openCancelReasonDialog();

      if (!cancelPayload) {
        return;
      }

      try {
        await api.post(`/requests/${requestId}/status-messages`, {
          message: '취소할게요',
          cancelReason: cancelPayload.reason,
          cancelNote: cancelPayload.note,
        });
        showToast('요청을 취소했어요.');
        loadRequestList();
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}

// 모든 함수/변수 선언이 끝난 뒤에 초기화를 실행해야 TDZ(선언 전 접근) 오류가 발생하지 않음
if (requireLogin()) {
  loadRequestList();
}
