// 반려동물 프로필 등록 화면 로직 (1보호자 : N반려동물)
function getProfileQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function initProfilePage() {
  const formElement = document.querySelector('[data-profile-form]');
  const tagGroupElement = document.querySelector('[data-tag-group]');
  const customTagInputElement = document.querySelector('[data-custom-tag-input]');
  const addTagButtonElement = document.querySelector('[data-add-tag-button]');
  const errorElement = document.querySelector('[data-error-message]');
  const headerTitleElement = document.querySelector('.header_title');
  const headerSubtitleElement = document.querySelector('.header_subtitle');
  const submitButtonElement = document.querySelector('[data-profile-submit-button]');
  const deletePetButtonElement = document.querySelector('[data-delete-pet-button]');
  const petSwitcherWrapElement = document.querySelector('[data-pet-switcher-wrap]');
  const petSwitcherElement = document.querySelector('[data-pet-switcher]');
  const photoMenuButtonElement = document.querySelector('[data-profile-photo-menu-button]');
  const photoMenuElement = document.querySelector('[data-profile-photo-menu]');
  const photoButtonElement = document.querySelector('[data-profile-photo-button]');
  const photoRemoveButtonElement = document.querySelector('[data-profile-photo-remove]');
  const photoImageElement = document.querySelector('[data-profile-photo-image]');
  const photoPlaceholderElement = document.querySelector('[data-profile-photo-placeholder]');
  const photoErrorElement = document.querySelector('[data-profile-photo-error]');
  const selectedTags = new Set();
  let currentPhotoDataUrl = null;
  let editingPetId = null;
  let registeredPetCount = 0;

  function closePhotoMenu() {
    photoMenuElement.hidden = true;
    photoMenuButtonElement.setAttribute('aria-expanded', 'false');
  }

  function openPhotoMenu() {
    photoMenuElement.hidden = false;
    photoMenuButtonElement.setAttribute('aria-expanded', 'true');
  }

  function togglePhotoMenu() {
    if (photoMenuElement.hidden) {
      openPhotoMenu();
      return;
    }

    closePhotoMenu();
  }

  function updateProfilePhotoPreview() {
    if (currentPhotoDataUrl) {
      photoPlaceholderElement.hidden = true;
      photoImageElement.src = currentPhotoDataUrl;
      photoImageElement.hidden = false;
      photoRemoveButtonElement.hidden = false;
      return;
    }

    photoImageElement.hidden = true;
    photoImageElement.removeAttribute('src');
    photoPlaceholderElement.hidden = false;
    photoRemoveButtonElement.hidden = true;
  }

  function resetTagSelection() {
    selectedTags.clear();
    tagGroupElement.querySelectorAll('.chip_select_option').forEach((chipElement) => {
      chipElement.classList.remove('is_selected');
      if (chipElement.classList.contains('is_custom_tag')) {
        chipElement.remove();
      }
    });
  }

  function fillFormWithPet(pet) {
    editingPetId = pet.id;
    formElement.querySelector('#pet_name').value = pet.name;
    formElement.querySelector('#pet_breed').value = pet.breed;
    formElement.querySelector('#pet_age').value = pet.age;
    formElement.querySelector('#pet_size').value = pet.size;
    formElement.querySelector('#pet_energy').value = pet.energyLevel;
    currentPhotoDataUrl = pet.photoDataUrl || null;
    updateProfilePhotoPreview();

    resetTagSelection();
    pet.tags.forEach((tagValue) => {
      const chipElement = Array.from(tagGroupElement.querySelectorAll('[data-tag]'))
        .find((item) => item.dataset.tag === tagValue);

      if (chipElement) {
        selectedTags.add(tagValue);
        chipElement.classList.add('is_selected');
      } else {
        createCustomTagChip(tagValue, tagGroupElement, selectedTags);
      }
    });

    updateProfileHeader(false);
    updateDeleteButtonVisibility();
  }

  function clearFormForNewPet() {
    editingPetId = null;
    formElement.reset();
    currentPhotoDataUrl = null;
    updateProfilePhotoPreview();
    resetTagSelection();
    updateProfileHeader(true);
    deletePetButtonElement.hidden = true;
  }

  function updateProfileHeader(isNewPetMode) {
    if (isNewPetMode) {
      headerTitleElement.textContent = '새 반려동물 등록';
      headerSubtitleElement.textContent = '추가로 키우는 반려동물 정보를 입력해주세요.';
      submitButtonElement.textContent = '반려동물 추가하고 저장';
      return;
    }

    headerTitleElement.textContent = '반려동물 프로필 등록';
    headerSubtitleElement.textContent = '정확히 입력할수록 AI 매칭 궁합 점수가 정교해져요.';
    submitButtonElement.textContent = registeredPetCount > 0 ? '프로필 저장' : '프로필 저장하고 시작하기';
  }

  function updateDeleteButtonVisibility() {
    deletePetButtonElement.hidden = !(editingPetId && registeredPetCount > 1);
  }

  async function handlePetSwitch(nextPetId) {
    setActivePetId(nextPetId);
    const nextPet = await api.get('/pets/me');
    fillFormWithPet(nextPet);
    errorElement.hidden = true;
    await renderPetSwitcher();
  }

  async function renderPetSwitcher() {
    try {
      const petList = await api.get('/pets/mine');
      registeredPetCount = petList.length;

      if (petList.length === 0) {
        petSwitcherWrapElement.hidden = true;
        return;
      }

      petSwitcherWrapElement.hidden = false;
      await mountPetSwitcherBar(petSwitcherElement, {
        label: '등록된 반려동물',
        showWhenSingle: true,
        onSwitch: handlePetSwitch,
      });
    } catch (error) {
      petSwitcherWrapElement.hidden = true;
      registeredPetCount = 0;
    }
  }

  async function loadPetSwitcher() {
    await renderPetSwitcher();

    if (registeredPetCount === 0) {
      clearFormForNewPet();
    }
  }

  async function initializeProfileForm() {
    await loadPetSwitcher();

    const modeParam = getProfileQueryParam('mode');
    const petIdParam = getProfileQueryParam('petId');

    if (modeParam === 'new') {
      clearFormForNewPet();
      return;
    }

    try {
      if (petIdParam) {
        setActivePetId(petIdParam);
      }

      const pet = await api.get('/pets/me');
      fillFormWithPet(pet);
    } catch (error) {
      clearFormForNewPet();
    }
  }

  updateProfilePhotoPreview();

  photoMenuButtonElement.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    togglePhotoMenu();
  });

  document.addEventListener('click', (event) => {
    if (photoMenuElement.hidden) {
      return;
    }

    if (!event.target.closest('[data-profile-photo-menu]') && !event.target.closest('[data-profile-photo-menu-button]')) {
      closePhotoMenu();
    }
  });

  photoButtonElement.addEventListener('click', async (event) => {
    event.preventDefault();
    closePhotoMenu();

    if (!window.walkCameraHelper || !window.walkCameraHelper.captureProfilePhoto) {
      photoErrorElement.textContent = '카메라 기능을 불러오지 못했습니다. 페이지를 새로고침해주세요.';
      photoErrorElement.hidden = false;
      return;
    }

    photoErrorElement.hidden = true;
    photoMenuButtonElement.disabled = true;

    try {
      currentPhotoDataUrl = await window.walkCameraHelper.captureProfilePhoto();
      updateProfilePhotoPreview();
      showToast('프로필 사진이 등록되었어요.');
    } catch (error) {
      if (error.message !== '사진 선택이 취소되었습니다.' && error.message !== '사진 촬영이 취소되었습니다.') {
        photoErrorElement.textContent = error.message;
        photoErrorElement.hidden = false;
      }
    } finally {
      photoMenuButtonElement.disabled = false;
    }
  });

  photoRemoveButtonElement.addEventListener('click', (event) => {
    event.preventDefault();
    closePhotoMenu();
    currentPhotoDataUrl = null;
    updateProfilePhotoPreview();
    showToast('프로필 사진을 삭제했어요.');
  });

  deletePetButtonElement.addEventListener('click', async () => {
    if (!editingPetId || registeredPetCount <= 1) {
      return;
    }

    if (!window.confirm('이 반려동물 프로필을 삭제할까요?')) {
      return;
    }

    try {
      await api.delete(`/pets/by-id/${editingPetId}`);
      showToast('반려동물 프로필을 삭제했어요.');

      const remainingPetList = await api.get('/pets/mine');
      if (remainingPetList.length === 0) {
        clearActivePetId();
        window.location.href = 'profile.html';
        return;
      }

      setActivePetId(remainingPetList[0].id);
      window.location.href = 'profile.html';
    } catch (error) {
      errorElement.textContent = error.message;
      errorElement.hidden = false;
    }
  });

  tagGroupElement.addEventListener('click', (event) => {
    const removeButtonElement = event.target.closest('[data-remove-tag]');
    if (removeButtonElement) {
      const chipElement = removeButtonElement.closest('[data-tag]');
      removeCustomTag(chipElement, selectedTags);
      return;
    }

    const chipElement = event.target.closest('[data-tag]');
    if (chipElement) {
      toggleTag(chipElement, selectedTags);
    }
  });

  addTagButtonElement.addEventListener('click', () => {
    addCustomTag(customTagInputElement, tagGroupElement, selectedTags);
  });

  customTagInputElement.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addCustomTag(customTagInputElement, tagGroupElement, selectedTags);
    }
  });

  formElement.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorElement.hidden = true;

    const formData = new FormData(formElement);
    const payload = {
      name: formData.get('name').trim(),
      breed: formData.get('breed').trim(),
      age: formData.get('age'),
      size: formData.get('size'),
      energyLevel: formData.get('energyLevel'),
      tags: Array.from(selectedTags),
      photoDataUrl: currentPhotoDataUrl,
    };

    if (editingPetId) {
      payload.id = editingPetId;
    }

    if (payload.tags.length === 0) {
      errorElement.textContent = '성향 태그를 1개 이상 선택해주세요.';
      errorElement.hidden = false;
      return;
    }

    try {
      const wasFirstPet = registeredPetCount === 0 && !editingPetId;
      const savedPet = await api.post('/pets', payload);
      setActivePetId(savedPet.id);
      window.location.href = wasFirstPet ? 'matching.html' : 'profile.html';
    } catch (error) {
      errorElement.textContent = error.message;
      errorElement.hidden = false;
    }
  });

  initializeProfileForm();
}

