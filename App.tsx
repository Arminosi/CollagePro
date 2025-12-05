
/// <reference lib="dom" />
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { LayerPanel } from './components/LayerPanel';
import { ContextMenu } from './components/ContextMenu';
import { CanvasLayer, AppSettings, DragState, SavedVersion, Rect, Language } from './types';
import { getSnapLines, resizeLayer, getSnapDelta, SnapGuide } from './utils/geometry';
import {
  Undo, Redo, Download, ZoomIn, ZoomOut, Maximize, Languages,
  Magnet, Scaling, Menu, LayoutGrid,
  AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignEndVertical, AlignVerticalJustifyCenter,
  AlignVerticalJustifyCenter as VStitchIcon, AlignHorizontalJustifyCenter as HStitchIcon, Wand2,
  Layers, Combine, Info, MoreHorizontal, MousePointer, X, ChevronUp, ChevronDown, ArrowLeftRight
} from 'lucide-react';
import { translations } from './utils/i18n';
import { AnimatePresence, motion } from 'framer-motion';

const INITIAL_SETTINGS: AppSettings = {
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

// --- Helper Components ---

interface TooltipButtonProps { 
  title: string; 
  onClick: () => void; 
  icon: React.ElementType; 
  active?: boolean; 
  disabled?: boolean; 
  className?: string;
  tooltipContent?: React.ReactNode;
}

const TooltipButton = React.forwardRef<HTMLButtonElement, TooltipButtonProps>(({ 
  title, 
  onClick, 
  icon: Icon, 
  active, 
  disabled, 
  className,
  tooltipContent 
}, ref) => (
  <div className="relative group flex items-center justify-center">
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2.5 rounded-xl transition-all duration-200 outline-none flex items-center justify-center
        ${active 
          ? 'bg-primary text-white shadow-lg shadow-primary/25 ring-0' 
          : 'text-slate-400 hover:text-white hover:bg-slate-700/80 active:bg-slate-700'
        } 
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} 
        ${className || ''}
      `}
    >
      <Icon className="w-5 h-5" />
    </button>
    {/* Tooltip */}
    {!disabled && (
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none
        px-3 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg border border-slate-700/50 whitespace-nowrap z-60 shadow-xl
        md:-top-14 md:left-1/2 md:-translate-x-1/2
        max-md:left-full max-md:ml-3 max-md:top-1/2 max-md:-translate-y-1/2
        ">
        <div className="font-semibold mb-0.5">{title}</div>
        {tooltipContent && <div className="text-slate-400 text-[10px] max-w-[150px] whitespace-normal leading-tight">{tooltipContent}</div>}
        
        {/* Arrow for tooltip */}
        <div className="absolute w-2 h-2 bg-slate-900 border-l border-b border-slate-700/50 rotate-45 
            md:-bottom-1 md:left-1/2 md:-translate-x-1/2 md:border-l-0 md:border-t-0 md:border-r md:border-b
            max-md:left-[-5px] max-md:top-1/2 max-md:-translate-y-1/2
        "></div>
        </div>
    )}
  </div>
));
TooltipButton.displayName = 'TooltipButton';

export default function App() {
  // --- State ---
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [history, setHistory] = useState<CanvasLayer[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [versions, setVersions] = useState<SavedVersion[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile: closed by default, desktop: will open on first interaction
  const [lang, setLang] = useState<Language>('zh');
  const [isBatchSelectMode, setIsBatchSelectMode] = useState(false);
  const [exportPreviewUrl, setExportPreviewUrl] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  
  // UI States
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [layerPanelPos, setLayerPanelPos] = useState({ x: window.innerWidth - 260, y: 80 });
  const [layerPanelAlign, setLayerPanelAlign] = useState<'top-left' | 'bottom-left'>('top-left');
  const [activeMenu, setActiveMenu] = useState<string | null>(null); // 'stitch', 'align', 'more'

  // --- Refs ---
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const layersBtnRef = useRef<HTMLButtonElement>(null);
  
  const dragState = useRef<{
    isDragging: boolean;
    isResizing: boolean;
    isPanning: boolean;
    isSelecting: boolean;
    isPinching: boolean;
    hasMoved: boolean;
    startX: number;
    startY: number;
    initialPan: { x: number; y: number };
    initialLayers: Record<string, { x: number; y: number; width: number; height: number }>;
    selectionBox: { startX: number; startY: number; endX: number; endY: number } | null;
    handle?: string;
    clickedLayerId?: string;
    pinchStartDistance: number;
    pinchStartZoom: number;
    pinchCenter: { x: number; y: number };
  }>({
    isDragging: false,
    isResizing: false,
    isPanning: false,
    isSelecting: false,
    isPinching: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    initialPan: { x: 0, y: 0 },
    initialLayers: {},
    selectionBox: null,
    pinchStartDistance: 0,
    pinchStartZoom: 1,
    pinchCenter: { x: 0, y: 0 }
  });
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  // --- History Management ---
  const pushHistory = useCallback((newLayers: CanvasLayer[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newLayers);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setLayers(prev); 
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setLayers(next);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // --- Image Handling ---
  const processFiles = (files: File[]) => {
      // Remember if this is the first import (canvas is empty)
      const isFirstImport = layers.length === 0;

      // Sort files by name in ascending order before processing
      const sortedFiles = Array.from(files).sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );

      let loadedCount = 0;
      const newLayers: CanvasLayer[] = [];

      sortedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const count = layers.length + loadedCount;
            const aspectRatio = img.width / img.height;
            const baseSize = 300;

            const viewportCenter = {
                x: -pan.x + (window.innerWidth / 2) / zoom,
                y: -pan.y + (window.innerHeight / 2) / zoom
            };

            newLayers.push({
              id: Math.random().toString(36).substr(2, 9),
              src: ev.target?.result as string,
              x: viewportCenter.x - 150 + (count * 20),
              y: viewportCenter.y - 150 + (count * 20),
              width: baseSize,
              height: baseSize / aspectRatio,
              zIndex: count,
              name: file.name
            });

            loadedCount++;
            if (loadedCount === sortedFiles.length) {
              // Sort new layers by name before adding them
              const sortedNewLayers = newLayers.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
              });

              let updatedLayers = [...layers, ...sortedNewLayers];

              // If this is the first import, sort all layers by name (ascending)
              if (isFirstImport) {
                updatedLayers = updatedLayers.sort((a, b) => {
                  const nameA = (a.name || '').toLowerCase();
                  const nameB = (b.name || '').toLowerCase();
                  return nameA.localeCompare(nameB);
                });
              }

              // Update zIndex to match array order
              updatedLayers = updatedLayers.map((layer, index) => ({
                ...layer,
                zIndex: index
              }));

              setLayers(updatedLayers);
              pushHistory(updatedLayers);

              // Auto calculate grid layout dimensions (prefer more rows than columns)
              const totalImages = updatedLayers.length;
              if (totalImages > 0) {
                // Calculate optimal rows and columns, preferring vertical (more rows)
                // Start with square root and adjust to prefer taller grids
                const sqrt = Math.sqrt(totalImages);
                let cols = Math.floor(sqrt);
                let rows = Math.ceil(totalImages / cols);

                // If it's close to square, prefer more rows
                // For example: 6 images -> 3x2 instead of 2x3
                if (cols * rows >= totalImages && rows <= cols) {
                  // Swap to make it taller
                  [rows, cols] = [cols, rows];
                }

                // Ensure we don't exceed max of 10
                rows = Math.min(10, rows);
                cols = Math.min(10, cols);

                setSettings((prev: AppSettings) => ({...prev, gridRows: rows, gridCols: cols}));
              }

              // Auto hide sidebar and fit view
              if (isSidebarOpen) {
                  setIsSidebarOpen(false);
                  // Wait for transition (300ms) to finish so we calculate fit based on full width
                  setTimeout(() => handleFitView(updatedLayers), 350);
              } else {
                  handleFitView(updatedLayers);
              }
            }
          };
          img.src = ev.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  // --- Logic for Auto Stitching & Alignment ---
  const handleAutoStitch = (direction: 'vertical' | 'horizontal') => {
    if (layers.length === 0) return;

    // Determine which layers to stitch based on scope setting
    // Use reversed order to match visual order in LayerPanel (top to bottom)
    let targetLayers: CanvasLayer[] = [];
    if (settings.stitchScope === 'all') {
        targetLayers = [...layers].reverse();
    } else {
        targetLayers = layers.filter(l => selectedIds.has(l.id)).reverse();
        if (targetLayers.length < 2) {
             if (targetLayers.length === 0) return;
        }
    }

    // Note: We now use layer order (visual order from LayerPanel) instead of sorting by position
    // This gives users predictable control over stitch order through layer reordering

    const first = targetLayers[0];
    const alignPos = direction === 'vertical' ? first.x : first.y;
    let referenceDimension = 0;
    
    if (settings.smartStitch) {
        if (direction === 'vertical') referenceDimension = first.width;
        else referenceDimension = first.height;
    }

    const processedStitched = targetLayers.map((layer, index) => {
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

    // Merge back into main layers list, preserving original layer order
    const stitchedMap = new Map(finalStitched.map(l => [l.id, l]));
    const newAllLayers = layers.map((layer: CanvasLayer) =>
        stitchedMap.has(layer.id) ? stitchedMap.get(layer.id)! : layer
    );

    setLayers(newAllLayers);
    pushHistory(newAllLayers);
    setActiveMenu(null);
  };

  const handleGridLayout = () => {
    if (layers.length === 0) return;

    // Determine which layers to layout
    // Use reversed order to match visual order in LayerPanel (top to bottom)
    let targetLayers: CanvasLayer[] = [];
    if (settings.stitchScope === 'all') {
        targetLayers = [...layers].reverse();
    } else {
        targetLayers = layers.filter(l => selectedIds.has(l.id)).reverse();
        if (targetLayers.length === 0) return;
    }

    // Apply reverse order if gridReverse is enabled
    if (settings.gridReverse) {
        targetLayers = [...targetLayers].reverse();
    }

    const rows = typeof settings.gridRows === 'number' ? settings.gridRows : 2;
    const cols = typeof settings.gridCols === 'number' ? settings.gridCols : 2;
    const gap = Number(settings.stitchGap) || 0;
    const direction = settings.gridDirection;

    // First pass: determine the width for each column and height for each row
    // We need to iterate through layers in order and map them to their grid positions

    // Initialize arrays for column widths and row heights
    const colWidths: number[] = new Array(cols).fill(0);
    const rowHeights: number[] = new Array(rows).fill(0);

    // Map each layer to its grid position and update max dimensions
    targetLayers.forEach((layer, index) => {
        if (index >= rows * cols) return; // Skip if beyond grid capacity

        let row: number, col: number;
        if (direction === 'horizontal') {
            // Horizontal first: fill left to right, then top to bottom
            row = Math.floor(index / cols);
            col = index % cols;
        } else {
            // Vertical first: fill top to bottom, then left to right
            col = Math.floor(index / rows);
            row = index % rows;
        }

        // Update maximum width for this column
        colWidths[col] = Math.max(colWidths[col], layer.width);
        // Update maximum height for this row
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
        if (index >= rows * cols) return layer; // Skip if beyond grid capacity

        // Calculate row and col based on direction
        let row: number, col: number;
        if (direction === 'horizontal') {
            // Horizontal first: fill left to right, then top to bottom
            row = Math.floor(index / cols);
            col = index % cols;
        } else {
            // Vertical first: fill top to bottom, then left to right
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

        // If height exceeds cell height, scale by height instead
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

    // Merge back into main layers list, preserving original layer order
    // Create a map for quick lookup of layouted layers
    const layoutedMap = new Map(layouted.map(l => [l.id, l]));

    // Update layers in their original positions
    const newAllLayers = layers.map((layer: CanvasLayer) =>
        layoutedMap.has(layer.id) ? layoutedMap.get(layer.id)! : layer
    );

    setLayers(newAllLayers);
    pushHistory(newAllLayers);
    setActiveMenu(null);
  };

  // Helper function to calculate grid dimensions based on total images
  const calculateGridDimension = (totalImages: number, knownDimension: number, isRows: boolean): number => {
    if (totalImages === 0 || knownDimension === 0) return 1;

    if (isRows) {
      // Known dimension is rows, calculate cols
      return Math.ceil(totalImages / knownDimension);
    } else {
      // Known dimension is cols, calculate rows
      return Math.ceil(totalImages / knownDimension);
    }
  };

  const handleGridRowsChange = (newRows: number | '') => {
    if (newRows === '') return;
    const validRows = Math.max(1, Math.min(10, newRows));

    if (settings.autoCalcGrid) {
      // Auto-calculate columns based on total image count
      const totalImages = settings.stitchScope === 'all'
        ? layers.length
        : layers.filter(l => selectedIds.has(l.id)).length;

      const newCols = calculateGridDimension(totalImages, validRows, true);
      setSettings({...settings, gridRows: validRows, gridCols: Math.min(10, newCols)});
    } else {
      setSettings({...settings, gridRows: validRows});
    }
  };

  const handleGridColsChange = (newCols: number | '') => {
    if (newCols === '') return;
    const validCols = Math.max(1, Math.min(10, newCols));

    if (settings.autoCalcGrid) {
      // Auto-calculate rows based on total image count
      const totalImages = settings.stitchScope === 'all'
        ? layers.length
        : layers.filter(l => selectedIds.has(l.id)).length;

      const newRows = calculateGridDimension(totalImages, validCols, false);
      setSettings({...settings, gridCols: validCols, gridRows: Math.min(10, newRows)});
    } else {
      setSettings({...settings, gridCols: validCols});
    }
  };

  const handleAlign = (type: 'left' | 'center-h' | 'right' | 'top' | 'middle-v' | 'bottom') => {
      if (selectedIds.size < 2) return;
      const targetLayers = layers.filter(l => selectedIds.has(l.id));
      if (targetLayers.length === 0) return;

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

      // Calculate offset to move the entire group
      let offsetX = 0;
      let offsetY = 0;

      switch(type) {
          case 'left': offsetX = -minX; break;
          case 'center-h': offsetX = -centerX; break;
          case 'right': offsetX = -minX; break; // Will align to right edge of group, keeping internal spacing
          case 'top': offsetY = -minY; break;
          case 'middle-v': offsetY = -centerY; break;
          case 'bottom': offsetY = -minY; break; // Will align to bottom edge of group, keeping internal spacing
      }

      // Move all selected layers by the same offset, preserving their relative positions
      const aligned = targetLayers.map((l: CanvasLayer) => ({
          ...l,
          x: l.x + offsetX,
          y: l.y + offsetY
      }));

      const finalLayers = layers.map(l => {
          if (selectedIds.has(l.id)) return aligned.find(a => a.id === l.id) || l;
          return l;
      });
      setLayers(finalLayers);
      pushHistory(finalLayers);
      setActiveMenu(null);
  };

  const toggleLayerPanel = () => {
    if (!showLayerPanel && layersBtnRef.current) {
        const rect = layersBtnRef.current.getBoundingClientRect();
        const isDesktop = window.innerWidth >= 768;
        
        if (isDesktop) {
            // Desktop: Tight positioning above the button
            // Calculate distance from bottom of screen to top of button
            const bottomDistance = window.innerHeight - rect.top;
            
            setLayerPanelPos({
                x: rect.left, 
                y: bottomDistance + 8 // 8px gap above button
            });
            setLayerPanelAlign('bottom-left');
        } else {
            // Mobile: Right of button (vertical toolbar)
            setLayerPanelPos({
                x: rect.right + 10,
                y: Math.max(10, rect.top)
            });
            setLayerPanelAlign('top-left');
        }
    }
    setShowLayerPanel(!showLayerPanel);
  };
  
  // --- Fit to View Logic ---
  const handleFitView = (overrideLayers?: CanvasLayer[]) => {
      const targetLayers = Array.isArray(overrideLayers) ? overrideLayers : layers;
      
      if (targetLayers.length === 0) {
          setZoom(1);
          setPan({ x: 0, y: 0 });
          return;
      }

      // Calculate bounding box of all layers
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      targetLayers.forEach(l => {
          minX = Math.min(minX, l.x);
          minY = Math.min(minY, l.y);
          maxX = Math.max(maxX, l.x + l.width);
          maxY = Math.max(maxY, l.y + l.height);
      });

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      const padding = 50;

      // Get available view area
      const container = canvasRef.current?.parentElement;
      if (!container) return;
      
      const viewWidth = container.clientWidth;
      const viewHeight = container.clientHeight;

      // Calculate scale to fit
      const scaleX = (viewWidth - padding * 2) / contentWidth;
      const scaleY = (viewHeight - padding * 2) / contentHeight;
      const newZoom = Math.min(3, Math.min(scaleX, scaleY)); // Cap max zoom

      // Center logic
      const centeredX = (viewWidth - contentWidth * newZoom) / 2 - minX * newZoom;
      const centeredY = (viewHeight - contentHeight * newZoom) / 2 - minY * newZoom;

      setZoom(newZoom);
      setPan({ x: centeredX, y: centeredY });
  };

  // --- Canvas Interaction ---
  // Zoom with anchor point (defaults to viewport center)
  const zoomAtPoint = (newZoom: number, anchorX?: number, anchorY?: number) => {
    const containerRect = canvasContainerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const clampedZoom = Math.min(3, Math.max(0.2, newZoom));

    // Default anchor to viewport center
    const pointX = anchorX ?? containerRect.width / 2;
    const pointY = anchorY ?? containerRect.height / 2;

    const zoomRatio = clampedZoom / zoom;
    const newPanX = pointX - (pointX - pan.x) * zoomRatio;
    const newPanY = pointY - (pointY - pan.y) * zoomRatio;

    setZoom(clampedZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const getCanvasCoordinates = (e: React.PointerEvent | PointerEvent) => {
     const container = canvasRef.current?.parentElement;
     if (!container) return { x: 0, y: 0 };
     const containerRect = container.getBoundingClientRect();
     return {
         x: (e.clientX - containerRect.left - pan.x) / zoom,
         y: (e.clientY - containerRect.top - pan.y) / zoom
     };
  };

  const handlePointerDown = (e: React.PointerEvent, layerId?: string, handle?: string) => {
    // Middle mouse button (button 1) for panning canvas
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      dragState.current.isPanning = true;
      dragState.current.startX = e.clientX;
      dragState.current.startY = e.clientY;
      dragState.current.initialPan = { ...pan };
      (e.target as Element).setPointerCapture(e.pointerId);
      return;
    }

    // Only handle left mouse button (button 0) for layer interactions
    if (e.button !== 0) return;

    if (e.pointerType === 'touch') {
      e.preventDefault();
    }
    e.stopPropagation();
    setActiveMenu(null);

    if (layerId) {
      const coords = getCanvasCoordinates(e);
      dragState.current.startX = coords.x;
      dragState.current.startY = coords.y;

      let newSelectedIds = new Set<string>(selectedIds);
      const isMultiSelect = e.shiftKey || isBatchSelectMode;

      if (isMultiSelect) {
        // In batch select mode, if clicking on already selected layer, don't toggle yet
        // We'll handle toggle in pointerUp if no drag occurred
        if (!newSelectedIds.has(layerId)) {
          newSelectedIds.add(layerId);
          setSelectedIds(newSelectedIds);
        }
        // Store the clicked layer ID for potential toggle on pointer up
        dragState.current.clickedLayerId = layerId;
      } else {
        // In single select mode, always set selection to only the clicked layer
        newSelectedIds = new Set([layerId]);
        setSelectedIds(newSelectedIds);
      }

      const initialLayersMap: Record<string, Rect> = {};
      newSelectedIds.forEach(id => {
        const layer = layers.find(l => l.id === id);
        if (layer) initialLayersMap[id] = { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
      });

      if (handle) {
        dragState.current.isResizing = true;
        dragState.current.handle = handle;
        dragState.current.initialLayers = { [layerId]: { ...layers.find(l => l.id === layerId)! } };
      } else {
        dragState.current.isDragging = true;
        dragState.current.initialLayers = initialLayersMap;
      }
    } else {
        if (isBatchSelectMode) {
          dragState.current.isSelecting = true;
          dragState.current.startX = e.clientX;
          dragState.current.startY = e.clientY;
          setSelectionBox({ startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY });
        } else {
          if (!e.shiftKey) setSelectedIds(new Set());
          dragState.current.isPanning = true;
          dragState.current.startX = e.clientX;
          dragState.current.startY = e.clientY;
          dragState.current.initialPan = { ...pan };
        }
    }
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.isDragging && !dragState.current.isResizing && !dragState.current.isPanning && !dragState.current.isSelecting) return;

    if (dragState.current.isSelecting) {
      setSelectionBox(prev => prev ? { ...prev, endX: e.clientX, endY: e.clientY } : null);
      return;
    }

    if (dragState.current.isPanning) {
        const dx = e.clientX - dragState.current.startX;
        const dy = e.clientY - dragState.current.startY;
        setPan({
            x: dragState.current.initialPan.x + dx,
            y: dragState.current.initialPan.y + dy
        });
        return;
    }

    const coords = getCanvasCoordinates(e);
    const dx = coords.x - dragState.current.startX;
    const dy = coords.y - dragState.current.startY;

    // Check if moved beyond threshold (3 pixels in canvas space)
    const moveThreshold = 3 / zoom;
    if (!dragState.current.hasMoved && (Math.abs(dx) > moveThreshold || Math.abs(dy) > moveThreshold)) {
      dragState.current.hasMoved = true;
    }

    const initial = dragState.current.initialLayers;
    const scaledThreshold = settings.snapThreshold / zoom;

    const newLayers = layers.map((l: CanvasLayer) => {
      if (!initial[l.id]) return l;
      const init = initial[l.id];

      if (dragState.current.isResizing) {
        const handle = dragState.current.handle!;
        let proposed = resizeLayer(init, handle, dx, dy, settings.keepAspectRatio);

        if (settings.snapToGrid) {
            const otherRects = layers.filter(o => o.id !== l.id).map(o => ({...o}));
            const xTargets: number[] = [0];
            const yTargets: number[] = [0];
            otherRects.forEach(r => {
                xTargets.push(r.x, r.x + r.width);
                yTargets.push(r.y, r.y + r.height);
            });

            const activeRight = handle.includes('e');
            const activeLeft = handle.includes('w');
            const activeBottom = handle.includes('s');
            const activeTop = handle.includes('n');

            let snapDx = 0;
            let snapDy = 0;

            if (activeRight) {
                const delta = getSnapDelta(proposed.x + proposed.width, xTargets, scaledThreshold);
                if (delta !== null) snapDx = delta;
            } else if (activeLeft) {
                const delta = getSnapDelta(proposed.x, xTargets, scaledThreshold);
                if (delta !== null) snapDx = delta;
            }

            if (activeBottom) {
                const delta = getSnapDelta(proposed.y + proposed.height, yTargets, scaledThreshold);
                if (delta !== null) snapDy = delta;
            } else if (activeTop) {
                const delta = getSnapDelta(proposed.y, yTargets, scaledThreshold);
                if (delta !== null) snapDy = delta;
            }

            if (activeRight && snapDx !== 0) proposed.width += snapDx;
            if (activeLeft && snapDx !== 0) { proposed.x += snapDx; proposed.width -= snapDx; }
            if (activeBottom && snapDy !== 0) proposed.height += snapDy;
            if (activeTop && snapDy !== 0) { proposed.y += snapDy; proposed.height -= snapDy; }
        }
        return { ...l, ...proposed };
      } else {
        let newX = init.x + dx;
        let newY = init.y + dy;

        if (settings.snapToGrid && Object.keys(initial).length > 0) {
            const otherRects = layers.filter(other => !initial[other.id]).map(o => ({x: o.x, y: o.y, width: o.width, height: o.height}));

            // When moving multiple layers, calculate snap based on the bounding box of the entire selection
            if (Object.keys(initial).length > 1) {
                // Calculate bounding box of all selected layers in their new positions
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                Object.values(initial).forEach((initRect) => {
                    const tempX = initRect.x + dx;
                    const tempY = initRect.y + dy;
                    minX = Math.min(minX, tempX);
                    minY = Math.min(minY, tempY);
                    maxX = Math.max(maxX, tempX + initRect.width);
                    maxY = Math.max(maxY, tempY + initRect.height);
                });

                // Calculate snap for the bounding box (only once for the entire group)
                const groupRect = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
                const snapResult = getSnapLines(groupRect, otherRects, 5000, 5000, scaledThreshold);

                // Apply the same snap offset to all layers in the group
                if (snapResult.x !== null) newX += snapResult.x;
                if (snapResult.y !== null) newY += snapResult.y;

                // Update snap guides
                setSnapGuides(snapResult.guides);
            } else {
                // Single layer: calculate snap normally
                const snapResult = getSnapLines(
                    { x: newX, y: newY, width: init.width, height: init.height },
                    otherRects, 5000, 5000, scaledThreshold
                );
                if (snapResult.x !== null) newX += snapResult.x;
                if (snapResult.y !== null) newY += snapResult.y;

                // Update snap guides
                setSnapGuides(snapResult.guides);
            }
        }
        return { ...l, x: newX, y: newY };
      }
    });
    setLayers(newLayers);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragState.current.isSelecting && selectionBox) {
      const box = selectionBox;
      const canvasStart = getCanvasCoordinates({ clientX: box.startX, clientY: box.startY } as any);
      const canvasEnd = getCanvasCoordinates({ clientX: box.endX, clientY: box.endY } as any);
      const minX = Math.min(canvasStart.x, canvasEnd.x);
      const maxX = Math.max(canvasStart.x, canvasEnd.x);
      const minY = Math.min(canvasStart.y, canvasEnd.y);
      const maxY = Math.max(canvasStart.y, canvasEnd.y);

      const selectedLayers = layers.filter(layer =>
        layer.x < maxX && layer.x + layer.width > minX &&
        layer.y < maxY && layer.y + layer.height > minY
      );

      const newSelectedIds = new Set(selectedIds);
      selectedLayers.forEach(layer => newSelectedIds.add(layer.id));
      setSelectedIds(newSelectedIds);
    }

    // Handle toggle for batch select mode when clicking (not dragging) on already selected layer
    // Only toggle if the user didn't actually drag (no significant movement)
    if (dragState.current.clickedLayerId && !dragState.current.hasMoved && isBatchSelectMode) {
      const clickedId = dragState.current.clickedLayerId;
      if (selectedIds.has(clickedId)) {
        const newSelectedIds = new Set(selectedIds);
        newSelectedIds.delete(clickedId);
        setSelectedIds(newSelectedIds);
      }
    }

    if (dragState.current.isDragging || dragState.current.isResizing) pushHistory(layers);
    dragState.current = {
        isDragging: false, isResizing: false, isPanning: false, isSelecting: false, isPinching: false, hasMoved: false,
        startX: 0, startY: 0, initialPan: { x: 0, y: 0}, initialLayers: {}, selectionBox: null,
        pinchStartDistance: 0, pinchStartZoom: 1, pinchCenter: { x: 0, y: 0 }
    };
    setSelectionBox(null);
    setSnapGuides([]); // Clear snap guides when releasing
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  // --- Touch Pinch Zoom ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const containerRect = canvasContainerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const centerX = (touch1.clientX + touch2.clientX) / 2 - containerRect.left;
      const centerY = (touch1.clientY + touch2.clientY) / 2 - containerRect.top;

      dragState.current.isPinching = true;
      dragState.current.pinchStartDistance = distance;
      dragState.current.pinchStartZoom = zoom;
      dragState.current.pinchCenter = { x: centerX, y: centerY };
      dragState.current.initialPan = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && dragState.current.isPinching) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const containerRect = canvasContainerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      // Calculate new zoom based on pinch distance ratio
      const scale = distance / dragState.current.pinchStartDistance;
      const newZoom = Math.min(3, Math.max(0.2, dragState.current.pinchStartZoom * scale));

      // Calculate current pinch center
      const currentCenterX = (touch1.clientX + touch2.clientX) / 2 - containerRect.left;
      const currentCenterY = (touch1.clientY + touch2.clientY) / 2 - containerRect.top;

      // Adjust pan to keep the initial pinch center point fixed
      const zoomRatio = newZoom / dragState.current.pinchStartZoom;
      const { pinchCenter, initialPan } = dragState.current;

      const newPanX = currentCenterX - (pinchCenter.x - initialPan.x) * zoomRatio;
      const newPanY = currentCenterY - (pinchCenter.y - initialPan.y) * zoomRatio;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      dragState.current.isPinching = false;
    }
  };

  // Explicitly select a layer on context menu click to ensure actions apply to it
  const handleLayerContextMenu = (e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If not already selected, select it (replacing selection unless shift held, though usually right click replaces)
    if (!selectedIds.has(layerId)) {
        setSelectedIds(new Set([layerId]));
    }
    
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // --- Deletion & Layer Order ---
  const deleteSelected = () => {
    const newLayers = layers.filter(l => !selectedIds.has(l.id));
    setLayers(newLayers);
    setSelectedIds(new Set());
    pushHistory(newLayers);
  };

  const duplicateLayer = (layerId: string) => {
    const layerToDuplicate = layers.find(l => l.id === layerId);
    if (!layerToDuplicate) return;

    const newLayer: CanvasLayer = {
      ...layerToDuplicate,
      id: Math.random().toString(36).substr(2, 9),
      x: layerToDuplicate.x + 20,
      y: layerToDuplicate.y + 20,
      name: layerToDuplicate.name ? `${layerToDuplicate.name} (copy)` : 'Layer (copy)'
    };

    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    pushHistory(newLayers);
  };

  const deleteLayers = (layerIds: string[]) => {
    const newLayers = layers.filter(l => !layerIds.includes(l.id));
    setLayers(newLayers);
    setSelectedIds(new Set());
    pushHistory(newLayers);
  };

  const bringToFront = () => {
    const selected = layers.filter(l => selectedIds.has(l.id));
    const unselected = layers.filter(l => !selectedIds.has(l.id));
    setLayers([...unselected, ...selected]);
    pushHistory([...unselected, ...selected]);
  };
  const sendToBack = () => {
    const selected = layers.filter(l => selectedIds.has(l.id));
    const unselected = layers.filter(l => !selectedIds.has(l.id));
    setLayers([...selected, ...unselected]);
    pushHistory([...selected, ...unselected]);
  };
  const reorderLayers = (newLayers: CanvasLayer[]) => {
      setLayers(newLayers);
      pushHistory(newLayers);
  };
  const selectAllLayers = () => {
      const allIds = new Set(layers.map((l: CanvasLayer) => l.id));
      setSelectedIds(allIds);
  };

  const clearCanvas = () => {
      setLayers([]);
      setSelectedIds(new Set());
      pushHistory([]);
  };

  // --- Export Logic ---
  const generateExportUrl = async (singleLayerId?: string) => {
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

  const handleExportClick = async (singleLayerId?: string) => {
      const url = await generateExportUrl(singleLayerId);
      if (url) {
          if (singleLayerId) {
             // Direct download for single layer context menu (keep simple)
             downloadImage(url);
          } else {
             // Show preview for main export
             setExportPreviewUrl(url);
          }
      }
  };

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.download = `collage-${Date.now()}.png`;
    link.href = url;
    link.click();
    
    // Save version history logic
    const newVersion: SavedVersion = {
        id: Date.now().toString(), timestamp: Date.now(), layers: JSON.parse(JSON.stringify(layers)), thumbnail: url 
    };
    setVersions(prev => [newVersion, ...prev]);
    try {
        const stored = localStorage.getItem('collage_versions');
        const parsed = stored ? JSON.parse(stored) : [];
        if (parsed.length > 5) parsed.pop();
        localStorage.setItem('collage_versions', JSON.stringify([newVersion, ...parsed]));
    } catch (e) { console.warn("Local storage full"); }
  };

  
  useEffect(() => {
     try {
         const stored = localStorage.getItem('collage_versions');
         if (stored) setVersions(JSON.parse(stored));
     } catch (e) {}
  }, []);

  const loadVersion = (v: SavedVersion) => {
      if (confirm(translations[lang].confirmLoad)) {
          setLayers(v.layers);
          pushHistory(v.layers);
          setContextMenu(null);
      }
  };

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Check if user is typing in an input or textarea
          const target = e.target as HTMLElement;
          const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

          // Ctrl+Z / Cmd+Z for undo/redo
          if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
              e.preventDefault();
              if (e.shiftKey) redo(); else undo();
          }
          // Ctrl+D / Cmd+D for deselect all
          if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
              e.preventDefault();
              setSelectedIds(new Set());
          }
          // V key to toggle batch select mode
          if (e.key === 'v' && !isInputField && !e.ctrlKey && !e.metaKey) {
              e.preventDefault();
              setIsBatchSelectMode((prev: boolean) => !prev);
          }
          // Delete/Backspace to delete selected layers
          if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputField) {
              if (selectedIds.size > 0) deleteSelected();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [layers, selectedIds, history, historyIndex]);

  // --- Click Outside to close Popovers ---
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Prevent browser zoom on Ctrl+Wheel globally
  useEffect(() => {
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    // Use passive: false to allow preventDefault
    document.addEventListener('wheel', preventBrowserZoom, { passive: false });
    return () => document.removeEventListener('wheel', preventBrowserZoom);
  }, []);

  // Compute background style
  const backgroundStyle = settings.backgroundMode === 'solid' 
      ? (settings.previewBackground ? settings.backgroundColor : '#0f172a')
      : '#0f172a';

  return (
    <div
        className="flex flex-col h-dvh bg-background overflow-hidden relative"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
    >
      
      {/* --- Top Bar --- */}
      <div className="h-14 bg-surface/90 backdrop-blur border-b border-slate-700 flex items-center justify-between px-3 md:px-4 z-40 shrink-0 shadow-sm">
         <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
             >
                <Menu className="w-5 h-5" />
             </button>
             
             <h1 className="font-bold text-lg flex items-center gap-2 mr-2 text-slate-100">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <LayoutGrid className="w-4 h-4 text-white" />
                </div>
                CollagePro
             </h1>
         </div>

         <div className="flex items-center gap-2">
             <div className="flex items-center bg-slate-800/50 rounded-lg p-1 mr-2 border border-slate-700/50">
                 <button onClick={() => zoomAtPoint(zoom - 0.1)} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-300 transition-colors hidden sm:block">
                    <ZoomOut className="w-4 h-4" />
                 </button>
                 <span className="text-xs w-10 text-center text-slate-400 font-mono hidden sm:block">{Math.round(zoom * 100)}%</span>
                 <button onClick={() => zoomAtPoint(zoom + 0.1)} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-300 transition-colors hidden sm:block">
                    <ZoomIn className="w-4 h-4" />
                 </button>
                 <button onClick={() => handleFitView()} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-300 transition-colors" title={translations[lang].fitView}>
                    <Maximize className="w-4 h-4" />
                 </button>
             </div>
             
             <button onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-700 text-slate-300 text-xs font-medium border border-transparent hover:border-slate-600 transition-all">
                <Languages className="w-4 h-4" />
                <span className="hidden md:inline">{lang === 'en' ? 'EN' : '中'}</span>
             </button>
             <button onClick={() => handleExportClick()} className="bg-primary hover:bg-indigo-600 text-white p-2 md:px-4 md:py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all">
                <Download className="w-4 h-4" /> 
                <span className="hidden md:inline">{translations[lang].export}</span>
             </button>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
          <Sidebar
            settings={settings}
            updateSettings={(s) => setSettings(prev => ({...prev, ...s}))}
            versions={versions}
            onLoadVersion={loadVersion}
            isOpen={isSidebarOpen}
            lang={lang}
            onProcessFiles={processFiles}
            onClearCanvas={clearCanvas}
          />

          <div
            ref={canvasContainerRef}
            className={`flex-1 overflow-hidden relative flex flex-col shadow-inner ${isBatchSelectMode ? 'cursor-crosshair' : (dragState.current.isPanning ? 'cursor-grabbing' : 'cursor-grab')}`}
            style={{
                backgroundColor: backgroundStyle,
                touchAction: 'none'
            }}
            onPointerDown={(e) => handlePointerDown(e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onContextMenu={(e) => {
                e.preventDefault();
                // Right-click on background clears selection
                setSelectedIds(new Set());
                setContextMenu({ x: e.clientX, y: e.clientY });
            }}
            onWheel={(e) => {
                // Mouse wheel for zoom (no Ctrl needed)
                // Ctrl+Wheel still supported for compatibility
                e.preventDefault();
                const containerRect = canvasContainerRef.current?.getBoundingClientRect();
                if (!containerRect) return;

                // Mouse position relative to container
                const mouseX = e.clientX - containerRect.left;
                const mouseY = e.clientY - containerRect.top;

                // Calculate new zoom level
                const zoomDelta = -e.deltaY * 0.001;
                const newZoom = Math.min(3, Math.max(0.2, zoom + zoomDelta));
                const zoomRatio = newZoom / zoom;

                // Adjust pan to keep the point under the mouse fixed
                // Formula: newPan = mousePos - (mousePos - oldPan) * zoomRatio
                const newPanX = mouseX - (mouseX - pan.x) * zoomRatio;
                const newPanY = mouseY - (mouseY - pan.y) * zoomRatio;

                setZoom(newZoom);
                setPan({ x: newPanX, y: newPanY });
            }}
          >
            {/* Grid */}
            {settings.backgroundMode === 'grid' && (
                <div className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                    backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)',
                    backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                    backgroundPosition: `${pan.x}px ${pan.y}px`
                    }}
                />
            )}

            {/* Selection Box */}
            {selectionBox && (() => {
                const containerRect = canvasContainerRef.current?.getBoundingClientRect();
                if (!containerRect) return null;
                const box = selectionBox;
                return (
                    <div
                        className="absolute pointer-events-none z-20"
                        style={{
                            left: Math.min(box.startX, box.endX) - containerRect.left,
                            top: Math.min(box.startY, box.endY) - containerRect.top,
                            width: Math.abs(box.endX - box.startX),
                            height: Math.abs(box.endY - box.startY),
                            border: '4px dashed #3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.5)',
                            boxShadow: '0 0 20px rgba(59, 130, 246, 0.8), inset 0 0 20px rgba(59, 130, 246, 0.3)'
                        }}
                    />
                );
            })()}

            {/* Snap Guide Lines */}
            {settings.showGuides && snapGuides.map((guide, index) => (
                <div
                    key={`snap-${guide.type}-${index}`}
                    className="absolute pointer-events-none z-30"
                    style={{
                        ...(guide.type === 'vertical' ? {
                            left: guide.position * zoom + pan.x,
                            top: 0,
                            width: '2px',
                            height: '100%',
                        } : {
                            top: guide.position * zoom + pan.y,
                            left: 0,
                            height: '2px',
                            width: '100%',
                        }),
                        backgroundColor: '#10b981',
                        boxShadow: '0 0 8px rgba(16, 185, 129, 0.8)',
                    }}
                />
            ))}

            {/* Canvas Transform */}
            <div ref={canvasRef} className="absolute origin-top-left will-change-transform"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: '100%', height: '100%' }}>
                {layers.map((layer) => {
                const isSelected = selectedIds.has(layer.id);
                return (
                    <div
                    key={layer.id}
                    onPointerDown={(e) => handlePointerDown(e, layer.id)}
                    onContextMenu={(e) => handleLayerContextMenu(e, layer.id)}
                    style={{ position: 'absolute', left: layer.x, top: layer.y, width: layer.width, height: layer.height, touchAction: 'none' }}
                    className={`group select-none cursor-move ${isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-transparent' : 'hover:ring-1 hover:ring-slate-500'}`}
                    >
                    <img src={layer.src} alt="layer" className="w-full h-full object-fill pointer-events-none select-none shadow-sm" draggable={false} />
                    {isSelected && (
                        <>
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-primary cursor-nwse-resize rounded-full shadow-sm z-10" onPointerDown={(e) => handlePointerDown(e, layer.id, 'nw')} />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-primary cursor-nesw-resize rounded-full shadow-sm z-10" onPointerDown={(e) => handlePointerDown(e, layer.id, 'ne')} />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-primary cursor-nesw-resize rounded-full shadow-sm z-10" onPointerDown={(e) => handlePointerDown(e, layer.id, 'sw')} />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-primary cursor-nwse-resize rounded-full shadow-sm z-10" onPointerDown={(e) => handlePointerDown(e, layer.id, 'se')} />
                        </>
                    )}
                    </div>
                );
                })}

                {/* Dashed outline for obscured selected layers */}
                {layers.map((layer, index) => {
                const isSelected = selectedIds.has(layer.id);
                const isObscured = isSelected && selectedIds.size > 1 && layers.slice(index + 1).some((upperLayer: CanvasLayer) => selectedIds.has(upperLayer.id));
                if (!isObscured) return null;
                return (
                    <div
                    key={`outline-${layer.id}`}
                    style={{
                        position: 'absolute',
                        left: layer.x - 2,
                        top: layer.y - 2,
                        width: layer.width + 4,
                        height: layer.height + 4,
                        pointerEvents: 'none'
                    }}
                    className="border-2 border-dashed border-primary"
                    />
                );
                })}
            </div>

            {/* Responsive Toolbar */}
            <div 
                className="
                    fixed z-40 transition-all duration-300 ease-in-out flex
                    bg-surface/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl
                    
                    /* Desktop: Bottom Center, Horizontal, Rounded */
                    md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:flex md:flex-row md:items-center md:gap-2 md:rounded-2xl md:p-1.5

                    /* Mobile: Left Center, Vertical, Left-Stuck, Rounded-Right-Only */
                    max-md:left-0 max-md:top-1/2 max-md:-translate-y-1/2 max-md:flex-col max-md:gap-2 max-md:py-3 max-md:px-1.5 max-md:rounded-r-2xl max-md:rounded-l-none
                "
                onPointerDown={(e) => e.stopPropagation()} 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Group 1: Undo/Redo */}
                <div className="flex max-md:flex-col gap-1 shrink-0">
                    <TooltipButton title={translations[lang].undo} onClick={undo} disabled={historyIndex === 0} icon={Undo} />
                    <TooltipButton title={translations[lang].redo} onClick={redo} disabled={historyIndex === history.length - 1} icon={Redo} />
                </div>
                
                <div className="md:w-px md:h-8 max-md:w-6 max-md:h-px bg-slate-700/50 shrink-0 mx-1 max-md:mx-auto" />

                {/* Group 2: Tools */}
                <div className="flex max-md:flex-col gap-1 shrink-0 relative">
                    <TooltipButton 
                        title={translations[lang].batchSelect} 
                        onClick={() => setIsBatchSelectMode(!isBatchSelectMode)} 
                        active={isBatchSelectMode} 
                        icon={MousePointer} 
                    />

                    {/* Stitch Menu Trigger */}
                    <div className="relative">
                        <TooltipButton 
                            title={translations[lang].autoStitch} 
                            onClick={() => setActiveMenu(activeMenu === 'stitch' ? null : 'stitch')} 
                            active={activeMenu === 'stitch'} 
                            icon={Combine} 
                        />
                        <AnimatePresence>
                            {activeMenu === 'stitch' && (() => {
                                // Calculate menu position to avoid overflow on mobile
                                const isMobile = window.innerWidth < 768;
                                const menuHeight = 600; // Approximate menu height
                                const viewportHeight = window.innerHeight;
                                const shouldFlipToTop = isMobile && viewportHeight < menuHeight + 100;

                                return (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className={`absolute bg-surface border border-slate-700 rounded-xl shadow-xl p-3 w-64 z-50 flex flex-col gap-3
                                        ${shouldFlipToTop
                                            ? 'max-md:bottom-full max-md:mb-2 max-md:left-full max-md:ml-2'
                                            : 'max-md:left-full max-md:top-0 max-md:ml-2'
                                        }
                                        md:bottom-full md:left-1/2 md:-translate-x-1/2 md:mb-3
                                        max-md:max-h-[80vh] max-md:overflow-y-auto max-md:custom-scrollbar
                                    `}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="text-xs font-bold text-slate-400 uppercase">{translations[lang].stitchSettings}</div>
                                    
                                    {/* Scope Selection */}
                                    <div className="flex flex-col gap-1.5">
                                        <div className="text-[10px] text-slate-500 font-medium uppercase">{translations[lang].stitchScope}</div>
                                        <div className="flex rounded bg-slate-800 p-0.5">
                                            <button 
                                                onClick={() => setSettings(s => ({...s, stitchScope: 'selected'}))}
                                                className={`flex-1 py-1 text-[10px] font-medium rounded transition-colors ${settings.stitchScope === 'selected' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                                            >
                                                {translations[lang].scopeSelected}
                                            </button>
                                            <button 
                                                onClick={() => setSettings(s => ({...s, stitchScope: 'all'}))}
                                                className={`flex-1 py-1 text-[10px] font-medium rounded transition-colors ${settings.stitchScope === 'all' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                                            >
                                                {translations[lang].scopeAll}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Gap Input */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-300 w-12">{translations[lang].gap}</span>
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                value={settings.stitchGap || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    // Allow empty string for clearing
                                                    if (val === '') {
                                                        setSettings({...settings, stitchGap: 0});
                                                        return;
                                                    }
                                                    // Only allow digits
                                                    if (/^\d+$/.test(val)) {
                                                        const num = parseInt(val, 10);
                                                        setSettings({...settings, stitchGap: num});
                                                    }
                                                }}
                                                placeholder="0"
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 pr-7 text-sm text-white focus:border-primary outline-none placeholder:text-slate-600"
                                            />
                                            <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-slate-700">
                                                <button
                                                    type="button"
                                                    onClick={() => setSettings({...settings, stitchGap: settings.stitchGap + 1})}
                                                    className="flex-1 px-1 hover:bg-slate-700 transition-colors flex items-center justify-center"
                                                >
                                                    <ChevronUp className="w-3 h-3 text-slate-400" />
                                                </button>
                                                <div className="h-px bg-slate-700" />
                                                <button
                                                    type="button"
                                                    onClick={() => setSettings({...settings, stitchGap: Math.max(0, settings.stitchGap - 1)})}
                                                    className="flex-1 px-1 hover:bg-slate-700 transition-colors flex items-center justify-center"
                                                >
                                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                                </button>
                                            </div>
                                        </div>
                                        <span className="text-xs text-slate-500">{translations[lang].px}</span>
                                    </div>

                                    {/* Smart Stitch Toggle */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-300">{translations[lang].smartStitch}</span>
                                            <div className="group relative">
                                                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-help" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 p-2 rounded text-[10px] text-slate-300 border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                                    {translations[lang].smartStitchDesc}
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setSettings({...settings, smartStitch: !settings.smartStitch})}
                                            className={`w-10 h-5 rounded-full transition-colors relative ${settings.smartStitch ? 'bg-primary' : 'bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-1 bottom-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.smartStitch ? 'left-6' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    <div className="h-px bg-slate-700/50" />

                                    {/* Grid Layout Settings */}
                                    <div className="flex flex-col gap-2">
                                        <div className="text-[10px] text-slate-500 font-medium uppercase flex items-center gap-1">
                                            {translations[lang].gridLayout}
                                            <div className="group relative">
                                                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-help" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 p-2 rounded text-[10px] text-slate-300 border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                                    {translations[lang].gridDesc}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Auto Calculate Toggle */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-300">{translations[lang].autoCalc}</span>
                                            <button
                                                onClick={() => setSettings({...settings, autoCalcGrid: !settings.autoCalcGrid})}
                                                className={`w-10 h-5 rounded-full transition-colors relative ${settings.autoCalcGrid ? 'bg-primary' : 'bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-1 bottom-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.autoCalcGrid ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        {/* Grid Direction Selection */}
                                        <div className="flex flex-col gap-1.5">
                                            <div className="text-[10px] text-slate-500 font-medium uppercase">{translations[lang].gridDirection}</div>
                                            <div className="flex rounded bg-slate-800 p-0.5">
                                                <button
                                                    onClick={() => setSettings((s: AppSettings) => ({...s, gridDirection: 'horizontal'}))}
                                                    className={`flex-1 py-1 text-[10px] font-medium rounded transition-colors ${settings.gridDirection === 'horizontal' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                                                >
                                                    {translations[lang].gridHorizontal}
                                                </button>
                                                <button
                                                    onClick={() => setSettings((s: AppSettings) => ({...s, gridDirection: 'vertical'}))}
                                                    className={`flex-1 py-1 text-[10px] font-medium rounded transition-colors ${settings.gridDirection === 'vertical' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                                                >
                                                    {translations[lang].gridVertical}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Grid Reverse Toggle */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-300">{lang === 'zh' ? '倒序排列' : 'Reverse Order'}</span>
                                            <button
                                                onClick={() => setSettings({...settings, gridReverse: !settings.gridReverse})}
                                                className={`w-10 h-5 rounded-full transition-colors relative ${settings.gridReverse ? 'bg-primary' : 'bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-1 bottom-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.gridReverse ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-end gap-2">
                                            <div className="flex flex-col gap-1 flex-1">
                                                <span className="text-[10px] text-slate-400">{translations[lang].gridRows}</span>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={settings.gridRows}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            // Allow empty string for clearing, or valid numbers
                                                            if (val === '') {
                                                                setSettings({...settings, gridRows: '' as any});
                                                            } else if (/^\d+$/.test(val)) {
                                                                const num = Math.max(1, Math.min(10, parseInt(val, 10)));
                                                                setSettings({...settings, gridRows: num});
                                                            }
                                                        }}
                                                        onBlur={() => {
                                                            // Ensure valid value on blur
                                                            if (settings.gridRows === '' || settings.gridRows < 1) {
                                                                setSettings({...settings, gridRows: 1});
                                                            }
                                                        }}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 pr-7 text-sm text-white focus:border-primary outline-none"
                                                    />
                                                    <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-slate-700">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleGridRowsChange(settings.gridRows + 1)}
                                                            className="flex-1 px-1 hover:bg-slate-700 transition-colors flex items-center justify-center"
                                                        >
                                                            <ChevronUp className="w-3 h-3 text-slate-400" />
                                                        </button>
                                                        <div className="h-px bg-slate-700" />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleGridRowsChange(settings.gridRows - 1)}
                                                            className="flex-1 px-1 hover:bg-slate-700 transition-colors flex items-center justify-center"
                                                        >
                                                            <ChevronDown className="w-3 h-3 text-slate-400" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Swap Button */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const rows = typeof settings.gridRows === 'number' ? settings.gridRows : 2;
                                                    const cols = typeof settings.gridCols === 'number' ? settings.gridCols : 2;
                                                    setSettings({...settings, gridRows: cols, gridCols: rows});
                                                }}
                                                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center justify-center shrink-0"
                                                title={translations[lang].swapRowsCols || (lang === 'zh' ? '交换行列' : 'Swap rows/cols')}
                                            >
                                                <ArrowLeftRight className="w-4 h-4 text-slate-400" />
                                            </button>

                                            <div className="flex flex-col gap-1 flex-1">
                                                <span className="text-[10px] text-slate-400">{translations[lang].gridCols}</span>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={settings.gridCols}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            // Allow empty string for clearing, or valid numbers
                                                            if (val === '') {
                                                                setSettings({...settings, gridCols: '' as any});
                                                            } else if (/^\d+$/.test(val)) {
                                                                const num = Math.max(1, Math.min(10, parseInt(val, 10)));
                                                                setSettings({...settings, gridCols: num});
                                                            }
                                                        }}
                                                        onBlur={() => {
                                                            // Ensure valid value on blur
                                                            if (settings.gridCols === '' || settings.gridCols < 1) {
                                                                setSettings({...settings, gridCols: 1});
                                                            }
                                                        }}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 pr-7 text-sm text-white focus:border-primary outline-none"
                                                    />
                                                    <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-slate-700">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleGridColsChange(settings.gridCols + 1)}
                                                            className="flex-1 px-1 hover:bg-slate-700 transition-colors flex items-center justify-center"
                                                        >
                                                            <ChevronUp className="w-3 h-3 text-slate-400" />
                                                        </button>
                                                        <div className="h-px bg-slate-700" />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleGridColsChange(settings.gridCols - 1)}
                                                            className="flex-1 px-1 hover:bg-slate-700 transition-colors flex items-center justify-center"
                                                        >
                                                            <ChevronDown className="w-3 h-3 text-slate-400" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleGridLayout()}
                                            className="w-full flex items-center justify-center gap-2 p-2 bg-primary hover:bg-indigo-600 rounded-lg transition-colors text-sm text-white font-medium"
                                        >
                                            <LayoutGrid className="w-4 h-4" />
                                            {translations[lang].gridLayout}
                                        </button>
                                    </div>

                                    <div className="h-px bg-slate-700/50" />

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => handleAutoStitch('vertical')}
                                            className="flex flex-col items-center gap-1 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs text-slate-300"
                                        >
                                            <VStitchIcon className="w-5 h-5" />
                                            {translations[lang].stitchVertical}
                                        </button>
                                        <button
                                            onClick={() => handleAutoStitch('horizontal')}
                                            className="flex flex-col items-center gap-1 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs text-slate-300"
                                        >
                                            <HStitchIcon className="w-5 h-5" />
                                            {translations[lang].stitchHorizontal}
                                        </button>
                                    </div>
                                </motion.div>
                                );
                            })()}
                        </AnimatePresence>
                    </div>

                    {/* Align Menu Trigger */}
                    <div className="relative">
                        <TooltipButton 
                            title={translations[lang].alignment} 
                            onClick={() => setActiveMenu(activeMenu === 'align' ? null : 'align')} 
                            active={activeMenu === 'align'} 
                            icon={AlignLeft} 
                        />
                        <AnimatePresence>
                            {activeMenu === 'align' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute bg-surface border border-slate-700 rounded-xl shadow-xl p-3 w-48 z-50
                                        md:bottom-full md:left-1/2 md:-translate-x-1/2 md:mb-3
                                        max-md:left-full max-md:top-0 max-md:ml-2
                                    "
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">{translations[lang].alignTools}</div>
                                    <div className="grid grid-cols-3 gap-1">
                                        <TooltipButton title={translations[lang].alignLeft} onClick={() => handleAlign('left')} icon={AlignLeft} className="bg-slate-800/50 hover:bg-slate-700" />
                                        <TooltipButton title={translations[lang].alignCenterH} onClick={() => handleAlign('center-h')} icon={AlignCenter} className="bg-slate-800/50 hover:bg-slate-700" />
                                        <TooltipButton title={translations[lang].alignRight} onClick={() => handleAlign('right')} icon={AlignRight} className="bg-slate-800/50 hover:bg-slate-700" />
                                        <TooltipButton title={translations[lang].alignTop} onClick={() => handleAlign('top')} icon={AlignStartVertical} className="bg-slate-800/50 hover:bg-slate-700" />
                                        <TooltipButton title={translations[lang].alignMiddle} onClick={() => handleAlign('middle-v')} icon={AlignVerticalJustifyCenter} className="bg-slate-800/50 hover:bg-slate-700 rotate-90" />
                                        <TooltipButton title={translations[lang].alignBottom} onClick={() => handleAlign('bottom')} icon={AlignEndVertical} className="bg-slate-800/50 hover:bg-slate-700" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="md:w-px md:h-8 max-md:w-6 max-md:h-px bg-slate-700/50 shrink-0 mx-1 max-md:mx-auto" />

                {/* Group 3: Settings */}
                <div className="flex max-md:flex-col gap-1 shrink-0 max-md:hidden">
                    <TooltipButton 
                        title={translations[lang].snapToGrid} 
                        onClick={() => setSettings(s => ({...s, snapToGrid: !s.snapToGrid}))} 
                        active={settings.snapToGrid} 
                        icon={Magnet} 
                    />
                    <TooltipButton 
                        title={translations[lang].keepAspectRatio} 
                        onClick={() => setSettings(s => ({...s, keepAspectRatio: !s.keepAspectRatio}))} 
                        active={settings.keepAspectRatio} 
                        icon={Scaling} 
                    />
                </div>

                {/* Mobile More Menu */}
                <div className="md:hidden relative">
                    <TooltipButton 
                        title={translations[lang].more} 
                        onClick={() => setActiveMenu(activeMenu === 'more' ? null : 'more')} 
                        active={activeMenu === 'more'}
                        icon={MoreHorizontal} 
                    />
                    <AnimatePresence>
                        {activeMenu === 'more' && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                                className="absolute left-full top-0 ml-2 p-2 bg-surface border border-slate-700 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[150px]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="text-xs font-bold text-slate-400 uppercase px-2">{translations[lang].moreTools}</div>
                                <button 
                                    onClick={() => setSettings(s => ({...s, snapToGrid: !s.snapToGrid}))}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${settings.snapToGrid ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                                >
                                    <Magnet className="w-4 h-4" />
                                    {translations[lang].snapToGrid}
                                </button>
                                <button 
                                    onClick={() => setSettings(s => ({...s, keepAspectRatio: !s.keepAspectRatio}))}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${settings.keepAspectRatio ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                                >
                                    <Scaling className="w-4 h-4" />
                                    {translations[lang].keepAspectRatio}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Group 4: Layers */}
                <TooltipButton 
                    ref={layersBtnRef}
                    title={translations[lang].layers} 
                    onClick={toggleLayerPanel} 
                    active={showLayerPanel} 
                    icon={Layers} 
                />
            </div>

            {/* Layer Panel with Visibility Control */}
            <AnimatePresence>
                {showLayerPanel && (
                    <motion.div
                        layoutRoot
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed z-50 pointer-events-none"
                        style={{ top: 0, left: 0, width: '100%', height: '100%' }}
                    >
                        <div className="pointer-events-auto">
                           <LayerPanel
                                layers={layers}
                                selectedIds={selectedIds}
                                onSelect={(id: string, multi: boolean) => {
                                    const newSet = multi ? new Set(selectedIds).add(id) : new Set([id]);
                                    if (multi && selectedIds.has(id)) newSet.delete(id);
                                    setSelectedIds(newSet);
                                }}
                                onBatchSelect={(ids: Set<string>) => {
                                    setSelectedIds(ids);
                                }}
                                onReorder={reorderLayers}
                                onClose={() => setShowLayerPanel(false)}
                                lang={lang}
                                initialPosition={layerPanelPos}
                                initialAlignment={layerPanelAlign}
                                onDuplicateLayer={duplicateLayer}
                                onDeleteLayers={deleteLayers}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Export Preview Modal */}
            <AnimatePresence>
                {exportPreviewUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
                        onClick={() => setExportPreviewUrl(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-surface border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                                <h3 className="text-lg font-bold text-white">{translations[lang].previewExport}</h3>
                                <button onClick={() => setExportPreviewUrl(null)} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-4 bg-slate-950/50 flex items-center justify-center custom-scrollbar">
                                <img src={exportPreviewUrl} alt="Export Preview" className="max-w-full max-h-[70vh] shadow-lg border border-slate-800" />
                            </div>
                            <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3">
                                <button 
                                    onClick={() => setExportPreviewUrl(null)}
                                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors font-medium text-sm"
                                >
                                    {translations[lang].close}
                                </button>
                                <button 
                                    onClick={() => { downloadImage(exportPreviewUrl as string); setExportPreviewUrl(null); }}
                                    className="px-6 py-2 rounded-lg bg-primary hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-medium text-sm flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    {translations[lang].download}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    onDelete={deleteSelected}
                    onBringToFront={bringToFront}
                    onSendToBack={sendToBack}
                    onDownload={() => {
                        // Download single image
                        const id = Array.from(selectedIds)[0] as string;
                        handleExportClick(id);
                    }}
                    hasSelection={selectedIds.size > 0}
                    lang={lang}
                    onFitView={() => handleFitView()}
                    onSelectAll={selectAllLayers}
                />
            )}
          </div>
      </div>
    </div>
  );
}
