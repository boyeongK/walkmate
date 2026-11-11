// 이 기기에서 가입·로그인한 계정 목록 (다시 들어올 때 사용)
const DEVICE_ACCOUNTS_KEY = 'walkmate_device_accounts';
const DEMO_USER_IDS = ['u1', 'u2', 'u3'];

function getDeviceAccounts() {
  try {
    const rawText = localStorage.getItem(DEVICE_ACCOUNTS_KEY);
    if (!rawText) {
      return [];
    }

    const accountList = JSON.parse(rawText);
    if (!Array.isArray(accountList)) {
      return [];
    }

    return accountList.filter((item) => item && item.id);
  } catch (error) {
    return [];
  }
}

function rememberDeviceAccount(user) {
  if (!user || !user.id) {
    return;
  }

  const nextEntry = {
    id: user.id,
    name: user.name || '보호자',
    region: user.region || '',
    lastUsedAt: Date.now(),
  };

  const otherAccounts = getDeviceAccounts().filter((item) => item.id !== user.id);
  const nextList = [nextEntry, ...otherAccounts].slice(0, 10);

  localStorage.setItem(DEVICE_ACCOUNTS_KEY, JSON.stringify(nextList));
}

function isDemoUserId(userId) {
  return DEMO_USER_IDS.includes(userId);
}
