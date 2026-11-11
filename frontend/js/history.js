// 산책 이력(완료된 약속) 화면 로직
let blockedUserIdSet = new Set();

function getOtherUserId(requestItem, myUserId) {
  return requestItem.fromUserId === myUserId ? requestItem.toUserId : requestItem.fromUserId;
}

async function loadBlockedUsers() {
  const blockList = await api.get('/blocks/mine');
  blockedUserIdSet = new Set(blockList.map((item) => item.blockedUserId));
}

function renderHistoryCard(item, myUserId) {
  const isSentByMe = item.fromUserId === myUserId;
  const otherName = isSentByMe ? item.toUser?.name : item.fromUser?.name;
  const otherPetName = isSentByMe ? item.toPet?.name : item.fromPet?.name;
  const otherUserId = getOtherUserId(item, myUserId);
  const isBlocked = blockedUserIdSet.has(otherUserId);
  const reviewedDate = item.review ? new Date(item.review.timestamp).toLocaleDateString('ko-KR') : '';

  // 내가 남긴 후기가 2점 이하일 때만 '다시 만나지 않기' 표시
  const myLowRatingReview = item.review
    && item.review.reviewedBy === myUserId
    && Number(item.review.rating) <= 2;

  let blockActionHtml = '';

  if (isBlocked) {
    blockActionHtml = `
      <button type="button" class="history_unblock_btn" data-blocked-user-id="${otherUserId}">
        제외 해제
      </button>
    `;
  } else if (myLowRatingReview) {
    blockActionHtml = `
      <button type="button" class="history_block_btn" data-blocked-user-id="${otherUserId}" data-request-id="${item.id}">
        다시 만나지 않기
      </button>
    `;
  }

  return `
    <li class="card history_card">
      <div class="history_card_top">
        <p class="history_card_title">${otherName || '알수없음'}님 · ${otherPetName || ''}</p>
        <div class="history_card_badges">
          ${isBlocked ? '<span class="history_block_badge">매칭 제외</span>' : ''}
          <span class="status_badge status_completed">완료</span>
        </div>
      </div>
      <p class="history_card_meta">🕓 ${item.timeSlot} · 📍 ${item.place}${reviewedDate ? ` · ${reviewedDate}` : ''}</p>
      ${item.review ? `<p class="history_card_review">⭐ ${item.review.rating}점 · ${item.review.comment || '코멘트 없음'}</p>` : ''}
      ${blockActionHtml ? `<div class="history_card_actions">${blockActionHtml}</div>` : ''}
    </li>
  `;
}

async function loadHistoryList() {
  const listElement = document.querySelector('[data-history-list]');
  const myUserId = getCurrentUserId();

  try {
    await loadBlockedUsers();
    const requestList = await api.get('/requests');
    const completedList = requestList.filter((item) => item.status === 'completed');

    if (completedList.length === 0) {
      listElement.innerHTML = `
        <li class="empty_state">
          <p class="empty_state_icon">🕓</p>
          <p>아직 완료된 산책 기록이 없어요.</p>
        </li>
      `;
      return;
    }

    listElement.innerHTML = completedList.map((item) => renderHistoryCard(item, myUserId)).join('');
  } catch (error) {
    listElement.innerHTML = `<li class="form_error">${error.message}</li>`;
  }
}

function bindHistoryActions() {
  const listElement = document.querySelector('[data-history-list]');
  if (!listElement) {
    return;
  }

  listElement.addEventListener('click', async (event) => {
    const blockButton = event.target.closest('.history_block_btn');
    const unblockButton = event.target.closest('.history_unblock_btn');

    if (blockButton) {
      const blockedUserId = blockButton.dataset.blockedUserId;
      const requestId = blockButton.dataset.requestId;

      if (!window.confirm('이 상대를 다시 만나지 않을까요?\nAI 매칭과 요청에서 제외됩니다.')) {
        return;
      }

      try {
        blockButton.disabled = true;
        await api.post('/blocks', { blockedUserId, requestId });
        blockedUserIdSet.add(blockedUserId);
        await loadHistoryList();
      } catch (error) {
        window.alert(error.message);
        blockButton.disabled = false;
      }
      return;
    }

    if (unblockButton) {
      const blockedUserId = unblockButton.dataset.blockedUserId;

      if (!window.confirm('매칭 제외를 해제할까요?\n다시 AI 매칭과 요청에서 만날 수 있어요.')) {
        return;
      }

      try {
        unblockButton.disabled = true;
        await api.delete(`/blocks/user/${blockedUserId}`);
        blockedUserIdSet.delete(blockedUserId);
        await loadHistoryList();
      } catch (error) {
        window.alert(error.message);
        unblockButton.disabled = false;
      }
    }
  });
}

if (requireLogin()) {
  bindHistoryActions();
  loadHistoryList();
}
