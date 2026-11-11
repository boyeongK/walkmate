// AI 매칭을 사용자가 직접 실행해보는 화면 로직
let myPetForMatching = null;

async function initMatchingPage() {
  try {
    myPetForMatching = await ensureActivePetForCurrentUser();
    if (!myPetForMatching) {
      window.location.href = 'profile.html';
      return;
    }

    renderMyPetSummary(myPetForMatching);
    await mountPetSwitcherBar(document.querySelector('[data-pet-switcher]'), { showWhenSingle: true });
  } catch (error) {
    // 반려동물 프로필이 없으면 먼저 등록하도록 안내
    window.location.href = 'profile.html';
    return;
  }

  document.querySelectorAll('[data-run-matching-button]').forEach((buttonElement) => {
    buttonElement.addEventListener('click', runMatching);
  });
}

function renderMyPetSummary(pet) {
  mountMyPetSummaryElement(document.querySelector('[data-my-pet-summary]'), pet, { editStyle: 'gear' });
}

async function runMatching() {
  const idleElement = document.querySelector('[data-matching-idle]');
  const loadingElement = document.querySelector('[data-matching-loading]');
  const resultElement = document.querySelector('[data-matching-result]');

  idleElement.hidden = true;
  resultElement.hidden = true;
  loadingElement.hidden = false;

  try {
    // AI가 실제로 분석하는 느낌을 주기 위한 최소 대기 시간 (데모용 UX 장치)
    const [matches] = await Promise.all([api.get('/matches'), wait(900)]);
    renderMatchResults(matches);
    resultElement.hidden = false;
  } catch (error) {
    showToast(error.message);
    idleElement.hidden = false;
  } finally {
    loadingElement.hidden = true;
  }
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function renderMatchResults(matches) {
  const listElement = document.querySelector('[data-match-list]');

  if (matches.length === 0) {
    listElement.innerHTML = `
      <li class="empty_state">
        <p class="empty_state_icon">🐾</p>
        <p>아직 비교할 다른 반려동물이 없어요.<br />동네에 다른 반려동물이 등록되면 알려드릴게요.</p>
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
      ${renderBreakdown(match.breakdown)}
      ${renderMatchLlmExplanationHtml(match)}
      <a class="btn_primary" href="request.html?toUserId=${match.owner.id}&toPetId=${match.pet.id}">산책 요청하기</a>
    </li>
  `).join('');
}

function renderBreakdown(breakdown) {
  const rows = [
    { label: '성향 일치', score: breakdown.tagScore, max: 60 },
    { label: '활동량 궁합', score: breakdown.energyScore, max: 25 },
    { label: '크기 궁합', score: breakdown.sizeScore, max: 15 },
  ];

  return `
    <div class="match_breakdown">
      ${rows.map((row) => `
        <div class="match_breakdown_row">
          <span>${row.label}</span>
          <span class="match_breakdown_bar_track">
            <span class="match_breakdown_bar_fill" style="width: ${Math.round((row.score / row.max) * 100)}%"></span>
          </span>
          <span>${row.score}/${row.max}</span>
        </div>
      `).join('')}
    </div>
  `;
}

if (requireLogin()) {
  initMatchingPage();
}
