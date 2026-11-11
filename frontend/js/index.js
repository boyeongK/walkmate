// 온보딩: 회원가입 · 이 기기 계정 재접속 · (선택) 데모 계정
const ACCOUNT_ICONS = ['🐶', '🐩', '🦮', '🐕‍🦺'];

function renderAccountListItem(user, index) {
  return `
    <li>
      <button type="button" class="account_select_item" data-user-id="${user.id}">
        <span class="account_avatar" aria-hidden="true">${ACCOUNT_ICONS[index % ACCOUNT_ICONS.length]}</span>
        <span class="account_info">
          <span class="account_name">${user.name}</span>
          <span class="account_region">${user.region || '지역 미설정'}</span>
        </span>
      </button>
    </li>
  `;
}

function bindAccountButtons(containerElement) {
  if (!containerElement) {
    return;
  }

  containerElement.querySelectorAll('[data-user-id]').forEach((buttonElement) => {
    buttonElement.addEventListener('click', () => selectAccount(buttonElement.dataset.userId));
  });
}

async function tryResumeLastSession() {
  const savedUserId = getCurrentUserId();
  if (!savedUserId) {
    return false;
  }

  try {
    const me = await api.get('/users/me');
    rememberDeviceAccount(me);
    await routeAfterLogin();
    return true;
  } catch (error) {
    clearCurrentUserId();
    return false;
  }
}

async function routeAfterLogin() {
  try {
    const petList = await api.get('/pets/mine');
    if (petList.length > 0) {
      if (!getActivePetId()) {
        setActivePetId(petList[0].id);
      }
      window.location.href = 'home.html';
      return;
    }
  } catch (error) {
    // 반려동물 조회 실패 시 프로필 등록으로 이동
  }

  window.location.href = 'profile.html';
}

async function selectAccount(userId) {
  setCurrentUserId(userId);
  clearActivePetId();

  try {
    const me = await api.get('/users/me');
    rememberDeviceAccount(me);
  } catch (error) {
  }

  await routeAfterLogin();
}

function renderDeviceAccounts() {
  const sectionElement = document.querySelector('[data-device-accounts-section]');
  const listElement = document.querySelector('[data-device-account-list]');
  const deviceAccounts = getDeviceAccounts().filter((item) => !isDemoUserId(item.id));

  if (deviceAccounts.length === 0) {
    sectionElement.hidden = true;
    return;
  }

  sectionElement.hidden = false;
  listElement.innerHTML = deviceAccounts
    .map((account, index) => renderAccountListItem(account, index))
    .join('');
  bindAccountButtons(listElement);
}

async function renderServerAccounts() {
  const sectionElement = document.querySelector('[data-server-accounts-section]');
  const listElement = document.querySelector('[data-server-account-list]');

  try {
    const users = await api.get('/users');
    const customUsers = users
      .filter((user) => !isDemoUserId(user.id))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (customUsers.length === 0) {
      sectionElement.hidden = true;
      return;
    }

    sectionElement.hidden = false;
    listElement.innerHTML = customUsers
      .map((user, index) => renderAccountListItem(user, index))
      .join('');
    bindAccountButtons(listElement);
  } catch (error) {
    sectionElement.hidden = true;
  }
}

async function renderDemoAccounts() {
  const listElement = document.querySelector('[data-demo-account-list]');

  try {
    const users = await api.get('/users');
    const demoUsers = users.filter((user) => isDemoUserId(user.id));

    listElement.innerHTML = demoUsers
      .map((user, index) => renderAccountListItem(user, index))
      .join('');
    bindAccountButtons(listElement);
  } catch (error) {
    listElement.innerHTML = `<li class="form_error">${error.message}</li>`;
  }
}

function initNewAccountForm() {
  const formElement = document.querySelector('[data-new-account-form]');
  const errorElement = document.querySelector('[data-new-account-error]');

  formElement.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorElement.hidden = true;

    const formData = new FormData(formElement);
    const name = formData.get('name').trim();
    const region = formData.get('region').trim();

    if (!name) {
      errorElement.textContent = '이름을 입력해주세요.';
      errorElement.hidden = false;
      return;
    }

    try {
      const newUser = await api.post('/users', { name, region });
      setCurrentUserId(newUser.id);
      rememberDeviceAccount(newUser);
      clearActivePetId();
      window.location.href = 'profile.html';
    } catch (error) {
      errorElement.textContent = error.message;
      errorElement.hidden = false;
    }
  });
}

function showOnboardingPanel() {
  document.querySelector('[data-onboarding-loading]').hidden = true;
  document.querySelector('[data-onboarding-panel]').hidden = false;
}

async function initOnboardingPage() {
  const resumed = await tryResumeLastSession();
  if (resumed) {
    return;
  }

  showOnboardingPanel();
  renderDeviceAccounts();
  await renderServerAccounts();
  await renderDemoAccounts();
}

initNewAccountForm();
initOnboardingPage();
