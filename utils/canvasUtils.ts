import React from 'react';
import { CanvasLayer } from '../types';

export const getCanvasCoordinates = (
  e: React.PointerEvent | PointerEvent | { clientX: number; clientY: number },
  canvasRef: React.RefObject<HTMLDivElement>,
  pan: { x: number; y: number },
  zoom: number
): { x: number; y: number } => {
  const container = canvasRef.current?.parentElement;
  if (!container) return { x: 0, y: 0 };
  const containerRect = container.getBoundingClientRect();
  return {
    x: (e.clientX - containerRect.left - pan.x) / zoom,
    y: (e.clientY - containerRect.top - pan.y) / zoom
  };
};

export const zoomAtPoint = (
  newZoom: number,
  zoom: number,
  pan: { x: number; y: number },
  containerRect: DOMRect,
  anchorX?: number,
  anchorY?: number
): { zoom: number; pan: { x: number; y: number } } => {
  const clampedZoom = Math.min(3, Math.max(0.2, newZoom));

  // Default anchor to viewport center
  const pointX = anchorX ?? containerRect.width / 2;
  const pointY = anchorY ?? containerRect.height / 2;

  const zoomRatio = clampedZoom / zoom;
  const newPanX = pointX - (pointX - pan.x) * zoomRatio;
  const newPanY = pointY - (pointY - pan.y) * zoomRatio;

  return {
    zoom: clampedZoom,
    pan: { x: newPanX, y: newPanY }
  };
};

export const handleFitView = (
  layers: CanvasLayer[],
  containerElement: HTMLElement | null
): { zoom: number; pan: { x: number; y: number } } | null => {
  if (layers.length === 0 || !containerElement) {
    return { zoom: 1, pan: { x: 0, y: 0 } };
  }

  // Calculate bounding box of all layers
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  layers.forEach(l => {
    minX = Math.min(minX, l.x);
    minY = Math.min(minY, l.y);
    maxX = Math.max(maxX, l.x + l.width);
    maxY = Math.max(maxY, l.y + l.height);
  });

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  const padding = 50;

  const viewWidth = containerElement.clientWidth;
  const viewHeight = containerElement.clientHeight;

  // Calculate scale to fit
  const scaleX = (viewWidth - padding * 2) / contentWidth;
  const scaleY = (viewHeight - padding * 2) / contentHeight;
  const newZoom = Math.min(3, Math.min(scaleX, scaleY));

  // Center logic
  const centeredX = (viewWidth - contentWidth * newZoom) / 2 - minX * newZoom;
  const centeredY = (viewHeight - contentHeight * newZoom) / 2 - minY * newZoom;

  return {
    zoom: newZoom,
    pan: { x: centeredX, y: centeredY }
  };
};

export const getBackgroundStyle = (
  backgroundMode: 'grid' | 'solid',
  backgroundColor: string,
  previewBackground: boolean
): string => {
  return backgroundMode === 'solid' 
    ? (previewBackground ? backgroundColor : '#0f172a')
    : '#0f172a';
};