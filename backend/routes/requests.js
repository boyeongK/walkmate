// 매칭 요청(산책 약속) 관련 API
// 자유 채팅 없이 "선택형 제안 + 정해진 상태 버튼"으로만 소통하는 구조입니다.
const express = require('express');
const { readDB, writeDB } = require('../db');
const { getBlockedUserIds } = require('./blocks');

const router = express.Router();

// 상태 버튼으로 보낼 수 있는 정해진 문구 목록 (자유 텍스트 금지)
const ALLOWED_STATUS_MESSAGES = ['5분 늦어요', '도착했어요', '취소할게요'];
// 보낸 요청이 12시간 동안 미응답이면 자동 취소
const PENDING_REQUEST_EXPIRE_MS = 12 * 60 * 60 * 1000;

function expireStalePendingRequests(db) {
  const now = Date.now();
  let hasChanges = false;

  db.requests.forEach((request) => {
    if (request.status !== 'pending') {
      return;
    }

    if (!request.createdAt || now - request.createdAt < PENDING_REQUEST_EXPIRE_MS) {
      return;
    }

    request.status = 'cancelled';

    if (!Array.isArray(request.statusLog)) {
      request.statusLog = [];
    }

    request.statusLog.push({
      message: '12시간 미응답으로 자동 취소',
      by: 'system',
      timestamp: now,
    });
    hasChanges = true;
  });

  return hasChanges;
}

function findPetForRequest(db, userId, petId) {
  if (petId) {
    const pet = db.pets.find((item) => item.id === petId && item.userId === userId);
    if (pet) {
      return pet;
    }
  }

  return db.pets.find((item) => item.userId === userId) || null;
}

function enrichRequest(request, db) {
  const fromUser = db.users.find((user) => user.id === request.fromUserId);
  const toUser = db.users.find((user) => user.id === request.toUserId);
  const fromPet = findPetForRequest(db, request.fromUserId, request.fromPetId);
  const toPet = findPetForRequest(db, request.toUserId, request.toPetId);

  return {
    ...request,
    fromUser: fromUser ? { id: fromUser.id, name: fromUser.name } : null,
    toUser: toUser ? { id: toUser.id, name: toUser.name } : null,
    fromPet: fromPet ? { id: fromPet.id, name: fromPet.name } : null,
    toPet: toPet ? { id: toPet.id, name: toPet.name } : null,
  };
}

// 내가 보냈거나 받은 매칭 요청 전체 목록
router.get('/', (req, res) => {
  const db = readDB();

  if (expireStalePendingRequests(db)) {
    writeDB(db);
  }

  const myRequests = db.requests
    .filter((r) => r.fromUserId === req.currentUserId || r.toUserId === req.currentUserId)
    .map((r) => enrichRequest(r, db))
    .sort((a, b) => b.createdAt - a.createdAt);

  res.json(myRequests);
});

// 매칭 요청 상세 조회
router.get('/:id', (req, res) => {
  const db = readDB();

  if (expireStalePendingRequests(db)) {
    writeDB(db);
  }

  const request = db.requests.find((r) => r.id === req.params.id);

  if (!request) {
    return res.status(404).json({ message: '요청을 찾을 수 없습니다.' });
  }

  res.json(enrichRequest(request, db));
});

// 매칭 요청 보내기 (시간대/장소는 선택형 옵션만 허용)
router.post('/', (req, res) => {
  const { toUserId, toPetId, timeSlot, place } = req.body;

  if (!toUserId || !timeSlot || !place) {
    return res.status(400).json({ message: '상대, 시간대, 장소를 모두 선택해주세요.' });
  }

  const db = readDB();
  const myPet = db.pets.find((item) => {
    if (item.userId !== req.currentUserId) {
      return false;
    }
    if (req.activePetId) {
      return item.id === req.activePetId;
    }
    return true;
  }) || db.pets.find((item) => item.userId === req.currentUserId);

  if (!myPet) {
    return res.status(400).json({ message: '먼저 반려동물 프로필을 등록해주세요.' });
  }

  const blockedUserIds = getBlockedUserIds(db, req.currentUserId);
  if (blockedUserIds.includes(toUserId)) {
    return res.status(400).json({ message: '매칭 제외한 상대에게는 요청을 보낼 수 없습니다.' });
  }

  const newRequest = {
    id: `r${Date.now()}`,
    fromUserId: req.currentUserId,
    fromPetId: myPet.id,
    toUserId,
    toPetId: toPetId || null,
    timeSlot,
    place,
    status: 'pending', // pending -> accepted -> completed / rejected / cancelled
    walkPhase: 'not_started', // not_started -> started -> ended
    statusLog: [],
    review: null,
    createdAt: Date.now(),
  };

  db.requests.push(newRequest);
  writeDB(db);
  res.status(201).json(enrichRequest(newRequest, db));
});

