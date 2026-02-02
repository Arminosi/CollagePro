/// <reference lib="dom" />
import React from 'react';
import { Trash2, ArrowUp, ArrowDown, Download, Maximize, Layers, X, Info, RotateCw, RotateCcw, RefreshCw, ZoomIn } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/i18n';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDownload: () => void;
  onShowImageInfo?: () => void;
  hasSelection: boolean;
  isSingleSelection?: boolean;
  lang: Language;
  onFitView?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onRotate90CW?: () => void;
  onRotate90CCW?: () => void;
  onResetRotation?: () => void;
  onFitToOriginalResolution?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onDelete,
  onBringToFront,
  onSendToBack,
  onDownload,
  onShowImageInfo,
  hasSelection,
  isSingleSelection,
  lang,
  onFitView,
  onSelectAll,
  onDeselectAll,
  onRotate90CW,
  onRotate90CCW,
  onResetRotation,
  onFitToOriginalResolution
}) => {
  const t = translations[lang];
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = React.useState({ x, y });

  // Adjust position to keep menu within viewport
  React.useLayoutEffect(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const menuRect = menu.getBoundingClientRect();
    const padding = 8; // Padding from viewport edges

    let newX = x;
    let newY = y;

    // Check right edge overflow
    if (x + menuRect.width > window.innerWidth - padding) {
      newX = window.innerWidth - menuRect.width - padding;
    }

    // Check left edge overflow
    if (newX < padding) {
      newX = padding;
    }

    // Check bottom edge overflow
    if (y + menuRect.height > window.innerHeight - padding) {
      newY = window.innerHeight - menuRect.height - padding;
    }

    // Check top edge overflow
    if (newY < padding) {
      newY = padding;
    }

    setAdjustedPosition({ x: newX, y: newY });
  }, [x, y]);

  React.useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-48 bg-surface border border-slate-600 rounded-lg shadow-xl text-sm overflow-hidden"
      style={{ top: adjustedPosition.y, left: adjustedPosition.x }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col py-1">
        {hasSelection ? (
          <>
            <button onClick={() => { onBringToFront(); onClose(); }} className="flex items-center px-4 py-2 hover:bg-slate-700 text-left">
              <ArrowUp className="w-4 h-4 mr-2" /> {t.bringToFront}
            </button>
            <button onClick={() => { onSendToBack(); onClose(); }} className="flex items-center px-4 py-2 hover:bg-slate-700 text-left">
              <ArrowDown className="w-4 h-4 mr-2" /> {t.sendToBack}
            </button>
            <div className="h-px bg-slate-700 my-1" />

            {/* Rotation options */}
            <button onClick={() => { onRotate90CW?.(); onClose(); }} className="flex items-center px-4 py-2 hover:bg-slate-700 text-left">
              <RotateCw className="w-4 h-4 mr-2" /> {t.rotate90CW || (lang === 'zh' ? '顺时针旋转90°' : 'Rotate 90° CW')}
            </button>
            <button onClick={() => { onRotate90CCW?.(); onClose(); }} className="flex items-center px-4 py-2 hover:bg-slate-700 text-left">
              <RotateCcw className="w-4 h-4 mr-2" /> {t.rotate90CCW || (lang === 'zh' ? '逆时针旋转90°' : 'Rotate 90° CCW')}
            </button>
            <button onClick={() => { onResetRotation?.(); onClose(); }} className="flex items-center px-4 py-2 hover:bg-slate-700 text-left">
              <RefreshCw className="w-4 h-4 mr-2" /> {lang === 'zh' ? '重置旋转' : 'Reset Rotation'}
            </button>

            {/* Resolution options */}
            {onFitToOriginalResolution && (
              <button onClick={() => { onFitToOriginalResolution(); onClose(); }} className="flex items-center px-4 py-2 hover:bg-slate-700 text-left">
                <ZoomIn className="w-4 h-4 mr-2" /> {lang === 'zh' ? '原始分辨率' : 'Original Resolution'}
              </button>
            )}

            <div className="h-px bg-slate-700 my-1" />
            <button onClick={() => { onDownload(); onClose(); }} className="flex items-center px-4 py-2 hover:bg-slate-700 text-left">
              <Download className="w-4 h-4 mr-2" /> {t.saveImage}
            </button>
            {isSingleSelection && onShowImageInfo && (
              <button onClick={() => { onShowImageInfo(); onClose(); }} className="flex items-center px-4 py-2 hover:bg-slate-700 text-left">
                <Info className="w-4 h-4 mr-2" /> {lang === 'zh' ? '显示原图信息' : 'Show Image Info'}
              </button>
            )}
            <div className="h-px bg-slate-700 my-1" />
            {onFitView && (
              <button onClick={() => { onFitView(); onClose(); }} className="flex items-center px-4 py-2 hover:bg-slate-700 text-left">
                <Maximize className="w-4 h-4 mr-2" /> {t.fitView}
              </button>
            )}
            {onSelectAll && (
              <button onClick={() => { onSelectAll(); onClose(); }} className="flex items-center px-4 py-2 hover:bg-slate-700 text-left">
                <Layers className="w-4 h-4 mr-2" /> {t.selectAll}
              </button>
            )}
            {onDeselectAll && (
              <button onClick={() => { onDeselectAll(); onClose(); }} className="flex items-center px-4 py-2 hover:bg-slate-700 text-left">
                <X className="w-4 h-4 mr-2" /> {t.deselectAll}
              </button>
            )}
            <div className="h-px bg-slate-700 my-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirmDelete) {
                  onDelete();
                  onClose();
                  setConfirmDelete(false);
                } else {
                  setConfirmDelete(true);
                }
              }}
              className={`flex items-center px-4 py-2 hover:bg-red-900/50 text-left transition-colors ${confirmDelete ? 'bg-red-900/50 text-red-300' : 'text-red-400'}`}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {confirmDelete ? (lang === 'zh' ? '确认删除？' : 'Confirm Delete?') : t.delete}
            </button>
          </>
        ) : (
          <>
            {onFitView && (
              <button onClick={() => { onFitView(); onClose(); }} className="flex items-center px-4 py-2 hover:bg-slate-700 text-left">
                <Maximize className="w-4 h-4 mr-2" /> {t.fitView}
              </button>
            )}
            {onSelectAll && (
              <button onClick={() => { onSelectAll(); onClose(); }} className="flex items-center px-4 py-2 hover:bg-slate-700 text-left">
                <Layers className="w-4 h-4 mr-2" /> {t.selectAll}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};