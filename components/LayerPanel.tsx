
/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { Layers, Move, GripVertical, X, ArrowUpAZ, ArrowDownAZ, Copy, Trash2 } from 'lucide-react';
import { Reorder, useDragControls, LayoutGroup } from 'framer-motion';
import { CanvasLayer, Language } from '../types';
import { translations } from '../utils/i18n';

interface LayerPanelProps {
  layers: CanvasLayer[];
  selectedIds: Set<string>;
  onSelect: (id: string, multi: boolean) => void;
  onReorder: (newOrder: CanvasLayer[]) => void;
  onClose: () => void;
  lang: Language;
  initialPosition?: { x: number; y: number };
  initialAlignment?: 'top-left' | 'bottom-left';
  onDuplicateLayer?: (layerId: string) => void;
  onDeleteLayers?: (layerIds: string[]) => void;
  onBatchSelect?: (ids: Set<string>) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers, selectedIds, onSelect, onReorder, onClose, lang,
  initialPosition = { x: window.innerWidth - 260, y: 80 },
  initialAlignment = 'top-left',
  onDuplicateLayer,
  onDeleteLayers,
  onBatchSelect
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [alignment, setAlignment] = useState(initialAlignment);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; layerId: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null); // 'duplicate', 'delete', 'sortAsc', 'sortDesc'

  const panelRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPanelPos = useRef({ x: 0, y: 0 });
  const t = translations[lang];

  // Sync state with props when opening/re-rendering from parent updates
  useEffect(() => {
     setPosition(initialPosition);
     if (initialAlignment) setAlignment(initialAlignment);
  }, [initialPosition, initialAlignment]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      setConfirmAction(null);
    };
    if (contextMenu) {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Panel Dragging Logic - using pointer events for touch support
  // Use transform for dragging to avoid triggering Framer Motion layout animations
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handlePanelDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // When starting drag, we must convert current visual position to absolute top/left coordinates
    // to allow free movement, regardless of initial alignment (e.g. bottom-anchored)
    if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        // Store the initial position when drag starts
        initialPanelPos.current = { x: rect.left, y: rect.top };
        setPosition({ x: rect.left, y: rect.top });
        setAlignment('top-left'); // Switch to standard top-left positioning
        dragStart.current = { x: e.clientX, y: e.clientY };
    } else {
        dragStart.current = { x: 0, y: 0 };
    }

    setIsDraggingPanel(true);
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingPanel) return;

      // Calculate offset from drag start
      const offsetX = e.clientX - dragStart.current.x;
      const offsetY = e.clientY - dragStart.current.y;

      // Calculate new position with boundary checks
      let newX = initialPanelPos.current.x + offsetX;
      let newY = initialPanelPos.current.y + offsetY;
      newX = Math.max(0, Math.min(window.innerWidth - 50, newX));
      newY = Math.max(0, Math.min(window.innerHeight - 40, newY));

      // Use transform offset during drag for smooth movement without layout shift
      setDragOffset({
        x: newX - initialPanelPos.current.x,
        y: newY - initialPanelPos.current.y
      });
    };

    const handlePointerUp = () => {
      if (isDraggingPanel) {
        // Commit the final position when drag ends
        setPosition({
          x: initialPanelPos.current.x + dragOffset.x,
          y: initialPanelPos.current.y + dragOffset.y
        });
        setDragOffset({ x: 0, y: 0 });
      }
      setIsDraggingPanel(false);
    };

    if (isDraggingPanel) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDraggingPanel, dragOffset]);

  const displayLayers = [...layers].reverse();

  const handleLayerClick = (index: number, layerId: string, shiftKey: boolean, ctrlKey: boolean) => {
    if (shiftKey && lastClickedIndex !== null && onBatchSelect) {
      // Shift+click: select range from lastClickedIndex to current index
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);

      // Collect all layer IDs in the range
      const newSelectedIds = new Set(selectedIds); // Keep previous selections
      for (let i = start; i <= end; i++) {
        newSelectedIds.add(displayLayers[i].id);
      }

      // Batch update selection
      onBatchSelect(newSelectedIds);
    } else {
      // Normal click or Ctrl+click
      onSelect(layerId, ctrlKey);
      setLastClickedIndex(index);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // If the right-clicked layer is not selected, select it
    if (!selectedIds.has(layerId)) {
      onSelect(layerId, false);
    }

    setContextMenu({ x: e.clientX, y: e.clientY, layerId });
    setConfirmAction(null);
  };

  const handleDuplicate = () => {
    if (confirmAction === 'duplicate') {
      if (contextMenu && onDuplicateLayer) {
        onDuplicateLayer(contextMenu.layerId);
      }
      setContextMenu(null);
      setConfirmAction(null);
    } else {
      setConfirmAction('duplicate');
    }
  };

  const handleDelete = () => {
    if (confirmAction === 'delete') {
      if (onDeleteLayers) {
        const idsToDelete = Array.from(selectedIds);
        onDeleteLayers(idsToDelete);
      }
      setContextMenu(null);
      setConfirmAction(null);
    } else {
      setConfirmAction('delete');
    }
  };

  const handleSortAsc = () => {
    if (confirmAction === 'sortAsc') {
      handleSortSelected('asc');
      setContextMenu(null);
      setConfirmAction(null);
    } else {
      setConfirmAction('sortAsc');
    }
  };

  const handleSortDesc = () => {
    if (confirmAction === 'sortDesc') {
      handleSortSelected('desc');
      setContextMenu(null);
      setConfirmAction(null);
    } else {
      setConfirmAction('sortDesc');
    }
  };

  const handleSortSelected = (order: 'asc' | 'desc') => {
    // Sort only selected layers
    const selectedLayers = layers.filter(l => selectedIds.has(l.id));

    const sortedSelected = [...selectedLayers].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      // Note: order is reversed because displayLayers is reversed
      // 'asc' means A-Z in the panel (top to bottom), which is Z-A in the layers array
      if (order === 'asc') {
        return nameB.localeCompare(nameA); // Reversed for visual order
      } else {
        return nameA.localeCompare(nameB); // Reversed for visual order
      }
    });

    // Merge back: keep unselected layers in their positions, replace selected layers with sorted ones
    // Find the indices of selected layers in the original array
    const selectedIndices = layers
      .map((l, i) => selectedIds.has(l.id) ? i : -1)
      .filter(i => i !== -1);

    // Create a new array with unselected layers kept in place
    const newLayers = [...layers];
    selectedIndices.forEach((originalIndex, i) => {
      newLayers[originalIndex] = sortedSelected[i];
    });

    onReorder(newLayers);
  };

  const handleSortClick = (order: 'asc' | 'desc') => {
    // Sort all layers (used by header sort buttons)
    const sorted = [...displayLayers].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      if (order === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
    const newZIndexOrder = [...sorted].reverse();
    onReorder(newZIndexOrder);
  };

  const handleReorder = (newDisplayOrder: CanvasLayer[]) => {
    const newZIndexOrder = [...newDisplayOrder].reverse();
    onReorder(newZIndexOrder);
  };

  // Construct dynamic styles based on alignment state
  const panelStyle: React.CSSProperties = {
      position: 'fixed',
      left: position.x,
      zIndex: 50,
      maxHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      // Use transform during drag to avoid triggering Framer Motion layout recalculation
      transform: isDraggingPanel ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` : undefined,
      // Disable transitions during drag for immediate response
      transition: isDraggingPanel ? 'none' : undefined
  };

  if (alignment === 'bottom-left') {
      panelStyle.bottom = position.y; // In this mode, y acts as bottom offset
      panelStyle.top = 'auto';
  } else {
      panelStyle.top = position.y;
      panelStyle.bottom = 'auto';
  }

  return (
    <div 
      ref={panelRef}
      className="bg-surface border border-slate-700 rounded-lg shadow-2xl w-60 pointer-events-auto"
      style={panelStyle}
      onPointerDown={(e) => e.stopPropagation()} 
    >
      {/* Header (Handle) */}
      <div
        className="h-10 bg-slate-800 rounded-t-lg flex items-center justify-between px-3 cursor-move border-b border-slate-700 select-none shrink-0"
        onPointerDown={handlePanelDragStart}
      >
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
          <Layers className="w-4 h-4" /> {t.layers}
        </span>
        <div className="flex items-center gap-2">
            {/* Sort Ascending Button */}
            <div className="relative group">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleSortClick('asc');
                    }}
                    className="hover:text-white text-slate-500 transition-colors"
                    title={lang === 'zh' ? '按名称升序' : 'Sort A-Z'}
                >
                    <ArrowUpAZ className="w-4 h-4" />
                </button>
                {/* Tooltip */}
                <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none
                    px-2 py-1.5 bg-slate-900 text-white text-[10px] rounded-lg border border-slate-700/50 whitespace-nowrap z-60 shadow-xl
                    bottom-full left-1/2 -translate-x-1/2 mb-2">
                    <div className="font-medium">{lang === 'zh' ? '按名称升序' : 'Sort A-Z'}</div>
                    {/* Arrow */}
                    <div className="absolute w-1.5 h-1.5 bg-slate-900 border-r border-b border-slate-700/50 rotate-45
                        -bottom-1 left-1/2 -translate-x-1/2"></div>
                </div>
            </div>

            {/* Sort Descending Button */}
            <div className="relative group">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleSortClick('desc');
                    }}
                    className="hover:text-white text-slate-500 transition-colors"
                    title={lang === 'zh' ? '按名称降序' : 'Sort Z-A'}
                >
                    <ArrowDownAZ className="w-4 h-4" />
                </button>
                {/* Tooltip */}
                <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none
                    px-2 py-1.5 bg-slate-900 text-white text-[10px] rounded-lg border border-slate-700/50 whitespace-nowrap z-60 shadow-xl
                    bottom-full left-1/2 -translate-x-1/2 mb-2">
                    <div className="font-medium">{lang === 'zh' ? '按名称降序' : 'Sort Z-A'}</div>
                    {/* Arrow */}
                    <div className="absolute w-1.5 h-1.5 bg-slate-900 border-r border-b border-slate-700/50 rotate-45
                        -bottom-1 left-1/2 -translate-x-1/2"></div>
                </div>
            </div>

            <Move className="w-3 h-3 text-slate-500" />
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="hover:text-white text-slate-500 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Layer List */}
      <div
        className="flex-1 overflow-y-auto p-1 custom-scrollbar bg-surface rounded-b-lg"
        style={{position: 'relative'}}
        onWheel={(e) => e.stopPropagation()}
      >
        {displayLayers.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">{t.noLayers}</div>
        ) : (
          <LayoutGroup>
            <Reorder.Group
                axis="y"
                values={displayLayers}
                onReorder={handleReorder}
                className="space-y-1"
                layoutScroll
            >
                {displayLayers.map((layer, index) => (
                <LayerItem
                    key={layer.id}
                    layer={layer}
                    index={index}
                    isSelected={selectedIds.has(layer.id)}
                    onLayerClick={handleLayerClick}
                    onContextMenu={handleContextMenu}
                    t={t}
                />
                ))}
            </Reorder.Group>
          </LayoutGroup>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-1 min-w-[180px] z-100"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {onDuplicateLayer && (
            <button
              onClick={handleDuplicate}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                confirmAction === 'duplicate'
                  ? 'bg-primary text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Copy className="w-4 h-4" />
              {confirmAction === 'duplicate'
                ? (lang === 'zh' ? '确认复制？' : 'Confirm Duplicate?')
                : (lang === 'zh' ? '复制图层' : 'Duplicate Layer')}
            </button>
          )}

          {onDeleteLayers && (
            <button
              onClick={handleDelete}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                confirmAction === 'delete'
                  ? 'bg-red-600 text-white'
                  : 'text-red-400 hover:bg-slate-800'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              {confirmAction === 'delete'
                ? (lang === 'zh' ? '确认删除？' : 'Confirm Delete?')
                : (lang === 'zh' ? '删除选中' : 'Delete Selected')}
            </button>
          )}

          <div className="h-px bg-slate-700 my-1" />

          <button
            onClick={handleSortAsc}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
              confirmAction === 'sortAsc'
                ? 'bg-primary text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ArrowUpAZ className="w-4 h-4" />
            {confirmAction === 'sortAsc'
              ? (lang === 'zh' ? '确认升序？' : 'Confirm Sort A-Z?')
              : (lang === 'zh' ? '按名称升序' : 'Sort A-Z')}
          </button>

          <button
            onClick={handleSortDesc}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
              confirmAction === 'sortDesc'
                ? 'bg-primary text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ArrowDownAZ className="w-4 h-4" />
            {confirmAction === 'sortDesc'
              ? (lang === 'zh' ? '确认降序？' : 'Confirm Sort Z-A?')
              : (lang === 'zh' ? '按名称降序' : 'Sort Z-A')}
          </button>
        </div>
      )}
    </div>
  );
};

const LayerItem = ({ layer, index, isSelected, onLayerClick, onContextMenu, t }: any) => {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={layer}
      dragListener={false}
      dragControls={controls}
      style={{ touchAction: 'none' }}
      className={`
        flex items-center gap-2 p-2 rounded text-sm select-none border relative
        ${isSelected ? 'bg-primary/20 border-primary/50 text-white' : 'bg-slate-800/30 border-transparent text-slate-300 hover:bg-slate-700/50'}
      `}
      onClick={(e) => onLayerClick(index, layer.id, e.shiftKey, e.ctrlKey || e.metaKey)}
      onContextMenu={(e) => onContextMenu(e, layer.id)}
    >
      <div
        onPointerDown={(e) => { e.stopPropagation(); controls.start(e); }}
        className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:text-white text-slate-500"
        style={{ touchAction: 'none' }}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="w-8 h-8 bg-slate-900 rounded overflow-hidden border border-slate-700 shrink-0 pointer-events-none">
        <img src={layer.src} className="w-full h-full object-cover" alt="layer thumb" />
      </div>

      <span className="truncate flex-1 font-medium pointer-events-none text-[11px]">
        {layer.name || t.layerDefault}
      </span>
    </Reorder.Item>
  );
};
