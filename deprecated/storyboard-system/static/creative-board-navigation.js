/* Pointer and wheel navigation for the Creative Board 2D viewport. */
(function (global) {
  'use strict';

  function bindViewportNavigation({viewport, view, board, planViewport, zoomPlan, cancelItemGesture, isItemDragging, isSpaceHeld}) {
    const touchPoints = new Map();
    let touchGesture = null;
    let pan = null;

    const isWebGLTarget = event => Boolean(event.target.closest('.ff-lighting-webgl-canvas'));
    const midpoint = points => ({x:(points[0].x + points[1].x) / 2, y:(points[0].y + points[1].y) / 2});
    const distance = points => Math.max(1, Math.hypot(points[1].x-points[0].x, points[1].y-points[0].y));

    function onTouchStart(event) {
      if (event.pointerType !== 'touch' || isWebGLTarget(event)) return;
      touchPoints.set(event.pointerId, {x:event.clientX, y:event.clientY});
      if (touchPoints.size !== 2) return;
      event.preventDefault(); event.stopPropagation();
      if (isItemDragging()) cancelItemGesture();
      const points = [...touchPoints.values()];
      touchGesture = {distance:distance(points), zoom:view.zoom, center:midpoint(points)};
      for (const pointerId of touchPoints.keys()) {
        try { viewport.setPointerCapture(pointerId); } catch (_) {}
      }
    }
    function onTouchMove(event) {
      if (event.pointerType !== 'touch' || isWebGLTarget(event) || !touchPoints.has(event.pointerId)) return;
      touchPoints.set(event.pointerId, {x:event.clientX, y:event.clientY});
      if (!touchGesture || touchPoints.size < 2) return;
      event.preventDefault();
      const points = [...touchPoints.values()], center = midpoint(points);
      const nextDistance = distance(points), host = planViewport();
      zoomPlan(touchGesture.zoom * nextDistance / touchGesture.distance, center.x, center.y);
      host.scrollLeft -= center.x - touchGesture.center.x;
      host.scrollTop -= center.y - touchGesture.center.y;
      touchGesture = {distance:nextDistance, zoom:view.zoom, center};
    }
    function onTouchEnd(event) {
      if (!touchPoints.has(event.pointerId)) return;
      touchPoints.delete(event.pointerId);
      if (touchGesture) {
        try { viewport.releasePointerCapture(event.pointerId); } catch (_) {}
        touchGesture = null;
      }
    }
    function endPan(event) {
      if (!pan || (event?.pointerId !== undefined && event.pointerId !== pan.id)) return;
      const id = pan.id;
      pan = null;
      viewport.classList.remove('is-panning');
      try { viewport.releasePointerCapture(id); } catch (_) {}
      viewport.removeEventListener('pointermove', movePan);
      viewport.removeEventListener('pointerup', endPan);
      viewport.removeEventListener('pointercancel', endPan);
      viewport.removeEventListener('lostpointercapture', endPan);
    }
    function movePan(event) {
      if (!pan || event.pointerId !== pan.id) return;
      pan.host.scrollLeft = pan.left + pan.x - event.clientX;
      pan.host.scrollTop = pan.top + pan.y - event.clientY;
    }
    function onPanStart(event) {
      if (isWebGLTarget(event) || (event.button !== 1 && !(event.button === 0 && (view.hand || isSpaceHeld())))) return;
      event.preventDefault();
      const host = planViewport();
      pan = {id:event.pointerId, host, x:event.clientX, y:event.clientY, left:host.scrollLeft, top:host.scrollTop};
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('is-panning');
      viewport.addEventListener('pointermove', movePan);
      viewport.addEventListener('pointerup', endPan);
      viewport.addEventListener('pointercancel', endPan);
      viewport.addEventListener('lostpointercapture', endPan);
    }
    function onWheel(event) {
      if (isWebGLTarget(event) || !board()) return;
      event.preventDefault();
      const delta = Math.max(-300, Math.min(300, event.deltaY * (event.deltaMode === 1 ? 16 : 1)));
      zoomPlan(view.zoom * Math.exp(-delta * .002), event.clientX, event.clientY);
    }

    viewport.addEventListener('pointerdown', onTouchStart, {capture:true});
    viewport.addEventListener('pointermove', onTouchMove, {capture:true});
    viewport.addEventListener('pointerup', onTouchEnd, {capture:true});
    viewport.addEventListener('pointercancel', onTouchEnd, {capture:true});
    viewport.addEventListener('pointerdown', onPanStart);
    viewport.addEventListener('wheel', onWheel, {passive:false});

    return function dispose() {
      endPan();
      for (const pointerId of touchPoints.keys()) {
        try { viewport.releasePointerCapture(pointerId); } catch (_) {}
      }
      touchPoints.clear(); touchGesture = null;
      viewport.removeEventListener('pointerdown', onTouchStart, {capture:true});
      viewport.removeEventListener('pointermove', onTouchMove, {capture:true});
      viewport.removeEventListener('pointerup', onTouchEnd, {capture:true});
      viewport.removeEventListener('pointercancel', onTouchEnd, {capture:true});
      viewport.removeEventListener('pointerdown', onPanStart);
      viewport.removeEventListener('wheel', onWheel);
    };
  }

  global.FrameForgeBoardNavigation = Object.freeze({bindViewportNavigation});
})(globalThis);
