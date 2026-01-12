import { CanvasLayer, AppSettings } from '../types';

export const generateExportUrl = async (
  layers: CanvasLayer[],
  settings: AppSettings,
  singleLayerId?: string,
  onProgress?: (progress: number, message: string) => void,
  format: 'png' | 'jpg' = 'png',
  quality: number = 0.95,
  customWidth?: number,
  customHeight?: number
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
  
  let finalScale: number;
  
  // If custom dimensions are provided, use them directly
  if (customWidth && customHeight) {
    canvas.width = customWidth;
    canvas.height = customHeight;
    finalScale = Math.min(customWidth / canvasWidth, customHeight / canvasHeight);
  } else {
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
    finalScale = exportScale;
    if (canvasWidth * exportScale > maxDimension || canvasHeight * exportScale > maxDimension) {
      const scaleByWidth = maxDimension / canvasWidth;
      const scaleByHeight = maxDimension / canvasHeight;
      finalScale = Math.min(scaleByWidth, scaleByHeight);
    }
    
    canvas.width = Math.round(canvasWidth * finalScale);
    canvas.height = Math.round(canvasHeight * finalScale);
  }
  
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

// Estimate export file size (improved algorithm)
export const estimateExportSize = (
  width: number,
  height: number,
  format: 'png' | 'jpg',
  quality: number = 0.95
): string => {
  const pixels = width * height;
  let estimatedBytes: number;
  
  if (format === 'png') {
    // PNG: more accurate estimation based on real-world data
    // Base: ~3 bytes per pixel, with compression factor
    const baseBytes = pixels * 3;
    const compressionFactor = 0.7; // PNG compression typically achieves 70% of uncompressed
    estimatedBytes = baseBytes * compressionFactor;
  } else {
    // JPG: more accurate quality-based estimation
    // Use non-linear relationship between quality and file size
    const baseBytes = pixels * 0.3; // Base size at low quality
    const qualityFactor = 0.5 + (quality * 2.5); // Range from 0.5x to 3x
    estimatedBytes = baseBytes * qualityFactor;
  }
  
  // Add overhead for metadata (typically 1-5KB)
  estimatedBytes += 3000;
  
  // Convert to readable format
  if (estimatedBytes < 1024) {
    return `${Math.round(estimatedBytes)} B`;
  } else if (estimatedBytes < 1024 * 1024) {
    return `${(estimatedBytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
};

// Get actual file size from data URL
export const getDataUrlSize = (dataUrl: string): number => {
  // Remove data URL prefix to get base64 string
  const base64 = dataUrl.split(',')[1] || dataUrl;
  // Calculate size: base64 length * 0.75 (base64 to binary conversion)
  return base64.length * 0.75;
};

// Convert bytes to MB
export const bytesToMB = (bytes: number): number => {
  return bytes / (1024 * 1024);
};

// Export with target file size control
export const generateExportUrlWithTargetSize = async (
  layers: CanvasLayer[],
  settings: AppSettings,
  targetSizeMB: number,
  format: 'png' | 'jpg',
  singleLayerId?: string,
  onProgress?: (progress: number, message: string) => void,
  initialQuality: number = 0.95,
  initialWidth?: number,
  initialHeight?: number
): Promise<string | null> => {
  const targetSizeBytes = targetSizeMB * 1024 * 1024;
  const tolerance = 0.1; // 10% tolerance
  
  onProgress?.(0, '开始智能导出...');
  
  if (format === 'jpg') {
    // For JPG: adjust quality to meet target size
    let quality = initialQuality;
    let minQuality = 0.3;
    let maxQuality = 1.0;
    let attempts = 0;
    const maxAttempts = 8;
    
    while (attempts < maxAttempts) {
      onProgress?.(attempts * 10, `尝试导出 (质量: ${Math.round(quality * 100)}%)...`);
      
      const url = await generateExportUrl(
        layers,
        settings,
        singleLayerId,
        (p, m) => onProgress?.(attempts * 10 + p / 10, m),
        format,
        quality,
        initialWidth,
        initialHeight
      );
      
      if (!url) return null;
      
      const actualSize = getDataUrlSize(url);
      const actualSizeMB = bytesToMB(actualSize);
      
      onProgress?.(attempts * 10 + 10, `当前大小: ${actualSizeMB.toFixed(2)} MB`);
      
      // Check if within tolerance
      const ratio = actualSize / targetSizeBytes;
      if (ratio >= (1 - tolerance) && ratio <= (1 + tolerance)) {
        onProgress?.(100, `完成！文件大小: ${actualSizeMB.toFixed(2)} MB`);
        return url;
      }
      
      // Adjust quality using binary search
      if (actualSize > targetSizeBytes) {
        maxQuality = quality;
        quality = (minQuality + quality) / 2;
      } else {
        minQuality = quality;
        quality = (quality + maxQuality) / 2;
      }
      
      // Prevent too low quality
      if (quality < 0.3) {
        onProgress?.(100, `已达最低质量，文件大小: ${actualSizeMB.toFixed(2)} MB`);
        return url;
      }
      
      attempts++;
      
      // If difference is small enough, accept it
      if (Math.abs(ratio - 1) < tolerance * 2) {
        onProgress?.(100, `完成！文件大小: ${actualSizeMB.toFixed(2)} MB`);
        return url;
      }
    }
    
    // Return last attempt if max attempts reached
    const finalUrl = await generateExportUrl(
      layers,
      settings,
      singleLayerId,
      undefined,
      format,
      quality,
      initialWidth,
      initialHeight
    );
    return finalUrl;
    
  } else {
    // For PNG: adjust resolution to meet target size
    // Calculate initial dimensions if not provided
    if (!initialWidth || !initialHeight) {
      const layersToExport = singleLayerId ? layers.filter(l => l.id === singleLayerId) : layers;
      let bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      layersToExport.forEach(l => {
        bounds.minX = Math.min(bounds.minX, l.x);
        bounds.minY = Math.min(bounds.minY, l.y);
        bounds.maxX = Math.max(bounds.maxX, l.x + l.width);
        bounds.maxY = Math.max(bounds.maxY, l.y + l.height);
      });
      
      const canvasWidth = bounds.maxX - bounds.minX;
      const canvasHeight = bounds.maxY - bounds.minY;
      
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
      
      const avgScale = scaleCount > 0 ? totalScale / scaleCount : 1;
      const exportScale = Math.min(avgScale, 4);
      
      initialWidth = Math.round(canvasWidth * exportScale);
      initialHeight = Math.round(canvasHeight * exportScale);
    }
    
    let width = initialWidth;
    let height = initialHeight;
    const aspectRatio = width / height;
    let scaleFactor = 1.0;
    let minScale = 0.3;
    let maxScale = 1.5;
    let attempts = 0;
    const maxAttempts = 8;
    
    while (attempts < maxAttempts) {
      const currentWidth = Math.round(width * scaleFactor);
      const currentHeight = Math.round(height * scaleFactor);
      
      onProgress?.(attempts * 10, `尝试导出 (分辨率: ${currentWidth}x${currentHeight})...`);
      
      const url = await generateExportUrl(
        layers,
        settings,
        singleLayerId,
        (p, m) => onProgress?.(attempts * 10 + p / 10, m),
        format,
        0.95,
        currentWidth,
        currentHeight
      );
      
      if (!url) return null;
      
      const actualSize = getDataUrlSize(url);
      const actualSizeMB = bytesToMB(actualSize);
      
      onProgress?.(attempts * 10 + 10, `当前大小: ${actualSizeMB.toFixed(2)} MB`);
      
      // Check if within tolerance
      const ratio = actualSize / targetSizeBytes;
      if (ratio >= (1 - tolerance) && ratio <= (1 + tolerance)) {
        onProgress?.(100, `完成！文件大小: ${actualSizeMB.toFixed(2)} MB (${currentWidth}x${currentHeight})`);
        return url;
      }
      
      // Adjust scale using binary search
      if (actualSize > targetSizeBytes) {
        maxScale = scaleFactor;
        scaleFactor = (minScale + scaleFactor) / 2;
      } else {
        minScale = scaleFactor;
        scaleFactor = (scaleFactor + maxScale) / 2;
      }
      
      // Prevent too low resolution
      if (currentWidth < 100 || currentHeight < 100) {
        onProgress?.(100, `已达最低分辨率，文件大小: ${actualSizeMB.toFixed(2)} MB`);
        return url;
      }
      
      attempts++;
      
      // If difference is small enough, accept it
      if (Math.abs(ratio - 1) < tolerance * 2) {
        onProgress?.(100, `完成！文件大小: ${actualSizeMB.toFixed(2)} MB (${currentWidth}x${currentHeight})`);
        return url;
      }
    }
    
    // Return last attempt if max attempts reached
    const finalWidth = Math.round(width * scaleFactor);
    const finalHeight = Math.round(height * scaleFactor);
    const finalUrl = await generateExportUrl(
      layers,
      settings,
      singleLayerId,
      undefined,
      format,
      0.95,
      finalWidth,
      finalHeight
    );
    return finalUrl;
  }
};