// 홈 화면(AI 추천 매칭 리스트) 로직
async function initHomePage() {
  document.querySelector('[data-logout-button]').addEventListener('click', () => {
    clearCurrentUserId();
    window.location.href = 'index.html';
  });

  try {
    const me = await api.get('/users/me');
    document.querySelector('[data-greeting]').textContent = `안녕하세요, ${me.name}님 👋`;
  } catch (error) {
    showToast(error.message);
  }

  try {
    const myPet = await ensureActivePetForCurrentUser();
    if (!myPet) {
      window.location.href = 'profile.html';
      return;
    }

    renderMyPetSummary(myPet);
    await mountPetSwitcherBar(document.querySelector('[data-pet-switcher]'), { showWhenSingle: true });
  } catch (error) {
    // 반려동물 프로필이 없으면 등록 화면으로 이동
    window.location.href = 'profile.html';
    return;
  }

  await loadMatchList();
}

function renderMyPetSummary(pet) {
  mountMyPetSummaryElement(document.querySelector('[data-my-pet-summary]'), pet);
}

async function loadMatchList() {
  const listElement = document.querySelector('[data-match-list]');

  try {
    const matches = await api.get('/matches');

    if (matches.length === 0) {
      listElement.innerHTML = `
        <li class="empty_state">
          <p class="empty_state_icon">🐾</p>
          <p>아직 추천할 산책 짝이 없어요.<br />동네에 다른 반려동물이 등록되면 알려드릴게요.</p>
        </li>
      `;
      return;
    }

    listElement.innerHTML = matches.map((match) => `
      <li class="card match_card">
        <div class="match_card_top">
          ${renderPetAvatarHtml(match.pet, 'match_card_avatar')}
          <div class="match_card_info">
            <p class="match_card_name">${match.pet.name} · ${match.pet.breed}</p>
            <p class="match_card_meta">${match.owner ? match.owner.name : '보호자'} · ${match.owner ? match.owner.region : ''}</p>
          </div>
          <span class="score_badge">AI 궁합 ${match.matchScore}점</span>
        </div>
        <div class="match_card_tags">
          ${match.pet.tags.map((tag) => `<span class="tag_chip">${tag}</span>`).join('')}
        </div>
        ${renderMatchLlmExplanationHtml(match)}
        <a class="btn_primary" href="request.html?toUserId=${match.owner.id}&toPetId=${match.pet.id}">산책 요청하기</a>
      </li>
    `).join('');
  } catch (error) {
    listElement.innerHTML = `<li class="form_error">${error.message}</li>`;
  }
}

if (requireLogin()) {
  initHomePage();
}
