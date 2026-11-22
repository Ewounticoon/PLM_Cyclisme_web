// iOS 27 can draw its own progressive blur over installed web apps. Flutter's
// canvas AppBar is not a DOM fixed header recognized by WebKit's edge sampler.
// Use a paint-free compatibility surface; never change Flutter's geometry.
// WebKit LocalFrameView::fixedContainerEdges (d620932d8ce37cf83f60d5c50dace2d50fed4f80)
// rejects backgrounds <=10px high. 11px satisfies that check, not a UI inset.
(() => {
  'use strict';
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const installed = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const clipsText = typeof CSS !== 'undefined' && (CSS.supports('background-clip', 'text') || CSS.supports('-webkit-background-clip', 'text'));
  if (!ios || !installed || !clipsText || document.getElementById('plm-ios-pwa-header-surface')) return;
  const surface = document.createElement('div');
  surface.id = 'plm-ios-pwa-header-surface';
  surface.setAttribute('aria-hidden', 'true');
  surface.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:11px;z-index:2147483647;' +
    'pointer-events:none;user-select:none;background-clip:text;-webkit-background-clip:text;';
  // Empty text clips away every painted pixel, while the computed opaque
  // background remains available to WebKit's fixed-container sampler.
  surface.style.backgroundColor = getComputedStyle(document.documentElement).backgroundColor;
  document.body.appendChild(surface);
  window.plmSetIosHeaderColor = color => { surface.style.backgroundColor = color; };
})();