function toggleTag(chipElement, selectedTags) {
  const tagValue = chipElement.dataset.tag;

  if (selectedTags.has(tagValue)) {
    selectedTags.delete(tagValue);
    chipElement.classList.remove('is_selected');
  } else {
    selectedTags.add(tagValue);
    chipElement.classList.add('is_selected');
  }
}

function removeCustomTag(chipElement, selectedTags) {
  if (!chipElement) {
    return;
  }

  selectedTags.delete(chipElement.dataset.tag);
  chipElement.remove();
}

function addCustomTag(inputElement, tagGroupElement, selectedTags) {
  const tagValue = inputElement.value.trim();

  if (!tagValue) {
    return;
  }

  if (selectedTags.has(tagValue)) {
    showToast('이미 추가된 성향이에요.');
    inputElement.value = '';
    return;
  }

  createCustomTagChip(tagValue, tagGroupElement, selectedTags);
  inputElement.value = '';
  inputElement.focus();
}

function createCustomTagChip(tagValue, tagGroupElement, selectedTags) {
  const chipElement = document.createElement('button');
  chipElement.type = 'button';
  chipElement.className = 'chip_select_option is_selected is_custom_tag';
  chipElement.dataset.tag = tagValue;
  chipElement.innerHTML = `${tagValue} <span class="chip_remove" data-remove-tag aria-label="${tagValue} 삭제">×</span>`;

  tagGroupElement.appendChild(chipElement);
  selectedTags.add(tagValue);
}

if (requireLogin()) {
  initProfilePage();
}
