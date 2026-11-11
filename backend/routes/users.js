// 사용자 정보 API
// 실제 서비스라면 휴대폰 본인인증(SMS) 후 토큰을 발급하지만,
// 데모에서는 X-User-Id 헤더로 로그인 사용자를 구분하는 방식으로 대체합니다.
const express = require('express');
const { readDB, writeDB } = require('../db');

const router = express.Router();

// 현재 로그인한 사용자 정보
router.get('/me', (req, res) => {
  const db = readDB();
  const user = db.users.find((item) => item.id === req.currentUserId);

  if (!user) {
    return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
  }

  res.json(user);
});

// 데모 계정 전환용 - 전체 사용자 목록 (실제 서비스에는 없는 데모 전용 기능)
router.get('/', (req, res) => {
  const db = readDB();
  res.json(db.users);
});

// 새 계정 만들기 - 실제 서비스라면 휴대폰 본인인증 후 가입하지만, 데모에서는 이름/지역만으로 바로 생성
router.post('/', (req, res) => {
  const { name, region } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: '이름을 입력해주세요.' });
  }

  const db = readDB();
  const newUser = {
    id: `u${Date.now()}`,
    name: name.trim(),
    phone: '',
    region: region && region.trim() ? region.trim() : '지역 미설정',
    verified: true,
    createdAt: Date.now(),
  };

  db.users.push(newUser);
  writeDB(db);
  res.status(201).json(newUser);
});

module.exports = router;
