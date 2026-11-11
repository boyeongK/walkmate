// 반려동물 프로필 사진 UI 공통 헬퍼
function renderPetAvatarHtml(pet, avatarClassName) {
  const petName = pet && pet.name ? pet.name : '반려동물';

  if (pet && pet.photoDataUrl) {
    return `<img class="${avatarClassName} pet_avatar_photo" src="${pet.photoDataUrl}" alt="${petName} 프로필 사진" />`;
  }

  return `<span class="${avatarClassName} pet_avatar_placeholder" aria-hidden="true">🐕</span>`;
}

function mountPetAvatarElement(containerElement, pet, avatarClassName) {
  if (!containerElement) {
    return;
  }

  containerElement.innerHTML = renderPetAvatarHtml(pet, avatarClassName);
}

// 내 반려동물 요약 카드 (홈·AI매칭 공통)
function renderMyPetEditGearLinkHtml() {
  return `
    <a class="my_pet_edit_gear_link" href="profile.html" aria-label="프로필 수정">
      <svg class="my_pet_edit_gear_icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" stroke-width="1.8"/>
        <path d="M19.3 13.1a7.3 7.3 0 0 0 .1-2.2l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-1.9-1.1L15 3h-4l-.2 2.8a7.5 7.5 0 0 0-1.9 1.1l-2.4-1-2 3.5 2 1.5a7.3 7.3 0 0 0 0 2.2l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 0 0 1.9 1.1L11 21h4l.2-2.8a7.5 7.5 0 0 0 1.9-1.1l2.4 1 2-3.5-2-1.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
    </a>
  `;
}

function mountMyPetSummaryElement(summaryElement, pet, options) {
  if (!summaryElement || !pet) {
    return;
  }

  const settings = options || {};
  const useGearEdit = settings.editStyle === 'gear';
  const maxVisibleTags = 8;
  const visibleTags = Array.isArray(pet.tags) ? pet.tags.slice(0, maxVisibleTags) : [];
  const hiddenTagCount = Array.isArray(pet.tags) ? pet.tags.length - visibleTags.length : 0;

  const nameBlockHtml = useGearEdit
    ? `
      <div class="my_pet_name_row">
        <p class="my_pet_name">${pet.name}</p>
        ${renderMyPetEditGearLinkHtml()}
      </div>
    `
    : `<p class="my_pet_name">${pet.name}</p>`;

  const editButtonHtml = useGearEdit
    ? ''
    : `<a class="btn_outline btn_small my_pet_edit_link" href="profile.html">수정</a>`;

  summaryElement.hidden = false;
  summaryElement.innerHTML = `
    <div class="my_pet_summary_top">
      <div class="my_pet_summary_avatar">${renderPetAvatarHtml(pet, 'my_pet_avatar')}</div>
      <div class="my_pet_info">
        ${nameBlockHtml}
        <p class="my_pet_breed">${pet.breed}</p>
      </div>
      ${editButtonHtml}
    </div>
    <div class="my_pet_summary_meta">
      <span class="tag_chip tag_chip_meta">${pet.size}</span>
      <span class="tag_chip tag_chip_meta">활동량 ${pet.energyLevel}</span>
    </div>
    <div class="my_pet_summary_tags">
      ${visibleTags.map((tagValue) => `<span class="tag_chip">${tagValue}</span>`).join('')}
      ${hiddenTagCount > 0 ? `<span class="tag_chip tag_chip_more">+${hiddenTagCount}</span>` : ''}
    </div>
  `;
}

// 현재 계정의 활성 반려동물 ID를 보정하고 반려동물 정보 반환
async function ensureActivePetForCurrentUser() {
  try {
    const petList = await api.get('/pets/mine');
    if (petList.length === 0) {
      return null;
    }

    const activePetId = getActivePetId();
    const hasValidActivePet = petList.some((pet) => pet.id === activePetId);

    if (!hasValidActivePet) {
      setActivePetId(petList[0].id);
    }

    return api.get('/pets/me');
  } catch (error) {
    return null;
  }
}

// 여러 반려동물 전환 바 (홈·프로필·AI매칭 공통)
async function mountPetSwitcherBar(containerElement, options) {
  if (!containerElement) {
    return;
  }

  const settings = options || {};
  let petList = [];

  try {
    petList = await api.get('/pets/mine');
  } catch (error) {
    containerElement.hidden = true;
    return;
  }

  if (petList.length === 0) {
    containerElement.hidden = true;
    return;
  }

  if (petList.length <= 1 && settings.showWhenSingle !== true) {
    containerElement.hidden = true;
    return;
  }

  const activePetId = getActivePetId() || petList[0].id;

  containerElement.hidden = false;
  containerElement.innerHTML = `
    <p class="pet_switcher_label">${settings.label || '산책 나갈 반려동물'}</p>
    <div class="pet_switcher_list">
      ${petList.map((pet) => `
        <button type="button" class="pet_switcher_item ${pet.id === activePetId ? 'is_active' : ''}" data-pet-id="${pet.id}">
          ${renderPetAvatarHtml(pet, 'pet_switcher_avatar')}
          <span class="pet_switcher_name">${pet.name}</span>
        </button>
      `).join('')}
      ${settings.showAddButton === false ? '' : `
        <a class="pet_switcher_item pet_switcher_add" href="profile.html?mode=new">
          <span class="pet_switcher_add_icon" aria-hidden="true">
            <svg class="pet_switcher_add_svg" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="pet_switcher_name">추가</span>
        </a>
      `}
    </div>
  `;

  containerElement.querySelectorAll('[data-pet-id]').forEach((buttonElement) => {
    buttonElement.addEventListener('click', () => {
      const nextPetId = buttonElement.dataset.petId;
      if (nextPetId === getActivePetId()) {
        return;
      }

      setActivePetId(nextPetId);

      if (typeof settings.onSwitch === 'function') {
        settings.onSwitch(nextPetId);
        return;
      }

      window.location.reload();
    });
  });
}
