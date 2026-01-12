import { CanvasLayer, AppSettings } from '../types';

export const generateExportUrl = async (
  layers: CanvasLayer[],
  settings: AppSettings,
  singleLayerId?: string,
  onProgress?: (progress: number, message: string) => void,
  format: 'png' | 'jpg' = 'png',
  quality: number = 0.95
): Promise<string | null> => {
  const canvas = document.createElement('canvas');
  let layersToExport = singleLayerId ? layers.filter(l => l.id === singleLayerId) : layers;
  if (layersToExport.length === 0) return null;

  onProgress?.(0, '计算画布尺寸...');

  // Calculate bounds in canvas coordinates
  let bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  layersToExport.forEach(l => {
    bounds.minX = Math.min(bounds.minX, l.x);
    bounds.minY = Math.min(bounds.minY, l.y);
    bounds.maxX = Math.max(bounds.maxX, l.x + l.width);
    bounds.maxY = Math.max(bounds.maxY, l.y + l.height);
  });

  const padding = 0;
  const canvasWidth = bounds.maxX - bounds.minX + padding * 2;
  const canvasHeight = bounds.maxY - bounds.minY + padding * 2;
  
  // Optimize: Calculate reasonable scale based on average instead of maximum
  // This prevents one high-res image from making the entire canvas huge
  let totalScale = 0;
  let scaleCount = 0;
  layersToExport.forEach(l => {
    if (l.originalWidth && l.originalHeight) {
      const scaleX = l.originalWidth / l.width;
      const scaleY = l.originalHeight / l.height;
      const scale = Math.max(scaleX, scaleY);
      totalScale += scale;
      scaleCount++;
    }
  });
  
  // Use average scale, but cap at 4x to prevent extremely large exports
  const avgScale = scaleCount > 0 ? totalScale / scaleCount : 1;
  const exportScale = Math.min(avgScale, 4);
  
  // Further limit: cap total canvas size to 16000x16000 pixels
  const maxDimension = 16000;
  let finalScale = exportScale;
  if (canvasWidth * exportScale > maxDimension || canvasHeight * exportScale > maxDimension) {
    const scaleByWidth = maxDimension / canvasWidth;
    const scaleByHeight = maxDimension / canvasHeight;
    finalScale = Math.min(scaleByWidth, scaleByHeight);
  }
  
  canvas.width = Math.round(canvasWidth * finalScale);
  canvas.height = Math.round(canvasHeight * finalScale);
  
  onProgress?.(10, `创建 ${canvas.width}x${canvas.height} 画布...`);
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Enable high-quality image rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (!singleLayerId && settings.backgroundMode === 'solid') {
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  onProgress?.(20, '加载图片...');
  
  const totalLayers = layersToExport.length;
  for (let i = 0; i < totalLayers; i++) {
    const layer = layersToExport[i];
    const progress = 20 + Math.floor((i / totalLayers) * 70);
    onProgress?.(progress, `处理图片 ${i + 1}/${totalLayers}...`);
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = layer.src;
    
    // Wait for image to fully load before drawing
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = () => {
        console.error('Failed to load image:', layer.name);
        resolve(null);
      };
      if (img.complete) resolve(null);
    });
    
    // Calculate position and size in export canvas
    const drawX = (layer.x - bounds.minX + padding) * finalScale;
    const drawY = (layer.y - bounds.minY + padding) * finalScale;
    const drawWidth = layer.width * finalScale;
    const drawHeight = layer.height * finalScale;
    
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }
  
  onProgress?.(95, '生成图片...');
  const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const dataUrl = format === 'jpg' ? canvas.toDataURL(mimeType, quality) : canvas.toDataURL(mimeType);
  onProgress?.(100, '完成!');
  
  return dataUrl;
};

export const downloadImage = (url: string, filename?: string): void => {
  const link = document.createElement('a');
  const defaultFilename = `collage-${Date.now()}.png`;
  link.download = filename || defaultFilename;
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

// Estimate export file size
export const estimateExportSize = (
  width: number,
  height: number,
  format: 'png' | 'jpg',
  quality: number = 0.95
): string => {
  const pixels = width * height;
  let estimatedBytes: number;
  
  if (format === 'png') {
    // PNG: roughly 3-4 bytes per pixel (with compression)
    estimatedBytes = pixels * 3.5;
  } else {
    // JPG: quality-dependent, roughly 0.5-2 bytes per pixel
    const baseSize = pixels * 1.5;
    estimatedBytes = baseSize * quality;
  }
  
  // Convert to readable format
  if (estimatedBytes < 1024) {
    return `${Math.round(estimatedBytes)} B`;
  } else if (estimatedBytes < 1024 * 1024) {
    return `${(estimatedBytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
};