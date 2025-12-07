import React from 'react';

interface ShortcutItemProps {
  label: string;
  keys: string[];
  altKeys?: string[];
  isMouseOp?: boolean;
  note?: string; // Optional note to display after keys
}

export const ShortcutItem: React.FC<ShortcutItemProps> = ({
  label,
  keys,
  altKeys,
  isMouseOp = false,
  note
}) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-slate-300">{label}</span>
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {keys.map((key, i) => (
          <React.Fragment key={i}>
            <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
              isMouseOp
                ? 'bg-slate-700 text-slate-300 border border-slate-600'
                : 'bg-slate-800 text-primary border border-primary/30'
            }`}>
              {key}
            </kbd>
            {i < keys.length - 1 && <span className="text-slate-500 text-[10px] mx-0.5">+</span>}
          </React.Fragment>
        ))}
      </div>
      {altKeys && (
        <>
          <span className="text-slate-600 text-[10px] mx-1">/</span>
          <div className="flex items-center gap-0.5">
            {altKeys.map((key, i) => (
              <React.Fragment key={i}>
                <kbd className="px-1.5 py-0.5 bg-slate-800 text-primary border border-primary/30 rounded text-[10px] font-mono">
                  {key}
                </kbd>
                {i < altKeys.length - 1 && <span className="text-slate-500 text-[10px] mx-0.5">+</span>}
              </React.Fragment>
            ))}
          </div>
        </>
      )}
      {note && (
        <span className="text-slate-500 text-[10px] ml-1">({note})</span>
      )}
    </div>
  </div>
);