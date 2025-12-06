/// <reference lib="dom" />
import React from 'react';
import { Trash2, ArrowUp, ArrowDown, Download, Maximize, Layers, X } from 'lucide-react';
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
  hasSelection: boolean;
  lang: Language;
  onFitView?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onDelete,
  onBringToFront,
  onSendToBack,
  onDownload,
  hasSelection,
  lang,
  onFitView,
  onSelectAll,
  onDeselectAll
}) => {
  const t = translations[lang];
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div
      className="fixed z-50 w-48 bg-surface border border-slate-600 rounded-lg shadow-xl text-sm overflow-hidden"
      style={{ top: y, left: x }}
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
            <button onClick={() => { onDownload(); onClose(); }} className="flex items-center px-4 py-2 hover:bg-slate-700 text-left">
              <Download className="w-4 h-4 mr-2" /> {t.saveImage}
            </button>
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