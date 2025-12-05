
import { CanvasLayer, Rect } from '../types';

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;
}

export const getSnapLines = (
  activeRect: Rect,
  otherRects: Rect[],
  canvasWidth: number,
  canvasHeight: number,
  threshold: number
) => {
  const guides: SnapGuide[] = [];

  // Vertical lines (x-axis)
  const xTargets = [0, canvasWidth];
  otherRects.forEach(r => {
    xTargets.push(r.x, r.x + r.width);
  });

  // Current edges
  const left = activeRect.x;
  const right = activeRect.x + activeRect.width;

  let minDiffX = Infinity;
  let snapX = null;
  let snappedXLine: number | null = null;

  xTargets.forEach(target => {
    if (Math.abs(left - target) < threshold && Math.abs(left - target) < minDiffX) {
      minDiffX = Math.abs(left - target);
      snapX = target - left; // delta to apply
      snappedXLine = target;
    }
    if (Math.abs(right - target) < threshold && Math.abs(right - target) < minDiffX) {
      minDiffX = Math.abs(right - target);
      snapX = target - right;
      snappedXLine = target;
    }
  });

  if (snappedXLine !== null) {
    guides.push({ type: 'vertical', position: snappedXLine });
  }

  // Horizontal lines (y-axis)
  const yTargets = [0, canvasHeight];
  otherRects.forEach(r => {
    yTargets.push(r.y, r.y + r.height);
  });

  const top = activeRect.y;
  const bottom = activeRect.y + activeRect.height;

  let minDiffY = Infinity;
  let snapY = null;
  let snappedYLine: number | null = null;

  yTargets.forEach(target => {
    if (Math.abs(top - target) < threshold && Math.abs(top - target) < minDiffY) {
      minDiffY = Math.abs(top - target);
      snapY = target - top;
      snappedYLine = target;
    }
    if (Math.abs(bottom - target) < threshold && Math.abs(bottom - target) < minDiffY) {
      minDiffY = Math.abs(bottom - target);
      snapY = target - bottom;
      snappedYLine = target;
    }
  });

  if (snappedYLine !== null) {
    guides.push({ type: 'horizontal', position: snappedYLine });
  }

  return { x: snapX, y: snapY, guides };
};

export const getSnapDelta = (value: number, targets: number[], threshold: number): number | null => {
  let minDiff = Infinity;
  let snapDelta = null;

  targets.forEach(target => {
    const diff = target - value;
    if (Math.abs(diff) < threshold && Math.abs(diff) < minDiff) {
      minDiff = Math.abs(diff);
      snapDelta = diff;
    }
  });

  return snapDelta;
};

export const resizeLayer = (
  layer: { x: number; y: number; width: number; height: number },
  handle: string,
  dx: number,
  dy: number,
  keepRatio: boolean
) => {
  let { x, y, width, height } = layer;
  const aspectRatio = width / height;

  if (handle.includes('e')) width += dx;
  if (handle.includes('w')) {
    width -= dx;
    x += dx;
  }
  if (handle.includes('s')) height += dy;
  if (handle.includes('n')) {
    height -= dy;
    y += dy;
  }

  if (keepRatio) {
    if (handle === 'se' || handle === 'nw') {
      // Fix based on width priority usually, or average
      const newHeight = width / aspectRatio;
      // Adjust y if it was a top handle
      if (handle.includes('n')) {
        y -= (newHeight - height);
      }
      height = newHeight;
    } else if (handle === 'sw' || handle === 'ne') {
       const newHeight = width / aspectRatio;
       if (handle.includes('n')) {
          y -= (newHeight - height);
       }
       height = newHeight;
    }
  }

  // Minimum size constraint
  if (width < 20) width = 20;
  if (height < 20) height = 20;

  return { x, y, width, height };
};
