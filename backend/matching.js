// 산책 궁합 매칭 스코어링 로직
// 1차 MVP는 규칙 기반으로 시작하고, 이후 산책 데이터가 쌓이면 AI 모델로 고도화할 예정입니다.

// 체력/활동량 레벨을 숫자로 변환해 비교하기 위한 매핑
const ENERGY_LEVEL_SCORE = { 낮음: 1, 중간: 2, 높음: 3 };

// 두 반려동물의 궁합 점수를 항목별로 나눠서 계산합니다.
// 사용자가 "왜 이 점수가 나왔는지" 확인할 수 있도록 세부 근거를 함께 반환합니다.
function calculateMatchDetail(myPet, candidatePet) {
  // 성향 태그가 겹칠수록 높은 점수 (태그 1개당 20점, 최대 60점)
  const sharedTags = myPet.tags.filter((tag) => candidatePet.tags.includes(tag));
  const tagScore = Math.min(sharedTags.length * 20, 60);

  // 체력/활동량이 비슷할수록 높은 점수 (최대 25점)
  const myEnergy = ENERGY_LEVEL_SCORE[myPet.energyLevel] || 2;
  const candidateEnergy = ENERGY_LEVEL_SCORE[candidatePet.energyLevel] || 2;
  const energyDiff = Math.abs(myEnergy - candidateEnergy);
  const energyScore = Math.max(25 - energyDiff * 12, 0);

  // 크기(소형/중형/대형)가 같으면 추가 점수 (최대 15점) - 몸집 차이로 인한 스트레스 예방
  const sizeMatch = myPet.size === candidatePet.size;
  const sizeScore = sizeMatch ? 15 : 0;

  const totalScore = Math.min(Math.round(tagScore + energyScore + sizeScore), 100);

  return {
    totalScore,
    sharedTags,
    tagScore,
    energyScore,
    sizeScore,
    sizeMatch,
  };
}

// 최종 점수만 필요한 곳(기존 코드 호환용)에서 사용
function calculateMatchScore(myPet, candidatePet) {
  return calculateMatchDetail(myPet, candidatePet).totalScore;
}

module.exports = { calculateMatchScore, calculateMatchDetail };
