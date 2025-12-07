import { CanvasLayer, AppSettings } from '../types';

export const handleGridLayout = (
  layers: CanvasLayer[],
  selectedIds: Set<string>,
  settings: AppSettings,
  pan: { x: number; y: number },
  zoom: number
): CanvasLayer[] => {
  if (layers.length === 0) return layers;

  // Determine which layers to layout
  let targetLayers: CanvasLayer[] = [];
  if (settings.stitchScope === 'all') {
    targetLayers = [...layers].reverse();
  } else {
    targetLayers = layers.filter(l => selectedIds.has(l.id)).reverse();
    if (targetLayers.length === 0) return layers;
  }

  // Apply reverse order if gridReverse is enabled
  if (settings.gridReverse) {
    targetLayers = [...targetLayers].reverse();
  }

  const rows = typeof settings.gridRows === 'number' ? settings.gridRows : 2;
  const cols = typeof settings.gridCols === 'number' ? settings.gridCols : 2;
  const gap = Number(settings.stitchGap) || 0;
  const direction = settings.gridDirection;

  // Initialize arrays for column widths and row heights
  const colWidths: number[] = new Array(cols).fill(0);
  const rowHeights: number[] = new Array(rows).fill(0);

  // Map each layer to its grid position and update max dimensions
  targetLayers.forEach((layer, index) => {
    if (index >= rows * cols) return;

    let row: number, col: number;
    if (direction === 'horizontal') {
      row = Math.floor(index / cols);
      col = index % cols;
    } else {
      col = Math.floor(index / rows);
      row = index % rows;
    }

    colWidths[col] = Math.max(colWidths[col], layer.width);
    rowHeights[row] = Math.max(rowHeights[row], layer.height);
  });

  // Calculate total dimensions
  const totalWidth = colWidths.reduce((sum, w) => sum + w, 0) + (cols - 1) * gap;
  const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0) + (rows - 1) * gap;

  // Calculate grid starting position (center of viewport)
  const viewportCenter = {
    x: -pan.x + (window.innerWidth / 2) / zoom,
    y: -pan.y + (window.innerHeight / 2) / zoom
  };

  const startX = viewportCenter.x - totalWidth / 2;
  const startY = viewportCenter.y - totalHeight / 2;

  const layouted = targetLayers.map((layer, index) => {
    if (index >= rows * cols) return layer;

    let row: number, col: number;
    if (direction === 'horizontal') {
      row = Math.floor(index / cols);
      col = index % cols;
    } else {
      col = Math.floor(index / rows);
      row = index % rows;
    }

    // Calculate cell position
    const cellX = startX + colWidths.slice(0, col).reduce((sum, w) => sum + w, 0) + col * gap;
    const cellY = startY + rowHeights.slice(0, row).reduce((sum, h) => sum + h, 0) + row * gap;

    const cellWidth = colWidths[col];
    const cellHeight = rowHeights[row];

    // Calculate how to fit the image in the cell while maintaining aspect ratio
    const aspectRatio = layer.width / layer.height;
    let newWidth = cellWidth;
    let newHeight = cellWidth / aspectRatio;

    if (newHeight > cellHeight) {
      newHeight = cellHeight;
      newWidth = cellHeight * aspectRatio;
    }

    // Center the image in its cell
    const offsetX = (cellWidth - newWidth) / 2;
    const offsetY = (cellHeight - newHeight) / 2;

    return {
      ...layer,
      x: cellX + offsetX,
      y: cellY + offsetY,
      width: newWidth,
      height: newHeight
    };
  });

  // Merge back into main layers list
  const layoutedMap = new Map(layouted.map(l => [l.id, l]));
  return layers.map((layer: CanvasLayer) =>
    layoutedMap.has(layer.id) ? layoutedMap.get(layer.id)! : layer
  );
};