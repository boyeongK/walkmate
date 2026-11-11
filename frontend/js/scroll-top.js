// 긴 목록 스크롤 시 맨 위로 이동 버튼 (전 페이지 공통)
(function initScrollTopButton() {
  const appFrameElement = document.querySelector('.app_frame');
  const scrollRootElement =
    document.querySelector('.app_main') ||
    document.querySelector('.onboarding_main');

  if (!appFrameElement || !scrollRootElement) {
    return;
  }

  const scrollTopButtonElement = document.createElement('button');
  scrollTopButtonElement.type = 'button';
  scrollTopButtonElement.className = 'scroll_top_button';
  scrollTopButtonElement.setAttribute('aria-label', '맨 위로 이동');
  scrollTopButtonElement.hidden = true;
  scrollTopButtonElement.innerHTML = `
    <svg class="scroll_top_icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 14l5-5 5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  appFrameElement.appendChild(scrollTopButtonElement);

  const bottomNavElement = document.querySelector('.bottom_nav');
  const navGap = 14;

  // 하단 내비 높이만큼 버튼을 위로 올려 겹치지 않게 함
  function updateScrollTopButtonPosition() {
    if (bottomNavElement) {
      scrollTopButtonElement.style.bottom = `${bottomNavElement.offsetHeight + navGap}px`;
      return;
    }

    scrollTopButtonElement.style.bottom = '20px';
  }

  updateScrollTopButtonPosition();
  window.addEventListener('resize', updateScrollTopButtonPosition);

  const showScrollThreshold = 160;

  function updateScrollTopButtonVisibility() {
    const shouldShow = scrollRootElement.scrollTop > showScrollThreshold;
    scrollTopButtonElement.hidden = !shouldShow;
  }

  scrollRootElement.addEventListener('scroll', updateScrollTopButtonVisibility, { passive: true });

  scrollTopButtonElement.addEventListener('click', () => {
    scrollRootElement.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  });

  updateScrollTopButtonVisibility();
})();