// 매칭 요청 수락/거절 (받는 사람만 가능)
router.patch('/:id/respond', (req, res) => {
  const { action } = req.body; // 'accept' | 'reject'
  const db = readDB();

  if (expireStalePendingRequests(db)) {
    writeDB(db);
  }

  const request = db.requests.find((r) => r.id === req.params.id);

  if (!request) {
    return res.status(404).json({ message: '요청을 찾을 수 없습니다.' });
  }
  if (request.toUserId !== req.currentUserId) {
    return res.status(403).json({ message: '이 요청에 응답할 권한이 없습니다.' });
  }
  if (request.status === 'cancelled') {
    return res.status(400).json({ message: '이미 취소된 요청입니다.' });
  }
  if (request.status !== 'pending') {
    return res.status(400).json({ message: '이미 처리된 요청입니다.' });
  }
  if (!['accept', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'action은 accept 또는 reject만 가능합니다.' });
  }

  if (action === 'reject') {
    const trimmedReason = (req.body.rejectReason || '').trim();
    const trimmedNote = (req.body.rejectNote || '').trim();

    if (!trimmedReason) {
      return res.status(400).json({ message: '거절 사유를 선택하거나 입력해주세요.' });
    }

    const now = Date.now();

    request.rejectInfo = {
      reason: trimmedReason,
      note: trimmedNote,
      rejectedBy: req.currentUserId,
      timestamp: now,
    };
    request.status = 'rejected';
    writeDB(db);
    return res.json(enrichRequest(request, db));
  }

  request.status = 'accepted';
  writeDB(db);
  res.json(enrichRequest(request, db));
});

// 정해진 상태 버튼 전송 (자유 채팅 대체)
router.post('/:id/status-messages', (req, res) => {
  const { message, cancelReason, cancelNote } = req.body;
  const db = readDB();
  const request = db.requests.find((r) => r.id === req.params.id);

  if (!request) {
    return res.status(404).json({ message: '요청을 찾을 수 없습니다.' });
  }
  if (!ALLOWED_STATUS_MESSAGES.includes(message)) {
    return res.status(400).json({ message: '허용되지 않은 문구입니다.', allowed: ALLOWED_STATUS_MESSAGES });
  }

  if (message === '취소할게요') {
    const trimmedReason = (cancelReason || '').trim();
    const trimmedNote = (cancelNote || '').trim();

    if (!trimmedReason) {
      return res.status(400).json({ message: '취소 사유를 선택하거나 입력해주세요.' });
    }

    const now = Date.now();

    request.statusLog.push({
      message,
      cancelReason: trimmedReason,
      cancelNote: trimmedNote,
      by: req.currentUserId,
      timestamp: now,
    });

    request.cancelInfo = {
      reason: trimmedReason,
      note: trimmedNote,
      cancelledBy: req.currentUserId,
      timestamp: now,
    };
    request.status = 'cancelled';
    writeDB(db);
    return res.json(enrichRequest(request, db));
  }

  request.statusLog.push({
    message,
    by: req.currentUserId,
    timestamp: Date.now(),
  });

  writeDB(db);
  res.json(enrichRequest(request, db));
});

// 산책 시작/종료 인증 (인증샷 촬영 후 저장)
router.post('/:id/certify', (req, res) => {
  const { phase, photoDataUrl } = req.body; // 'start' | 'end'
  const db = readDB();
  const request = db.requests.find((r) => r.id === req.params.id);

  if (!request) {
    return res.status(404).json({ message: '요청을 찾을 수 없습니다.' });
  }
  if (request.status !== 'accepted') {
    return res.status(400).json({ message: '수락된 약속만 인증할 수 있습니다.' });
  }
  if (!['start', 'end'].includes(phase)) {
    return res.status(400).json({ message: 'phase는 start 또는 end만 가능합니다.' });
  }
  if (!photoDataUrl || typeof photoDataUrl !== 'string') {
    return res.status(400).json({ message: '인증 사진을 촬영해주세요.' });
  }

  if (!request.certifyPhotos) {
    request.certifyPhotos = {};
  }

  const photoKey = phase === 'start' ? 'start' : 'end';
  request.certifyPhotos[photoKey] = {
    dataUrl: photoDataUrl,
    certifiedBy: req.currentUserId,
    timestamp: Date.now(),
  };
  request.walkPhase = phase === 'start' ? 'started' : 'ended';
  writeDB(db);
  res.json(enrichRequest(request, db));
});

// 산책 후기/별점 남기기 -> 완료 처리
router.post('/:id/review', (req, res) => {
  const { rating, comment } = req.body;
  const db = readDB();
  const request = db.requests.find((r) => r.id === req.params.id);

  if (!request) {
    return res.status(404).json({ message: '요청을 찾을 수 없습니다.' });
  }
  if (request.walkPhase !== 'ended') {
    return res.status(400).json({ message: '산책 종료 인증 후에 후기를 남길 수 있습니다.' });
  }
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: '별점은 1~5 사이로 입력해주세요.' });
  }

  request.review = {
    rating: Number(rating),
    comment: comment || '',
    reviewedBy: req.currentUserId,
    timestamp: Date.now(),
  };
  request.status = 'completed';

  writeDB(db);
  res.json(enrichRequest(request, db));
});

module.exports = router;
module.exports.ALLOWED_STATUS_MESSAGES = ALLOWED_STATUS_MESSAGES;
