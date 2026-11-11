// 반려동물 프로필 관련 API (1보호자 : N반려동물)
const express = require('express');
const { readDB, writeDB } = require('../db');

const router = express.Router();

function getUserPets(db, userId) {
  return db.pets.filter((item) => item.userId === userId);
}

function resolveActivePet(db, userId, activePetId) {
  const userPets = getUserPets(db, userId);
  if (userPets.length === 0) {
    return null;
  }

  if (activePetId) {
    const matchedPet = userPets.find((item) => item.id === activePetId);
    if (matchedPet) {
      return matchedPet;
    }
  }

  return userPets[0];
}

function getPetById(db, petId) {
  return db.pets.find((item) => item.id === petId) || null;
}

// 내 반려동물 전체 목록
router.get('/mine', (req, res) => {
  const db = readDB();
  res.json(getUserPets(db, req.currentUserId));
});

// 현재 선택(활성) 반려동물 조회
router.get('/me', (req, res) => {
  const db = readDB();
  const pet = resolveActivePet(db, req.currentUserId, req.activePetId);

  if (!pet) {
    return res.status(404).json({ message: '등록된 반려동물 프로필이 없습니다.' });
  }

  res.json(pet);
});

// 반려동물 ID로 조회
router.get('/by-id/:petId', (req, res) => {
  const db = readDB();
  const pet = getPetById(db, req.params.petId);

  if (!pet) {
    return res.status(404).json({ message: '반려동물 프로필을 찾을 수 없습니다.' });
  }

  res.json(pet);
});

// 특정 사용자의 대표 반려동물 (첫 번째) — 하위 호환
router.get('/user/:userId', (req, res) => {
  const db = readDB();
  const userPets = getUserPets(db, req.params.userId);

  if (userPets.length === 0) {
    return res.status(404).json({ message: '해당 사용자의 반려동물 프로필이 없습니다.' });
  }

  res.json(userPets[0]);
});

// 반려동물 프로필 등록/수정 (id 있으면 수정, 없으면 새로 추가)
router.post('/', (req, res) => {
  const { id, name, breed, age, size, energyLevel, tags, photoDataUrl } = req.body;

  if (!name || !breed || !size || !energyLevel) {
    return res.status(400).json({ message: '필수 항목이 누락되었습니다. (이름, 견종, 크기, 활동량)' });
  }

  const db = readDB();

  if (id) {
    const existingIndex = db.pets.findIndex((item) => item.id === id && item.userId === req.currentUserId);
    if (existingIndex < 0) {
      return res.status(404).json({ message: '수정할 반려동물 프로필을 찾을 수 없습니다.' });
    }

    const existingPet = db.pets[existingIndex];
    const petData = {
      ...existingPet,
      name,
      breed,
      age: Number(age) || 0,
      size,
      energyLevel,
      tags: Array.isArray(tags) ? tags : [],
      photoDataUrl: photoDataUrl !== undefined ? photoDataUrl : existingPet.photoDataUrl,
    };

    db.pets[existingIndex] = petData;
    writeDB(db);
    return res.json(petData);
  }

  const petData = {
    id: `p${Date.now()}`,
    userId: req.currentUserId,
    name,
    breed,
    age: Number(age) || 0,
    size,
    energyLevel,
    tags: Array.isArray(tags) ? tags : [],
    photoDataUrl: photoDataUrl || null,
  };

  db.pets.push(petData);
  writeDB(db);
  res.json(petData);
});

// 반려동물 프로필 삭제
router.delete('/by-id/:petId', (req, res) => {
  const db = readDB();
  const userPets = getUserPets(db, req.currentUserId);
  const targetIndex = db.pets.findIndex(
    (item) => item.id === req.params.petId && item.userId === req.currentUserId
  );

  if (targetIndex < 0) {
    return res.status(404).json({ message: '삭제할 반려동물 프로필을 찾을 수 없습니다.' });
  }

  if (userPets.length <= 1) {
    return res.status(400).json({ message: '마지막 반려동물 프로필은 삭제할 수 없습니다.' });
  }

  db.pets.splice(targetIndex, 1);
  writeDB(db);
  res.json({ message: '반려동물 프로필을 삭제했습니다.' });
});

module.exports = router;
