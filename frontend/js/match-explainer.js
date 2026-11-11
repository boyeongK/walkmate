// 매칭 궁합 설명 UI · 오프라인 fallback 문구 공통 헬퍼

function escapeMatchHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildFallbackMatchExplanation(myPet, candidate) {
  const { pet, matchScore, breakdown } = candidate;
  const reasonParts = [];

  if (breakdown.sharedTags && breakdown.sharedTags.length > 0) {
    reasonParts.push(`${breakdown.sharedTags.join(', ')} 성향이 서로 비슷해요`);
  } else {
    reasonParts.push('성향 태그 겹치는 부분은 적어요');
  }

  if (breakdown.sizeMatch) {
    reasonParts.push('체격도 비슷해 산책 템포를 맞추기 쉬워요');
  } else {
    reasonParts.push('체격 차이가 있어 산책 속도·거리 조율이 필요할 수 있어요');
  }

  if (breakdown.energyScore >= 20) {
    reasonParts.push('활동량도 잘 맞는 편이에요');
  } else if (breakdown.energyScore >= 10) {
    reasonParts.push('활동량은 조금 차이가 있어요');
  } else {
    reasonParts.push('활동량 차이가 커서 산책 전에 텐션 조율이 중요해요');
  }

  let summaryPrefix = '';
  if (matchScore >= 75) {
    summaryPrefix = `${pet.name}와(과) 궁합이 매우 좋은 편이에요.`;
  } else if (matchScore >= 50) {
    summaryPrefix = `${pet.name}와(과) 궁합이 괜찮은 편이에요.`;
  } else if (matchScore >= 25) {
    summaryPrefix = `${pet.name}와(과)는 일부 조건에서 맞지만, 세심한 조율이 필요해요.`;
  } else {
    summaryPrefix = `${pet.name}와(과)는 현재 프로필 기준으로 궁합 점수가 낮아요.`;
  }

  return `${summaryPrefix} ${reasonParts.join('. ')}.`;
}

function renderMatchLlmExplanationHtml(match) {
  if (!match || !match.llmExplanation) {
    return '';
  }

  const labelText = match.explanationSource === 'llm' ? 'LLM 분석' : '궁합 요약';
  const safeExplanation = escapeMatchHtml(match.llmExplanation);

  return `
    <div class="match_llm_explanation">
      <span class="match_llm_explanation_label">${labelText}</span>
      <p class="match_llm_explanation_text">${safeExplanation}</p>
    </div>
  `;
}
