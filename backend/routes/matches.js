// AI(규칙 기반) 산책 짝 추천 API + LLM 궁합 설명
const express = require('express');
const { readDB } = require('../db');
const { calculateMatchDetail } = require('../matching');
const { attachLlmExplanations } = require('../match-explainer');
const { getBlockedUserIds } = require('./blocks');

const router = express.Router();

// 내 반려동물과 궁합이 좋은 산책 짝 리스트 조회 (점수 내림차순)
router.get('/', async (req, res) => {
  const db = readDB();
  const blockedUserIds = getBlockedUserIds(db, req.currentUserId);
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
    return res.status(404).json({ message: '먼저 반려동물 프로필을 등록해주세요.' });
  }

  const candidates = db.pets
    .filter((item) => item.userId !== req.currentUserId)
    .filter((item) => !blockedUserIds.includes(item.userId))
    .map((candidatePet) => {
      const owner = db.users.find((user) => user.id === candidatePet.userId);
      const detail = calculateMatchDetail(myPet, candidatePet);

      return {
        pet: candidatePet,
        owner: owner ? { id: owner.id, name: owner.name, region: owner.region } : null,
        matchScore: detail.totalScore,
        // AI가 어떤 근거로 점수를 계산했는지 화면에 보여주기 위한 세부 항목
        breakdown: {
          sharedTags: detail.sharedTags,
          tagScore: detail.tagScore,
          energyScore: detail.energyScore,
          sizeScore: detail.sizeScore,
          sizeMatch: detail.sizeMatch,
        },
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  await attachLlmExplanations(myPet, candidates);

  res.json(candidates);
});

module.exports = router;
