// Read an obstruction reported by Android browsers. Never change the viewport,
// page margins, canvas scale or iOS/desktop behavior to obtain that measurement.
(() => {
  'use strict';
  const android = navigator.userAgentData?.platform === 'Android' || /\bAndroid\b/i.test(navigator.userAgent || '');
  if (!android || window.plmReadSafeArea) return;
  const listeners = new Set();
  let bottom = 0;
  let queued = false;
  const probe = document.createElement('div');
  probe.id = 'plm-safe-area-probe';
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;top:0;left:0;width:0;height:0;' +
    'padding-bottom:env(safe-area-inset-bottom,0px);';
  function measure() {
    queued = false;
    const value = Number.parseFloat(getComputedStyle(probe).getPropertyValue('padding-bottom'));
    const next = Number.isFinite(value) && value > 0 ? value : 0;
    if (next !== bottom) {
      bottom = next;
      for (const listener of listeners) listener();
    }
  }
  function schedule() {
    if (!queued) { queued = true; requestAnimationFrame(measure); }
  }
  // Retain the bridge API for installed clients updating their cached assets.
  window.plmReadSafeArea = () => JSON.stringify({ top: 0, right: 0, bottom, left: 0 });
  window.plmWatchSafeArea = listener => listeners.add(listener);
  window.plmUnwatchSafeArea = listener => listeners.delete(listener);
  document.body.appendChild(probe);
  measure();
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(schedule).observe(probe, { box: 'border-box' });
})();
