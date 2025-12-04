/// <reference lib="dom" />
import React from 'react';
import { Trash2, ArrowUp, ArrowDown, Download } from 'lucide-react';
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
  lang
}) => {
  const t = translations[lang];

  React.useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  if (!hasSelection) return null;

  return (
    <div
      className="fixed z-50 w-48 bg-surface border border-slate-600 rounded-lg shadow-xl text-sm overflow-hidden"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col py-1">
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
        <button onClick={() => { onDelete(); onClose(); }} className="flex items-center px-4 py-2 hover:bg-red-900/50 text-red-400 text-left">
          <Trash2 className="w-4 h-4 mr-2" /> {t.delete}
        </button>
      </div>
    </div>
  );
};