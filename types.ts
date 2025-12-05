
export interface CanvasLayer {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  name: string;
}

export interface AppSettings {
  snapToGrid: boolean;
  snapThreshold: number;
  keepAspectRatio: boolean;
  showGuides: boolean;
  stitchGap: number;
  smartStitch: boolean;
  stitchScope: 'selected' | 'all';
  backgroundMode: 'grid' | 'solid';
  backgroundColor: string;
  previewBackground: boolean;
  gridRows: number;
  gridCols: number;
}

export interface DragState {
  isDragging: boolean;
  isResizing: boolean;
  startX: number;
  startY: number;
  initialLayers: Record<string, { x: number; y: number; width: number; height: number }>;
  handle?: string; // 'nw', 'ne', 'sw', 'se'
}

export interface SavedVersion {
  id: string;
  timestamp: number;
  layers: CanvasLayer[];
  thumbnail?: string;
}

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };

export type Language = 'en' | 'zh';
