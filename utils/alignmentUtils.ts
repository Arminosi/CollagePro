import { CanvasLayer, AppSettings } from '../types';

export const handleAlign = (
  layers: CanvasLayer[],
  selectedIds: Set<string>,
  type: 'left' | 'center-h' | 'right' | 'top' | 'middle-v' | 'bottom'
): CanvasLayer[] => {
  if (selectedIds.size < 2) return layers;
  const targetLayers = layers.filter(l => selectedIds.has(l.id));
  if (targetLayers.length === 0) return layers;

  // Calculate current bounding box of all selected layers
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  targetLayers.forEach(l => {
    minX = Math.min(minX, l.x);
    maxX = Math.max(maxX, l.x + l.width);
    minY = Math.min(minY, l.y);
    maxY = Math.max(maxY, l.y + l.height);
  });

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Calculate new position for each layer
  const aligned = targetLayers.map((l: CanvasLayer) => {
    let newX = l.x;
    let newY = l.y;

    switch(type) {
      case 'left':
        newX = minX;
        break;
      case 'center-h':
        newX = centerX - (l.width / 2);
        break;
      case 'right':
        newX = maxX - l.width;
        break;
      case 'top':
        newY = minY;
        break;
      case 'middle-v':
        newY = centerY - (l.height / 2);
        break;
      case 'bottom':
        newY = maxY - l.height;
        break;
    }

    return {
      ...l,
      x: newX,
      y: newY
    };
  });

  return layers.map(l => {
    if (selectedIds.has(l.id)) return aligned.find(a => a.id === l.id) || l;
    return l;
  });
};

export const handleAutoStitch = (
  layers: CanvasLayer[],
  selectedIds: Set<string>,
  settings: AppSettings,
  direction: 'vertical' | 'horizontal'
): CanvasLayer[] => {
  if (layers.length === 0) return layers;

  // Determine which layers to stitch based on scope setting
  let targetLayers: CanvasLayer[] = [];
  if (settings.stitchScope === 'all') {
    targetLayers = [...layers].reverse();
  } else {
    targetLayers = layers.filter(l => selectedIds.has(l.id)).reverse();
    if (targetLayers.length < 2) {
      if (targetLayers.length === 0) return layers;
    }
  }

  const first = targetLayers[0];
  const alignPos = direction === 'vertical' ? first.x : first.y;
  let referenceDimension = 0;
  
  if (settings.smartStitch) {
    // Find the maximum dimension (width for vertical stitch, height for horizontal stitch)
    if (direction === 'vertical') {
      referenceDimension = Math.max(...targetLayers.map(l => l.width));
    } else {
      referenceDimension = Math.max(...targetLayers.map(l => l.height));
    }
  }

  const processedStitched = targetLayers.map((layer) => {
    let newLayer = { ...layer };
    
    // Smart Stitch resizing
    if (settings.smartStitch) {
      if (direction === 'vertical' && newLayer.width !== referenceDimension) {
        const ratio = newLayer.width / newLayer.height;
        newLayer.width = referenceDimension;
        newLayer.height = referenceDimension / ratio;
      } else if (direction === 'horizontal' && newLayer.height !== referenceDimension) {
        const ratio = newLayer.width / newLayer.height;
        newLayer.height = referenceDimension;
        newLayer.width = referenceDimension * ratio;
      }
    }
    return newLayer;
  });

  // Positioning
  let runningPos = direction === 'vertical' ? processedStitched[0].y : processedStitched[0].x;
  const gap = Number(settings.stitchGap) || 0;
  
  const finalStitched = processedStitched.map((layer, i) => {
    const l = { ...layer };
    if (i > 0) {
      if (direction === 'vertical') {
        l.x = alignPos;
        l.y = runningPos + gap;
      } else {
        l.y = alignPos;
        l.x = runningPos + gap;
      }
    }
    if (direction === 'vertical') runningPos = l.y + l.height;
    else runningPos = l.x + l.width;
    return l;
  });

  // Merge back into main layers list
  const stitchedMap = new Map(finalStitched.map(l => [l.id, l]));
  return layers.map((layer: CanvasLayer) =>
    stitchedMap.has(layer.id) ? stitchedMap.get(layer.id)! : layer
  );
};