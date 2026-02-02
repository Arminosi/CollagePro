import { useEffect, useCallback } from 'react';
import { CanvasLayer } from '../types';

interface UseKeyboardShortcutsProps {
  layers: CanvasLayer[];
  selectedIds: Set<string>;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  onToggleBatchSelect: () => void;
  onAltKeyChange: (pressed: boolean) => void;
  onCopyLayers?: () => void;
  onPasteLayers?: () => void;
  onMoveLayers?: (dx: number, dy: number) => void;
  onRotateLayers?: (angle: number) => void;
}

export const useKeyboardShortcuts = ({
  layers,
  selectedIds,
  onUndo,
  onRedo,
  onSave,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onToggleBatchSelect,
  onAltKeyChange,
  onCopyLayers,
  onPasteLayers,
  onMoveLayers,
  onRotateLayers
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Track Alt key state
      if (e.key === 'Alt') {
        onAltKeyChange(true);
      }

      // Ctrl+S / Cmd+S for manual save
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSave();
      }

      // Ctrl+Z / Cmd+Z for undo
      // Ctrl+Shift+Z / Cmd+Shift+Z for redo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
      }

      // Ctrl+Y / Cmd+Y for redo (alternative)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        onRedo();
      }

      // Ctrl+A / Cmd+A for select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !isInputField) {
        e.preventDefault();
        onSelectAll();
      }

      // Ctrl+D / Cmd+D for deselect all
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        onDeselectAll();
      }

      // Ctrl+C / Cmd+C for copy
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !isInputField) {
        e.preventDefault();
        onCopyLayers?.();
      }

      // Ctrl+V / Cmd+V for paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && !isInputField) {
        e.preventDefault();
        onPasteLayers?.();
      }

      // V key to toggle batch select mode (without Ctrl/Cmd)
      if (e.key === 'v' && !isInputField && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onToggleBatchSelect();
      }

      // Delete/Backspace to delete selected layers
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputField) {
        if (selectedIds.size > 0) onDelete();
      }

      // Arrow keys to move selected layers
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !isInputField) {
        if (selectedIds.size > 0 && onMoveLayers) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          let dx = 0, dy = 0;
          switch (e.key) {
            case 'ArrowUp': dy = -step; break;
            case 'ArrowDown': dy = step; break;
            case 'ArrowLeft': dx = -step; break;
            case 'ArrowRight': dx = step; break;
          }
          onMoveLayers(dx, dy);
        }
      }

      // R key to rotate 90° clockwise (with Shift for counter-clockwise)
      if (e.key === 'r' && !isInputField && !e.ctrlKey && !e.metaKey) {
        if (selectedIds.size > 0 && onRotateLayers) {
          e.preventDefault();
          const angle = e.shiftKey ? -90 : 90;
          onRotateLayers(angle);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        onAltKeyChange(false);
      }
    };

    const handleBlur = () => {
      onAltKeyChange(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [layers, selectedIds, onUndo, onRedo, onSave, onSelectAll, onDeselectAll, onDelete, onToggleBatchSelect, onAltKeyChange, onCopyLayers, onPasteLayers, onMoveLayers, onRotateLayers]);
};