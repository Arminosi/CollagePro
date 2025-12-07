import { CanvasLayer, AppSettings } from '../types';

export const generateExportUrl = async (
  layers: CanvasLayer[],
  settings: AppSettings,
  singleLayerId?: string
): Promise<string | null> => {
  const canvas = document.createElement('canvas');
  let layersToExport = singleLayerId ? layers.filter(l => l.id === singleLayerId) : layers;
  if (layersToExport.length === 0) return null;

  let bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  layersToExport.forEach(l => {
    bounds.minX = Math.min(bounds.minX, l.x);
    bounds.minY = Math.min(bounds.minY, l.y);
    bounds.maxX = Math.max(bounds.maxX, l.x + l.width);
    bounds.maxY = Math.max(bounds.maxY, l.y + l.height);
  });

  const padding = 0;
  const width = bounds.maxX - bounds.minX + padding * 2;
  const height = bounds.maxY - bounds.minY + padding * 2;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (!singleLayerId && settings.backgroundMode === 'solid') {
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }
  
  for (const layer of layersToExport) {
    const img = new Image();
    img.src = layer.src;
    img.crossOrigin = "anonymous";
    await new Promise(resolve => { img.onload = resolve; });
    ctx.drawImage(img, layer.x - bounds.minX + padding, layer.y - bounds.minY + padding, layer.width, layer.height);
  }
  
  return canvas.toDataURL('image/png');
};

export const downloadImage = (url: string, filename?: string): void => {
  const link = document.createElement('a');
  link.download = filename || `collage-${Date.now()}.png`;
  link.href = url;
  link.click();
};

export const calculateGridDimension = (totalImages: number, knownDimension: number, isRows: boolean): number => {
  if (totalImages === 0 || knownDimension === 0) return 1;

  if (isRows) {
    // Known dimension is rows, calculate cols
    return Math.ceil(totalImages / knownDimension);
  } else {
    // Known dimension is cols, calculate rows
    return Math.ceil(totalImages / knownDimension);
  }
};