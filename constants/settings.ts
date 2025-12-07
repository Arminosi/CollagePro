import { AppSettings } from '../types';

export const INITIAL_SETTINGS: AppSettings = {
  snapToGrid: true,
  snapThreshold: 10,
  keepAspectRatio: true,
  showGuides: true,
  stitchGap: 0,
  smartStitch: false,
  stitchScope: 'all',
  backgroundMode: 'grid',
  backgroundColor: '#ffffff',
  previewBackground: true,
  gridRows: 2,
  gridCols: 2,
  autoCalcGrid: true,
  gridDirection: 'horizontal',
  gridReverse: false
};