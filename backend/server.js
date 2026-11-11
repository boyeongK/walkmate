// 산책메이트 앱 백엔드 서버 진입점
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const usersRouter = require('./routes/users');
const petsRouter = require('./routes/pets');
const matchesRouter = require('./routes/matches');
const requestsRouter = require('./routes/requests');
const blocksRouter = require('./routes/blocks');
const { ensureDbFile } = require('./db');

ensureDbFile();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// 데모용 인증 미들웨어: X-User-Id 헤더로 현재 로그인 사용자를 판별 (기본값 u1)
app.use((req, res, next) => {
  req.currentUserId = req.header('X-User-Id') || 'u1';
  req.activePetId = req.header('X-Active-Pet-Id') || '';
  next();
});

app.use('/api/users', usersRouter);
app.use('/api/pets', petsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/blocks', blocksRouter);
app.use('/api/requests', requestsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 프론트엔드 정적 파일을 같은 서버에서 서빙 (CORS 문제 없이 데모 실행)
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: '요청한 API를 찾을 수 없습니다.' });
  }
  res.status(404).sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`walkmate 백엔드 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  console.log(`같은 Wi-Fi의 폰 앱 데모: http://<PC-IP>:${PORT}/api`);
});
