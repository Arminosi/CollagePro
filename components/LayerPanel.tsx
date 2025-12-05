
/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { Layers, Move, GripVertical, X } from 'lucide-react';
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
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers, selectedIds, onSelect, onReorder, onClose, lang,
  initialPosition = { x: window.innerWidth - 260, y: 80 },
  initialAlignment = 'top-left'
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [alignment, setAlignment] = useState(initialAlignment);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPanelPos = useRef({ x: 0, y: 0 });
  const t = translations[lang];

  // Sync state with props when opening/re-rendering from parent updates
  useEffect(() => {
     setPosition(initialPosition);
     if (initialAlignment) setAlignment(initialAlignment);
  }, [initialPosition, initialAlignment]);
  
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
      <div className="flex-1 overflow-y-auto p-1 custom-scrollbar bg-surface rounded-b-lg" style={{position: 'relative'}}>
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
                {displayLayers.map((layer) => (
                <LayerItem
                    key={layer.id}
                    layer={layer}
                    isSelected={selectedIds.has(layer.id)}
                    onSelect={onSelect}
                    t={t}
                />
                ))}
            </Reorder.Group>
          </LayoutGroup>
        )}
      </div>
    </div>
  );
};

const LayerItem = ({ layer, isSelected, onSelect, t }: any) => {
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
      onClick={(e) => onSelect(layer.id, e.shiftKey)}
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
