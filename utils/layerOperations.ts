import { CanvasLayer } from '../types';

export const duplicateLayer = (layers: CanvasLayer[], layerId: string): CanvasLayer[] => {
  const layerToDuplicate = layers.find(l => l.id === layerId);
  if (!layerToDuplicate) return layers;

  const newLayer: CanvasLayer = {
    ...layerToDuplicate,
    id: Math.random().toString(36).substr(2, 9),
    x: layerToDuplicate.x + 20,
    y: layerToDuplicate.y + 20,
    name: layerToDuplicate.name ? `${layerToDuplicate.name} (copy)` : 'Layer (copy)'
  };

  return [...layers, newLayer];
};

export const deleteLayers = (layers: CanvasLayer[], layerIds: string[]): CanvasLayer[] => {
  return layers.filter(l => !layerIds.includes(l.id));
};

export const bringToFront = (layers: CanvasLayer[], selectedIds: Set<string>): CanvasLayer[] => {
  const selected = layers.filter(l => selectedIds.has(l.id));
  const unselected = layers.filter(l => !selectedIds.has(l.id));
  return [...unselected, ...selected];
};

export const sendToBack = (layers: CanvasLayer[], selectedIds: Set<string>): CanvasLayer[] => {
  const selected = layers.filter(l => selectedIds.has(l.id));
  const unselected = layers.filter(l => !selectedIds.has(l.id));
  return [...selected, ...unselected];
};

export const selectAllLayers = (layers: CanvasLayer[]): Set<string> => {
  return new Set(layers.map(l => l.id));
};

export const clearCanvas = (): CanvasLayer[] => {
  return [];
};