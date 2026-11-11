// APK 단독 실행용 로컬 API (서버/와이파이 없이 동작)
// 데모 데이터는 data/demo-db.json 에서 불러와 localStorage에 저장합니다.
(function () {
  const DB_STORAGE_KEY = 'walkmate_demo_db';
  const DB_VERSION_KEY = 'walkmate_demo_db_version';
  const DB_VERSION = '12'; // 데모 데이터 구조/내용 변경 시 숫자 올리기
  const DEMO_USER_IDS = ['u1', 'u2', 'u3'];
  const ALLOWED_STATUS_MESSAGES = ['5분 늦어요', '도착했어요', '취소할게요'];
  const PENDING_REQUEST_EXPIRE_MS = 12 * 60 * 60 * 1000; // 보낸 요청 12시간 미응답 시 자동 취소
  const ENERGY_LEVEL_SCORE = { 낮음: 1, 중간: 2, 높음: 3 };

  let dbCache = null;
  let dbInitPromise = null;

  function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function readDb() {
    if (!dbCache) {
      throw new Error('데모 데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
    return cloneData(dbCache);
  }

  function writeDb(nextDb) {
    dbCache = cloneData(nextDb);
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(dbCache));
  }

  async function initLocalDb() {
    if (dbCache) {
      return dbCache;
    }

    if (!dbInitPromise) {
      dbInitPromise = (async () => {
        const savedDbText = localStorage.getItem(DB_STORAGE_KEY);
        const savedVersion = localStorage.getItem(DB_VERSION_KEY);

        if (savedDbText && savedVersion === DB_VERSION) {
          dbCache = JSON.parse(savedDbText);
          return dbCache;
        }

        const response = await fetch('data/demo-db.json');
        if (!response.ok) {
          throw new Error('데모 데이터를 불러오지 못했습니다.');
        }

        const freshDemoDb = await response.json();
        let previousDb = null;

        if (savedDbText) {
          try {
            previousDb = JSON.parse(savedDbText);
          } catch (parseError) {
            previousDb = null;
          }
        }

        // 버전이 바뀌어도 내가 만든 계정·반려동물·요청은 유지
        if (previousDb) {
          dbCache = mergeCustomUserData(previousDb, freshDemoDb);
        } else {
          dbCache = freshDemoDb;
        }

        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(dbCache));
        localStorage.setItem(DB_VERSION_KEY, DB_VERSION);
        return dbCache;
      })();
    }

    return dbInitPromise;
  }

  function isCustomUserId(userId) {
    return Boolean(userId) && !DEMO_USER_IDS.includes(userId);
  }

  function mergeCustomUserData(previousDb, freshDemoDb) {
    const mergedDb = cloneData(freshDemoDb);
    const customUserIds = new Set(
      (previousDb.users || [])
        .filter((user) => isCustomUserId(user.id))
        .map((user) => user.id)
    );

    if (customUserIds.size === 0) {
      return mergedDb;
    }

    (previousDb.users || []).forEach((user) => {
      if (!isCustomUserId(user.id)) {
        return;
      }

      const exists = mergedDb.users.find((item) => item.id === user.id);
      if (!exists) {
        mergedDb.users.push(cloneData(user));
      }
    });

    (previousDb.pets || []).forEach((pet) => {
      if (!customUserIds.has(pet.userId)) {
        return;
      }

      const petIndex = mergedDb.pets.findIndex((item) => item.id === pet.id);
      if (petIndex >= 0) {
        mergedDb.pets[petIndex] = cloneData(pet);
        return;
      }

      mergedDb.pets.push(cloneData(pet));
    });

    (previousDb.requests || []).forEach((request) => {
      const involvesCustomUser = customUserIds.has(request.fromUserId) || customUserIds.has(request.toUserId);
      if (!involvesCustomUser) {
        return;
      }

      const requestIndex = mergedDb.requests.findIndex((item) => item.id === request.id);
      if (requestIndex >= 0) {
        mergedDb.requests[requestIndex] = cloneData(request);
        return;
      }

      mergedDb.requests.push(cloneData(request));
    });

    if (Array.isArray(previousDb.blocks)) {
      if (!Array.isArray(mergedDb.blocks)) {
        mergedDb.blocks = [];
      }

      previousDb.blocks.forEach((blockRecord) => {
        if (!customUserIds.has(blockRecord.userId)) {
          return;
        }

        const exists = mergedDb.blocks.find((item) => item.id === blockRecord.id);
        if (!exists) {
          mergedDb.blocks.push(cloneData(blockRecord));
        }
      });
    }

    return mergedDb;
  }

  function calculateMatchDetail(myPet, candidatePet) {
    const sharedTags = myPet.tags.filter((tag) => candidatePet.tags.includes(tag));
    const tagScore = Math.min(sharedTags.length * 20, 60);

    const myEnergy = ENERGY_LEVEL_SCORE[myPet.energyLevel] || 2;
    const candidateEnergy = ENERGY_LEVEL_SCORE[candidatePet.energyLevel] || 2;
    const energyDiff = Math.abs(myEnergy - candidateEnergy);
    const energyScore = Math.max(25 - energyDiff * 12, 0);

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

  function createApiError(message, status) {
    const error = new Error(message);
    error.status = status || 400;
    return error;
  }

  function handleUsers(method, pathParts, body, currentUserId) {
    const db = readDb();

    if (method === 'GET' && pathParts.length === 1 && pathParts[0] === 'me') {
      const user = db.users.find((item) => item.id === currentUserId);
      if (!user) {
        throw createApiError('사용자를 찾을 수 없습니다.', 404);
      }
      return user;
    }

    if (method === 'GET' && pathParts.length === 0) {
      return db.users;
    }

    if (method === 'POST' && pathParts.length === 0) {
      const name = body && body.name;
      const region = body && body.region;

      if (!name || !name.trim()) {
        throw createApiError('이름을 입력해주세요.', 400);
      }

      const newUser = {
        id: `u${Date.now()}`,
        name: name.trim(),
        phone: '',
        region: region && region.trim() ? region.trim() : '지역 미설정',
        verified: true,
        createdAt: Date.now(),
      };

      db.users.push(newUser);
      writeDb(db);
      return newUser;
    }

    throw createApiError('요청한 API를 찾을 수 없습니다.', 404);
  }

  function handlePets(method, pathParts, body, currentUserId, activePetId) {
    const db = readDb();

    if (method === 'GET' && pathParts.length === 1 && pathParts[0] === 'mine') {
      return getUserPets(db, currentUserId);
    }

    if (method === 'GET' && pathParts.length === 1 && pathParts[0] === 'me') {
      const pet = resolveActivePet(db, currentUserId, activePetId);
      if (!pet) {
        throw createApiError('등록된 반려동물 프로필이 없습니다.', 404);
      }
      return pet;
    }

    if (method === 'GET' && pathParts.length === 2 && pathParts[0] === 'by-id') {
      const pet = db.pets.find((item) => item.id === pathParts[1]);
      if (!pet) {
        throw createApiError('반려동물 프로필을 찾을 수 없습니다.', 404);
      }
      return pet;
    }

    if (method === 'GET' && pathParts.length === 2 && pathParts[0] === 'user') {
      const userPets = getUserPets(db, pathParts[1]);
      if (userPets.length === 0) {
        throw createApiError('해당 사용자의 반려동물 프로필이 없습니다.', 404);
      }
      return userPets[0];
    }

    if (method === 'POST' && pathParts.length === 0) {
      const { id, name, breed, age, size, energyLevel, tags, photoDataUrl } = body || {};

      if (!name || !breed || !size || !energyLevel) {
        throw createApiError('필수 항목이 누락되었습니다. (이름, 견종, 크기, 활동량)', 400);
      }

      if (id) {
        const existingIndex = db.pets.findIndex((item) => item.id === id && item.userId === currentUserId);
        if (existingIndex < 0) {
          throw createApiError('수정할 반려동물 프로필을 찾을 수 없습니다.', 404);
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
        writeDb(db);
        return petData;
      }

      const petData = {
        id: `p${Date.now()}`,
        userId: currentUserId,
        name,
        breed,
        age: Number(age) || 0,
        size,
        energyLevel,
        tags: Array.isArray(tags) ? tags : [],
        photoDataUrl: photoDataUrl || null,
      };

      db.pets.push(petData);
      writeDb(db);
      return petData;
    }

    if (method === 'DELETE' && pathParts.length === 2 && pathParts[0] === 'by-id') {
      const userPets = getUserPets(db, currentUserId);
      const targetIndex = db.pets.findIndex(
        (item) => item.id === pathParts[1] && item.userId === currentUserId
      );

      if (targetIndex < 0) {
        throw createApiError('삭제할 반려동물 프로필을 찾을 수 없습니다.', 404);
      }

      if (userPets.length <= 1) {
        throw createApiError('마지막 반려동물 프로필은 삭제할 수 없습니다.', 400);
      }

      db.pets.splice(targetIndex, 1);
      writeDb(db);
      return { message: '반려동물 프로필을 삭제했습니다.' };
    }

    throw createApiError('요청한 API를 찾을 수 없습니다.', 404);
  }

  function handleMatches(method, pathParts, currentUserId, activePetId) {
    const db = readDb();

    if (method === 'GET' && pathParts.length === 0) {
      const myPet = resolveActivePet(db, currentUserId, activePetId);
      if (!myPet) {
        throw createApiError('먼저 반려동물 프로필을 등록해주세요.', 404);
      }

      const matches = db.pets
        .filter((item) => item.userId !== currentUserId)
        .filter((item) => !getBlockedUserIds(db, currentUserId).includes(item.userId))
        .map((candidatePet) => {
          const owner = db.users.find((user) => user.id === candidatePet.userId);
          const detail = calculateMatchDetail(myPet, candidatePet);

          return {
            pet: candidatePet,
            owner: owner ? { id: owner.id, name: owner.name, region: owner.region } : null,
            matchScore: detail.totalScore,
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

      // 오프라인 APK에서는 LLM API를 호출하지 않고 규칙 기반 설명을 사용
      matches.forEach((matchItem) => {
        matchItem.llmExplanation = buildFallbackMatchExplanation(myPet, matchItem);
        matchItem.explanationSource = 'fallback';
      });

      return matches;
    }

    throw createApiError('요청한 API를 찾을 수 없습니다.', 404);
  }

  function handleRequests(method, pathParts, body, currentUserId, activePetId) {
    const db = readDb();

    if (expireStalePendingRequests(db)) {
      writeDb(db);
    }

    if (method === 'GET' && pathParts.length === 0) {
      return db.requests
        .filter((item) => item.fromUserId === currentUserId || item.toUserId === currentUserId)
        .map((item) => enrichRequest(item, db))
        .sort((a, b) => b.createdAt - a.createdAt);
    }

    if (method === 'GET' && pathParts.length === 1) {
      const request = db.requests.find((item) => item.id === pathParts[0]);
      if (!request) {
        throw createApiError('요청을 찾을 수 없습니다.', 404);
      }
      return enrichRequest(request, db);
    }

    if (method === 'POST' && pathParts.length === 0) {
      const { toUserId, toPetId, timeSlot, place } = body || {};
      if (!toUserId || !timeSlot || !place) {
        throw createApiError('상대, 시간대, 장소를 모두 선택해주세요.', 400);
      }

      const myPet = resolveActivePet(db, currentUserId, activePetId);
      if (!myPet) {
        throw createApiError('먼저 반려동물 프로필을 등록해주세요.', 400);
      }

      if (getBlockedUserIds(db, currentUserId).includes(toUserId)) {
        throw createApiError('매칭 제외한 상대에게는 요청을 보낼 수 없습니다.', 400);
      }

      const newRequest = {
        id: `r${Date.now()}`,
        fromUserId: currentUserId,
        fromPetId: myPet.id,
        toUserId,
        toPetId: toPetId || null,
        timeSlot,
        place,
        status: 'pending',
        walkPhase: 'not_started',
        statusLog: [],
        review: null,
        createdAt: Date.now(),
      };

      db.requests.push(newRequest);
      writeDb(db);
      return enrichRequest(newRequest, db);
    }

    if (method === 'PATCH' && pathParts.length === 2 && pathParts[1] === 'respond') {
      const request = db.requests.find((item) => item.id === pathParts[0]);
      if (!request) {
        throw createApiError('요청을 찾을 수 없습니다.', 404);
      }
      if (request.toUserId !== currentUserId) {
        throw createApiError('이 요청에 응답할 권한이 없습니다.', 403);
      }
      if (request.status === 'cancelled') {
        throw createApiError('이미 취소된 요청입니다.', 400);
      }
      if (request.status !== 'pending') {
        throw createApiError('이미 처리된 요청입니다.', 400);
      }
      if (!body || !['accept', 'reject'].includes(body.action)) {
        throw createApiError('action은 accept 또는 reject만 가능합니다.', 400);
      }

      if (body.action === 'reject') {
        const trimmedReason = (body.rejectReason || '').trim();
        const trimmedNote = (body.rejectNote || '').trim();

        if (!trimmedReason) {
          throw createApiError('거절 사유를 선택하거나 입력해주세요.', 400);
        }

        const now = Date.now();

        request.rejectInfo = {
          reason: trimmedReason,
          note: trimmedNote,
          rejectedBy: currentUserId,
          timestamp: now,
        };
        request.status = 'rejected';
        writeDb(db);
        return enrichRequest(request, db);
      }

      request.status = 'accepted';
      writeDb(db);
      return enrichRequest(request, db);
    }

    if (method === 'POST' && pathParts.length === 2 && pathParts[1] === 'status-messages') {
      const request = db.requests.find((item) => item.id === pathParts[0]);
      if (!request) {
        throw createApiError('요청을 찾을 수 없습니다.', 404);
      }
      if (!body || !ALLOWED_STATUS_MESSAGES.includes(body.message)) {
        throw createApiError('허용되지 않은 문구입니다.', 400);
      }

      if (body.message === '취소할게요') {
        const trimmedReason = (body.cancelReason || '').trim();
        const trimmedNote = (body.cancelNote || '').trim();

        if (!trimmedReason) {
          throw createApiError('취소 사유를 선택하거나 입력해주세요.', 400);
        }

        const now = Date.now();

        request.statusLog.push({
          message: body.message,
          cancelReason: trimmedReason,
          cancelNote: trimmedNote,
          by: currentUserId,
          timestamp: now,
        });

        request.cancelInfo = {
          reason: trimmedReason,
          note: trimmedNote,
          cancelledBy: currentUserId,
          timestamp: now,
        };
        request.status = 'cancelled';
        writeDb(db);
        return enrichRequest(request, db);
      }

      request.statusLog.push({
        message: body.message,
        by: currentUserId,
        timestamp: Date.now(),
      });

      writeDb(db);
      return enrichRequest(request, db);
    }

    if (method === 'POST' && pathParts.length === 2 && pathParts[1] === 'certify') {
      const request = db.requests.find((item) => item.id === pathParts[0]);
      if (!request) {
        throw createApiError('요청을 찾을 수 없습니다.', 404);
      }
      if (request.status !== 'accepted') {
        throw createApiError('수락된 약속만 인증할 수 있습니다.', 400);
      }
      if (!body || !['start', 'end'].includes(body.phase)) {
        throw createApiError('phase는 start 또는 end만 가능합니다.', 400);
      }
      if (!body.photoDataUrl || typeof body.photoDataUrl !== 'string') {
        throw createApiError('인증 사진을 촬영해주세요.', 400);
      }

      if (!request.certifyPhotos) {
        request.certifyPhotos = {};
      }

      const photoKey = body.phase === 'start' ? 'start' : 'end';
      request.certifyPhotos[photoKey] = {
        dataUrl: body.photoDataUrl,
        certifiedBy: currentUserId,
        timestamp: Date.now(),
      };
      request.walkPhase = body.phase === 'start' ? 'started' : 'ended';
      writeDb(db);
      return enrichRequest(request, db);
    }

    if (method === 'POST' && pathParts.length === 2 && pathParts[1] === 'review') {
      const request = db.requests.find((item) => item.id === pathParts[0]);
      if (!request) {
        throw createApiError('요청을 찾을 수 없습니다.', 404);
      }
      if (request.walkPhase !== 'ended') {
        throw createApiError('산책 종료 인증 후에 후기를 남길 수 있습니다.', 400);
      }
      if (!body || !body.rating || body.rating < 1 || body.rating > 5) {
        throw createApiError('별점은 1~5 사이로 입력해주세요.', 400);
      }

      request.review = {
        rating: Number(body.rating),
        comment: body.comment || '',
        reviewedBy: currentUserId,
        timestamp: Date.now(),
      };
      request.status = 'completed';
      writeDb(db);
      return enrichRequest(request, db);
    }

    throw createApiError('요청한 API를 찾을 수 없습니다.', 404);
  }

  function handleBlocks(method, pathParts, body, currentUserId) {
    const db = readDb();

    if (method === 'GET' && pathParts.length === 1 && pathParts[0] === 'mine') {
      return (db.blocks || [])
        .filter((item) => item.userId === currentUserId)
        .map((item) => enrichBlockRecord(item, db))
        .sort((a, b) => b.createdAt - a.createdAt);
    }

    if (method === 'POST' && pathParts.length === 0) {
      const { blockedUserId, requestId } = body || {};

      if (!blockedUserId) {
        throw createApiError('제외할 상대 정보가 없습니다.', 400);
      }

      if (blockedUserId === currentUserId) {
        throw createApiError('본인은 매칭 제외할 수 없습니다.', 400);
      }

      const targetUser = db.users.find((user) => user.id === blockedUserId);
      if (!targetUser) {
        throw createApiError('상대 사용자를 찾을 수 없습니다.', 404);
      }

      if (!Array.isArray(db.blocks)) {
        db.blocks = [];
      }

      const existingBlock = db.blocks.find(
        (item) => item.userId === currentUserId && item.blockedUserId === blockedUserId
      );

      if (existingBlock) {
        return enrichBlockRecord(existingBlock, db);
      }

      const newBlock = {
        id: `blk${Date.now()}`,
        userId: currentUserId,
        blockedUserId,
        requestId: requestId || null,
        createdAt: Date.now(),
      };

      db.blocks.push(newBlock);
      writeDb(db);
      return enrichBlockRecord(newBlock, db);
    }

    if (method === 'DELETE' && pathParts.length === 2 && pathParts[0] === 'user') {
      if (!Array.isArray(db.blocks)) {
        throw createApiError('매칭 제외 기록을 찾을 수 없습니다.', 404);
      }

      const targetIndex = db.blocks.findIndex(
        (item) => item.userId === currentUserId && item.blockedUserId === pathParts[1]
      );

      if (targetIndex < 0) {
        throw createApiError('매칭 제외 기록을 찾을 수 없습니다.', 404);
      }

      db.blocks.splice(targetIndex, 1);
      writeDb(db);
      return { message: '매칭 제외를 해제했습니다.' };
    }

    throw createApiError('요청한 API를 찾을 수 없습니다.', 404);
  }

  async function request(method, path, body, currentUserId, activePetId) {
    await initLocalDb();

    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    const segments = normalizedPath.split('/').filter(Boolean);

    if (segments.length === 0) {
      throw createApiError('요청한 API를 찾을 수 없습니다.', 404);
    }

    const resource = segments[0];
    const pathParts = segments.slice(1);

    if (resource === 'users') {
      return handleUsers(method, pathParts, body, currentUserId);
    }
    if (resource === 'pets') {
      return handlePets(method, pathParts, body, currentUserId, activePetId);
    }
    if (resource === 'matches') {
      return handleMatches(method, pathParts, currentUserId, activePetId);
    }
    if (resource === 'requests') {
      return handleRequests(method, pathParts, body, currentUserId, activePetId);
    }
    if (resource === 'blocks') {
      return handleBlocks(method, pathParts, body, currentUserId);
    }

    throw createApiError('요청한 API를 찾을 수 없습니다.', 404);
  }

  window.localApi = {
    request,
    initLocalDb,
  };
})();
