// LLM 기반 매칭 궁합 설명 생성 (OpenAI 호환 API)
// API 키가 없으면 규칙 기반 fallback 문구를 사용합니다.

const MAX_LLM_TARGETS = 5;
const LLM_TIMEOUT_MS = 15000;

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

function applyFallbackExplanations(myPet, candidates) {
  candidates.forEach((candidate) => {
    candidate.llmExplanation = buildFallbackMatchExplanation(myPet, candidate);
    candidate.explanationSource = 'fallback';
  });
}

function buildLlmPrompt(myPet, candidates) {
  const myPetSummary = {
    name: myPet.name,
    breed: myPet.breed,
    size: myPet.size,
    energyLevel: myPet.energyLevel,
    tags: myPet.tags,
  };

  const candidateSummaries = candidates.map((candidate) => ({
    petId: candidate.pet.id,
    petName: candidate.pet.name,
    breed: candidate.pet.breed,
    size: candidate.pet.size,
    energyLevel: candidate.pet.energyLevel,
    tags: candidate.pet.tags,
    matchScore: candidate.matchScore,
    breakdown: candidate.breakdown,
  }));

  return `
내 반려동물: ${JSON.stringify(myPetSummary, null, 0)}
매칭 후보 목록: ${JSON.stringify(candidateSummaries, null, 0)}

각 후보에 대해 한국어 1~2문장으로 궁합 설명을 작성해 주세요.
점수 근거(breakdown)를 반영하되, 보호자가 이해하기 쉽게 친근한 말투로 써 주세요.
반드시 아래 JSON 형식만 반환하세요:
{"explanations":[{"petId":"...","text":"..."}]}
`.trim();
}

async function requestLlmExplanations(myPet, candidates) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: '당신은 반려동물 산책 매칭 전문가입니다. JSON만 출력합니다.',
          },
          {
            role: 'user',
            content: buildLlmPrompt(myPet, candidates),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API 오류 (${response.status}): ${errorText.slice(0, 200)}`);
    }

    const payload = await response.json();
    const contentText = payload.choices?.[0]?.message?.content;
    if (!contentText) {
      throw new Error('LLM 응답 본문이 비어 있습니다.');
    }

    const parsed = JSON.parse(contentText);
    if (!Array.isArray(parsed.explanations)) {
      throw new Error('LLM JSON 형식이 올바르지 않습니다.');
    }

    return parsed.explanations;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function attachLlmExplanations(myPet, candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return;
  }

  const llmTargets = candidates.slice(0, MAX_LLM_TARGETS);
  const remainingTargets = candidates.slice(MAX_LLM_TARGETS);

  try {
    const llmResults = await requestLlmExplanations(myPet, llmTargets);

    if (!llmResults) {
      applyFallbackExplanations(myPet, candidates);
      return;
    }

    const explanationMap = new Map(
      llmResults
        .filter((item) => item && item.petId && item.text)
        .map((item) => [item.petId, String(item.text).trim()])
    );

    llmTargets.forEach((candidate) => {
      const llmText = explanationMap.get(candidate.pet.id);
      if (llmText) {
        candidate.llmExplanation = llmText;
        candidate.explanationSource = 'llm';
        return;
      }

      candidate.llmExplanation = buildFallbackMatchExplanation(myPet, candidate);
      candidate.explanationSource = 'fallback';
    });

    remainingTargets.forEach((candidate) => {
      candidate.llmExplanation = buildFallbackMatchExplanation(myPet, candidate);
      candidate.explanationSource = 'fallback';
    });
  } catch (error) {
    console.warn('[match-explainer] LLM 설명 생성 실패, fallback 사용:', error.message);
    applyFallbackExplanations(myPet, candidates);
  }
}

module.exports = {
  attachLlmExplanations,
  buildFallbackMatchExplanation,
};
