// 산책 요청(선택형 제안) 화면 로직
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function initRequestPage() {
  const toUserId = getQueryParam('toUserId');
  const toPetId = getQueryParam('toPetId');
  const summaryElement = document.querySelector('[data-target-summary]');

  if (!toUserId) {
    summaryElement.innerHTML = `<p class="form_error">요청 대상을 찾을 수 없습니다.</p>`;
    return;
  }

  let targetPetId = toPetId || '';

  try {
    const targetUserPromise = api.get('/users').then((users) => users.find((user) => user.id === toUserId));
    const targetPetPromise = toPetId
      ? api.get(`/pets/by-id/${toPetId}`)
      : api.get(`/pets/user/${toUserId}`);

    const [targetUser, targetPet] = await Promise.all([targetUserPromise, targetPetPromise]);

    if (!targetPet) {
      throw new Error('요청 대상 반려동물을 찾을 수 없습니다.');
    }

    targetPetId = targetPet.id;

    summaryElement.innerHTML = `
      ${renderPetAvatarHtml(targetPet, 'request_target_avatar')}
      <div class="request_target_info">
        <p class="request_target_name">${targetPet.name}</p>
        <p class="request_target_breed">${targetPet.breed}</p>
        <p class="request_target_meta">${targetUser ? targetUser.name : '보호자'}님에게 요청을 보냅니다</p>
      </div>
    `;
  } catch (error) {
    summaryElement.innerHTML = `<p class="form_error">${error.message}</p>`;
    return;
  }

  setupSelectableChips();
  setupFormSubmit(toUserId, targetPetId);
}

function setupSelectableChips() {
  ['[data-time-group]', '[data-place-group]'].forEach((groupSelector) => {
    const groupElement = document.querySelector(groupSelector);

    groupElement.querySelectorAll('.chip_select_option').forEach((chipElement) => {
      chipElement.addEventListener('click', () => {
        groupElement.querySelectorAll('.chip_select_option').forEach((item) => item.classList.remove('is_selected'));
        chipElement.classList.add('is_selected');
      });
    });
  });
}

function setupFormSubmit(toUserId, toPetId) {
  const formElement = document.querySelector('[data-request-form]');
  const errorElement = document.querySelector('[data-error-message]');

  formElement.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorElement.hidden = true;

    const selectedTime = document.querySelector('[data-time-group] .is_selected')?.dataset.time;
    const selectedPlace = document.querySelector('[data-place-group] .is_selected')?.dataset.place;

    if (!selectedTime || !selectedPlace) {
      errorElement.textContent = '시간대와 장소를 모두 선택해주세요.';
      errorElement.hidden = false;
      return;
    }

    if (!toPetId) {
      errorElement.textContent = '요청 대상 반려동물 정보가 없습니다.';
      errorElement.hidden = false;
      return;
    }

    try {
      await api.post('/requests', {
        toUserId,
        toPetId,
        timeSlot: selectedTime,
        place: selectedPlace,
      });
      window.location.href = 'requests.html';
    } catch (error) {
      errorElement.textContent = error.message;
      errorElement.hidden = false;
    }
  });
}

if (requireLogin()) {
  initRequestPage();
}
