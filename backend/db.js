// JSON 파일을 간단한 DB처럼 사용하기 위한 헬퍼 모듈
// 데모/프로토타입 목적이므로 동기 방식의 파일 입출력을 사용합니다.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const SEED_DB_PATH = path.join(__dirname, '..', 'frontend', 'data', 'demo-db.json');

function createEmptyDb() {
  return {
    users: [],
    pets: [],
    requests: [],
    blocks: [],
  };
}

// 다른 PC에서 db.json이 없어도 시드 파일로 자동 생성
function ensureDbFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    return;
  }

  if (fs.existsSync(SEED_DB_PATH)) {
    fs.copyFileSync(SEED_DB_PATH, DB_PATH);
    return;
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(createEmptyDb(), null, 2), 'utf-8');
}

function readDB() {
  ensureDbFile();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDB(data) {
  ensureDbFile();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { readDB, writeDB, ensureDbFile };
