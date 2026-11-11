// 백엔드 API 호출을 위한 공통 유틸리티
// 실제 서비스에서는 로그인 토큰을 사용하지만, 데모에서는 X-User-Id 헤더로 사용자를 구분합니다.

function isNativeApp() {
  return typeof window.Capacitor !== 'undefined';
}

function isOfflineDemoMode() {
  return isNativeApp()
    && window.WALKMATE_CONFIG
    && window.WALKMATE_CONFIG.offlineDemo === true;
}

function resolveApiBaseUrl() {
  // 웹 브라우저 로컬 개발
  if (!isNativeApp()) {
    // Express(4000)에서 서빙할 때는 상대 경로
    if (window.location.port === '4000') {
      return '/api';
    }

    // Live Server, HTML 파일 직접 열기 등 → 백엔드 4000으로 연결
    return 'http://localhost:4000/api';
  }

  // 오프라인 APK 모드에서는 원격 URL을 쓰지 않음
  if (isOfflineDemoMode()) {
    return 'local://api';
  }

  // 앱에서는 PC/서버에 떠 있는 API 주소를 사용 (app-config.js에서 변경 가능)
  if (window.WALKMATE_CONFIG && window.WALKMATE_CONFIG.apiBaseUrl) {
    return window.WALKMATE_CONFIG.apiBaseUrl;
  }

  return 'http://10.0.2.2:4000/api';
}

const API_BASE_URL = resolveApiBaseUrl();

function getCurrentUserId() {
  return localStorage.getItem('walkmate_user_id') || '';
}

function getActivePetId() {
  return localStorage.getItem('walkmate_active_pet_id') || '';
}

function setCurrentUserId(userId) {
  localStorage.setItem('walkmate_user_id', userId);
}

function setActivePetId(petId) {
  if (petId) {
    localStorage.setItem('walkmate_active_pet_id', petId);
    return;
  }

  localStorage.removeItem('walkmate_active_pet_id');
}

function clearCurrentUserId() {
  localStorage.removeItem('walkmate_user_id');
  localStorage.removeItem('walkmate_active_pet_id');
}

function clearActivePetId() {
  localStorage.removeItem('walkmate_active_pet_id');
}

async function requestApi(method, path, body) {
  // APK 단독 모드: 앱 내부 로컬 API 사용 (서버/와이파이 불필요)
  if (isOfflineDemoMode()) {
    if (!window.localApi) {
      throw new Error('로컬 API를 불러오지 못했습니다.');
    }

    try {
      return await window.localApi.request(method, path, body, getCurrentUserId(), getActivePetId());
    } catch (error) {
      throw new Error(error.message || '요청 처리 중 오류가 발생했습니다.');
    }
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': getCurrentUserId(),
        'X-Active-Pet-Id': getActivePetId(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new Error('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요. (walkmate/backend → npm run dev)');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || '요청 처리 중 오류가 발생했습니다.');
  }

  return data;
}

const api = {
  get: (path) => requestApi('GET', path),
  post: (path, body) => requestApi('POST', path, body),
  patch: (path, body) => requestApi('PATCH', path, body),
  delete: (path) => requestApi('DELETE', path),
};

// 로그인하지 않은 상태에서 내부 화면에 접근하면 온보딩 화면으로 돌려보냄
function requireLogin() {
  if (!getCurrentUserId()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function showToast(message) {
  let toastElement = document.querySelector('.toast_message');

  if (!toastElement) {
    toastElement = document.createElement('div');
    toastElement.className = 'toast_message';
    document.body.appendChild(toastElement);
  }

  toastElement.textContent = message;
  toastElement.classList.add('is_visible');

  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    toastElement.classList.remove('is_visible');
  }, 2200);
}
