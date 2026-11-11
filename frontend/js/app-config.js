// Capacitor(Android) 앱에서 백엔드 API 서버 주소 설정
// 브라우저(http://localhost:4000)에서는 이 파일이 적용되지 않고 /api 상대경로를 사용합니다.
window.WALKMATE_CONFIG = window.WALKMATE_CONFIG || {};

// ===== APK 단독 실행 (와이파이/서버 불필요) =====
// true: 앱 안에 데모 데이터 + 로컬 API (가입·등록 데이터는 이 기기에 저장)
// false: PC/클라우드 백엔드에 연결 (여러 기기에서 같은 데이터 사용)
window.WALKMATE_CONFIG.offlineDemo = true;

// ===== PC 서버·실사용 연결 예시 =====
// window.WALKMATE_CONFIG.offlineDemo = false;
// window.WALKMATE_CONFIG.apiBaseUrl = 'http://192.168.0.10:4000/api';
