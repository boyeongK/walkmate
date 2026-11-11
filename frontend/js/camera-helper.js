// 산책 인증 사진 촬영/선택 헬퍼 (브라우저 + Capacitor APK)
(function () {
  const MAX_IMAGE_WIDTH = 960;
  const JPEG_QUALITY = 0.72;

  let activeMediaStream = null;
  let cameraModalElements = null;

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('사진을 불러오지 못했습니다.'));
      reader.readAsDataURL(file);
    });
  }

  function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const imageElement = new Image();
      imageElement.onload = () => resolve(imageElement);
      imageElement.onerror = () => reject(new Error('사진을 처리하지 못했습니다.'));
      imageElement.src = dataUrl;
    });
  }

  async function compressDataUrl(dataUrl) {
    const imageElement = await loadImageFromDataUrl(dataUrl);
    const scale = Math.min(1, MAX_IMAGE_WIDTH / imageElement.width);
    const canvasElement = document.createElement('canvas');
    canvasElement.width = Math.round(imageElement.width * scale);
    canvasElement.height = Math.round(imageElement.height * scale);

    const context = canvasElement.getContext('2d');
    context.drawImage(imageElement, 0, 0, canvasElement.width, canvasElement.height);

    return canvasElement.toDataURL('image/jpeg', JPEG_QUALITY);
  }

  function stopActiveMediaStream() {
    if (!activeMediaStream) {
      return;
    }

    activeMediaStream.getTracks().forEach((track) => track.stop());
    activeMediaStream = null;
  }

  function ensureCameraModalElements() {
    if (cameraModalElements) {
      return cameraModalElements;
    }

    const modalElement = document.createElement('div');
    modalElement.className = 'walk_camera_modal';
    modalElement.hidden = true;
    modalElement.innerHTML = `
      <div class="walk_camera_modal_panel" role="dialog" aria-modal="true" aria-labelledby="walk_camera_modal_title">
        <p class="walk_camera_modal_title" id="walk_camera_modal_title">인증 사진 촬영</p>
        <video class="walk_camera_preview" data-camera-preview autoplay playsinline muted></video>
        <div class="walk_camera_actions">
          <button type="button" class="btn_outline" data-camera-cancel>취소</button>
          <button type="button" class="btn_primary" data-camera-capture>촬영하기</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalElement);

    cameraModalElements = {
      modalElement,
      previewElement: modalElement.querySelector('[data-camera-preview]'),
      captureButton: modalElement.querySelector('[data-camera-capture]'),
      cancelButton: modalElement.querySelector('[data-camera-cancel]'),
    };

    return cameraModalElements;
  }

  async function openBrowserCameraStream() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('이 브라우저에서는 카메라를 사용할 수 없습니다.');
    }

    const cameraConstraintsList = [
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: true, audio: false },
    ];

    let lastError = null;

    for (const constraints of cameraConstraintsList) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        activeMediaStream = mediaStream;
        return mediaStream;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError && lastError.name === 'NotAllowedError') {
      throw new Error('카메라 권한이 필요합니다. 브라우저 주소창 옆 카메라 아이콘에서 허용해주세요.');
    }

    throw new Error('카메라를 열 수 없습니다. 웹캠 연결 상태를 확인해주세요.');
  }

  function captureFrameFromVideo(videoElement) {
    const canvasElement = document.createElement('canvas');
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    const context = canvasElement.getContext('2d');
    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

    return canvasElement.toDataURL('image/jpeg', JPEG_QUALITY);
  }

  function pickPhotoWithWebCamera() {
    return new Promise(async (resolve, reject) => {
      const { modalElement, previewElement, captureButton, cancelButton } = ensureCameraModalElements();

      let isFinished = false;

      function finishWithSuccess(dataUrl) {
        if (isFinished) {
          return;
        }

        isFinished = true;
        modalElement.hidden = true;
        stopActiveMediaStream();
        previewElement.srcObject = null;
        resolve(dataUrl);
      }

      function finishWithCancel() {
        if (isFinished) {
          return;
        }

        isFinished = true;
        modalElement.hidden = true;
        stopActiveMediaStream();
        previewElement.srcObject = null;
        reject(new Error('사진 촬영이 취소되었습니다.'));
      }

      function onCaptureClick() {
        if (!previewElement.videoWidth) {
          return;
        }

        try {
          const capturedDataUrl = captureFrameFromVideo(previewElement);
          finishWithSuccess(capturedDataUrl);
        } catch (error) {
          finishWithCancel();
          reject(error);
        }
      }

      captureButton.onclick = onCaptureClick;
      cancelButton.onclick = finishWithCancel;

      try {
        const mediaStream = await openBrowserCameraStream();
        previewElement.srcObject = mediaStream;
        modalElement.hidden = false;
        await previewElement.play();
      } catch (error) {
        isFinished = true;
        modalElement.hidden = true;
        stopActiveMediaStream();
        previewElement.srcObject = null;
        reject(error);
      }
    });
  }

  let profilePickerModalElements = null;

  function ensureProfilePickerModalElements() {
    if (profilePickerModalElements) {
      return profilePickerModalElements;
    }

    const modalElement = document.createElement('div');
    modalElement.className = 'walk_camera_modal';
    modalElement.hidden = true;
    modalElement.innerHTML = `
      <div class="walk_camera_modal_panel" role="dialog" aria-modal="true">
        <p class="walk_camera_modal_title">프로필 사진 등록</p>
        <p class="walk_camera_modal_desc">웹캠으로 촬영하거나, PC/폰에 저장된 사진을 선택할 수 있어요.</p>
        <div class="walk_camera_actions">
          <button type="button" class="btn_primary btn_full" data-profile-pick-webcam>웹캠으로 촬영</button>
          <button type="button" class="btn_outline btn_full" data-profile-pick-file>파일에서 선택</button>
          <button type="button" class="btn_text btn_full" data-profile-pick-cancel>취소</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalElement);

    profilePickerModalElements = {
      modalElement,
      webcamButton: modalElement.querySelector('[data-profile-pick-webcam]'),
      fileButton: modalElement.querySelector('[data-profile-pick-file]'),
      cancelButton: modalElement.querySelector('[data-profile-pick-cancel]'),
    };

    return profilePickerModalElements;
  }

  function pickProfilePhotoOnBrowser() {
    return new Promise((resolve, reject) => {
      const { modalElement, webcamButton, fileButton, cancelButton } = ensureProfilePickerModalElements();
      let isFinished = false;

      function closePickerModal() {
        modalElement.hidden = true;
      }

      function finishWithResult(taskPromise) {
        closePickerModal();
        taskPromise.then(resolve).catch(reject);
      }

      function finishWithCancel() {
        if (isFinished) {
          return;
        }

        isFinished = true;
        closePickerModal();
        reject(new Error('사진 선택이 취소되었습니다.'));
      }

      webcamButton.onclick = () => {
        if (isFinished) {
          return;
        }

        isFinished = true;
        finishWithResult(
          pickPhotoWithWebCamera().then((dataUrl) => compressDataUrl(dataUrl))
        );
      };

      fileButton.onclick = () => {
        if (isFinished) {
          return;
        }

        isFinished = true;
        finishWithResult(pickPhotoWithFileInput());
      };

      cancelButton.onclick = finishWithCancel;
      modalElement.hidden = false;
    });
  }

  function pickPhotoWithFileInput() {
    return new Promise((resolve, reject) => {
      const inputElement = document.createElement('input');
      inputElement.type = 'file';
      inputElement.accept = 'image/*';

      inputElement.addEventListener('change', async () => {
        const selectedFile = inputElement.files && inputElement.files[0];

        if (!selectedFile) {
          reject(new Error('사진 촬영이 취소되었습니다.'));
          return;
        }

        try {
          const originalDataUrl = await readFileAsDataUrl(selectedFile);
          const compressedDataUrl = await compressDataUrl(originalDataUrl);
          resolve(compressedDataUrl);
        } catch (error) {
          reject(error);
        }
      });

      inputElement.click();
    });
  }

  function getCameraPlugin() {
    if (!window.Capacitor) {
      return null;
    }

    if (window.Capacitor.Plugins && window.Capacitor.Plugins.Camera) {
      return window.Capacitor.Plugins.Camera;
    }

    if (typeof window.Capacitor.registerPlugin === 'function') {
      return window.Capacitor.registerPlugin('Camera');
    }

    return null;
  }

  async function ensureCameraPermission(cameraPlugin) {
    const permissionStatus = await cameraPlugin.checkPermissions();

    if (permissionStatus.camera === 'granted') {
      return;
    }

    const requestedStatus = await cameraPlugin.requestPermissions({ permissions: ['camera'] });

    if (requestedStatus.camera !== 'granted') {
      throw new Error('카메라 권한이 필요합니다. 설정에서 허용해주세요.');
    }
  }

  async function pickPhotoWithCapacitorCamera(options) {
    const cameraPlugin = getCameraPlugin();
    const usePromptSource = options && options.allowGallery;

    if (!cameraPlugin) {
      throw new Error('카메라 플러그인을 사용할 수 없습니다.');
    }

    await ensureCameraPermission(cameraPlugin);

    const photoResult = await cameraPlugin.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: 'base64',
      source: usePromptSource ? 'PROMPT' : 'CAMERA',
      saveToGallery: false,
      width: MAX_IMAGE_WIDTH,
      correctOrientation: true,
    });

    if (!photoResult || !photoResult.base64String) {
      throw new Error('사진 촬영이 취소되었습니다.');
    }

    const mimeType = photoResult.format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${photoResult.base64String}`;
    return compressDataUrl(dataUrl);
  }

  function isNativeCapacitorApp() {
    return typeof window.Capacitor !== 'undefined'
      && typeof window.Capacitor.isNativePlatform === 'function'
      && window.Capacitor.isNativePlatform();
  }

  async function captureWalkCertifyPhoto() {
    try {
      if (isNativeCapacitorApp()) {
        return await pickPhotoWithCapacitorCamera({ allowGallery: false });
      }

      try {
        const capturedDataUrl = await pickPhotoWithWebCamera();
        return compressDataUrl(capturedDataUrl);
      } catch (webCameraError) {
        if (webCameraError.message === '사진 촬영이 취소되었습니다.') {
          throw webCameraError;
        }

        const fallbackDataUrl = await pickPhotoWithFileInput();
        return compressDataUrl(fallbackDataUrl);
      }
    } catch (error) {
      if (error && error.message === 'User cancelled photos app.') {
        throw new Error('사진 촬영이 취소되었습니다.');
      }

      throw error;
    }
  }

  async function captureProfilePhoto() {
    try {
      if (isNativeCapacitorApp()) {
        return await pickPhotoWithCapacitorCamera({ allowGallery: true });
      }

      return await pickProfilePhotoOnBrowser();
    } catch (error) {
      if (error && error.message === 'User cancelled photos app.') {
        throw new Error('사진 선택이 취소되었습니다.');
      }

      throw error;
    }
  }

  window.walkCameraHelper = {
    captureWalkCertifyPhoto,
    captureProfilePhoto,
  };
})();
