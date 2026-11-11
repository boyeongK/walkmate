// 산책 상대 다시 만나지 않기(매칭 제외) API
const express = require('express');
const { readDB, writeDB } = require('../db');

const router = express.Router();

function getBlockedUserIds(db, userId) {
  if (!Array.isArray(db.blocks)) {
    return [];
  }

  return db.blocks
    .filter((item) => item.userId === userId)
    .map((item) => item.blockedUserId);
}

function enrichBlockRecord(blockRecord, db) {
  const blockedUser = db.users.find((user) => user.id === blockRecord.blockedUserId);
  const blockedPet = db.pets.find((pet) => pet.userId === blockRecord.blockedUserId);

  return {
    ...blockRecord,
    blockedUser: blockedUser ? { id: blockedUser.id, name: blockedUser.name } : null,
    blockedPet: blockedPet ? { id: blockedPet.id, name: blockedPet.name } : null,
  };
}

// 내가 매칭 제외한 목록
router.get('/mine', (req, res) => {
  const db = readDB();
  const myBlocks = (db.blocks || [])
    .filter((item) => item.userId === req.currentUserId)
    .map((item) => enrichBlockRecord(item, db))
    .sort((a, b) => b.createdAt - a.createdAt);

  res.json(myBlocks);
});

// 상대를 매칭에서 제외 (다시 만나지 않기)
router.post('/', (req, res) => {
  const { blockedUserId, requestId } = req.body || {};

  if (!blockedUserId) {
    return res.status(400).json({ message: '제외할 상대 정보가 없습니다.' });
  }

  if (blockedUserId === req.currentUserId) {
    return res.status(400).json({ message: '본인은 매칭 제외할 수 없습니다.' });
  }

  const db = readDB();
  const targetUser = db.users.find((user) => user.id === blockedUserId);

  if (!targetUser) {
    return res.status(404).json({ message: '상대 사용자를 찾을 수 없습니다.' });
  }

  if (!Array.isArray(db.blocks)) {
    db.blocks = [];
  }

  const existingBlock = db.blocks.find(
    (item) => item.userId === req.currentUserId && item.blockedUserId === blockedUserId
  );

  if (existingBlock) {
    return res.json(enrichBlockRecord(existingBlock, db));
  }

  const newBlock = {
    id: `blk${Date.now()}`,
    userId: req.currentUserId,
    blockedUserId,
    requestId: requestId || null,
    createdAt: Date.now(),
  };

  db.blocks.push(newBlock);
  writeDB(db);
  res.json(enrichBlockRecord(newBlock, db));
});

// 매칭 제외 해제
router.delete('/user/:blockedUserId', (req, res) => {
  const db = readDB();

  if (!Array.isArray(db.blocks)) {
    return res.status(404).json({ message: '매칭 제외 기록을 찾을 수 없습니다.' });
  }

  const targetIndex = db.blocks.findIndex(
    (item) => item.userId === req.currentUserId && item.blockedUserId === req.params.blockedUserId
  );

  if (targetIndex < 0) {
    return res.status(404).json({ message: '매칭 제외 기록을 찾을 수 없습니다.' });
  }

  db.blocks.splice(targetIndex, 1);
  writeDB(db);
  res.json({ message: '매칭 제외를 해제했습니다.' });
});

module.exports = router;
module.exports.getBlockedUserIds = getBlockedUserIds;
