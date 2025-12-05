
/// <reference lib="dom" />
import React from 'react';
import { 
  Settings, Clock, Image as ImageIcon, RotateCcw, Upload, Grid, Github
} from 'lucide-react';
import { AppSettings, SavedVersion, Language } from '../types';
import { translations } from '../utils/i18n';

interface SidebarProps {
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  versions: SavedVersion[];
  onLoadVersion: (v: SavedVersion) => void;
  isOpen: boolean;
  lang: Language;
  onProcessFiles: (files: File[]) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  settings,
  updateSettings,
  versions,
  onLoadVersion,
  isOpen,
  lang,
  onProcessFiles
}) => {
  const [tab, setTab] = React.useState<'settings' | 'history'>('settings');
  const [confirmGithub, setConfirmGithub] = React.useState(false);
  const t = translations[lang];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onProcessFiles(Array.from(e.target.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onProcessFiles(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  React.useEffect(() => {
    const handleClickOutside = () => setConfirmGithub(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div 
      className={`
        bg-surface border-r border-slate-800 flex flex-col z-20 shrink-0
        transition-[width,opacity] duration-300 ease-in-out overflow-hidden
        ${isOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 border-r-0'}
      `}
    >
      {/* Tabs */}
      <div className="flex border-b border-slate-700 min-w-[20rem]">
        <button 
          onClick={() => setTab('settings')}
          className={`flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 ${tab === 'settings' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Settings className="w-4 h-4" /> {t.tools}
        </button>
        <button 
          onClick={() => setTab('history')}
          className={`flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 ${tab === 'history' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Clock className="w-4 h-4" /> {t.versions}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar min-w-[20rem]">
        {tab === 'settings' && (
          <>
            {/* Upload Section */}
            <div className="space-y-2">
                <label 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer bg-slate-900/50 hover:bg-slate-800 hover:border-primary/50 transition-colors group"
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
                        <Upload className="w-8 h-8 mb-2 text-slate-400 group-hover:text-primary transition-colors" />
                        <p className="text-sm text-slate-400 font-medium">{t.clickToUpload}</p>
                        <p className="text-xs text-slate-500 mt-1">{t.uploadSubtext}</p>
                    </div>
                    <input type="file" className="hidden" multiple accept="image/*" onChange={handleFileInput} />
                </label>
            </div>

            <div className="h-px bg-slate-800" />

            {/* Background */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.background}</h3>
              <div className="p-3 bg-slate-900/50 rounded-lg space-y-3">
                 <div className="flex rounded bg-slate-800 p-1">
                    <button 
                       onClick={() => updateSettings({ backgroundMode: 'grid' })}
                       className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-2 ${settings.backgroundMode === 'grid' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                      <Grid className="w-3 h-3" /> {t.bgGrid}
                    </button>
                    <button 
                       onClick={() => updateSettings({ backgroundMode: 'solid' })}
                       className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-2 ${settings.backgroundMode === 'solid' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                      <div className="w-3 h-3 rounded-full bg-white border border-slate-400" /> {t.bgSolid}
                    </button>
                 </div>
                 {settings.backgroundMode === 'solid' && (
                   <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">{t.color}</span>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 font-mono uppercase">{settings.backgroundColor}</span>
                            <div className="relative overflow-hidden w-8 h-8 rounded-full ring-2 ring-slate-700 ring-offset-2 ring-offset-slate-900">
                                <input 
                                type="color" 
                                value={settings.backgroundColor}
                                onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                />
                            </div>
                        </div>
                      </div>
                      
                      {/* Preview Toggle */}
                      <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                          <span className="text-xs text-slate-400">{t.previewBg}</span>
                          <button 
                            onClick={() => updateSettings({ previewBackground: !settings.previewBackground })}
                            className={`w-9 h-5 rounded-full transition-colors relative ${settings.previewBackground ? 'bg-primary' : 'bg-slate-700'}`}
                          >
                            <div className={`absolute top-1 bottom-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.previewBackground ? 'left-5' : 'left-1'}`} />
                          </button>
                      </div>
                   </div>
                 )}
              </div>
            </div>
            
            <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg">
                <p className="text-xs text-blue-300/80 leading-relaxed">
                    <strong>{t.tipTitle}</strong> {t.tipBeforeShift} <code className="bg-blue-900/50 px-1.5 py-0.5 rounded text-blue-200 border border-blue-800">Shift</code> {t.tipAfterShift}
                </p>
            </div>
          </>
        )}

        {tab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.savedExports}</h3>
            {versions.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                {t.noVersions} <br/> {t.noVersionsSub}
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map(v => (
                  <div
                    key={v.id}
                    className="w-full bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden group"
                  >
                    <div className="aspect-video w-full bg-slate-950 relative border-b border-slate-800">
                      {v.thumbnail ? (
                        <img src={v.thumbnail} alt="Version" className="w-full h-full object-contain" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                           <ImageIcon className="w-8 h-8 text-slate-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button 
                             onClick={() => onLoadVersion(v)}
                             className="bg-primary hover:bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 shadow-lg"
                          >
                             <RotateCcw className="w-3 h-3" /> {t.restore}
                          </button>
                      </div>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                        <div>
                           <div className="text-xs font-medium text-slate-200">{t.version}</div>
                           <div className="text-[10px] text-slate-500">{new Date(v.timestamp).toLocaleString()}</div>
                        </div>
                        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
                           {v.layers.length} {t.layersCount}
                        </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="px-2 py-4 border-t border-slate-800 flex flex-col items-center gap-3 min-w-[20rem]">
        
        <div className="w-full flex flex-col gap-2">
           <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
               <span>{lang === 'zh' ? '作者' : 'Author'}:</span>
               <span className="text-slate-300 font-medium">Arminosi</span>
           </div>
           
           <button 
              onClick={(e) => {
                  e.stopPropagation();
                  if (confirmGithub) {
                      window.open('https://github.com/Arminosi/CollagePro', '_blank', 'noopener,noreferrer');
                      setConfirmGithub(false);
                  } else {
                      setConfirmGithub(true);
                  }
              }}
              className={`flex items-center justify-center gap-2 px-3 py-1.5 border rounded-lg transition-all text-xs font-medium ${
                  confirmGithub 
                      ? 'bg-blue-600 hover:bg-blue-700 border-blue-500 text-white' 
                      : 'bg-slate-900/50 hover:bg-slate-800 border-slate-700/50 hover:border-slate-600 text-slate-400 hover:text-white'
              }`}
           >
              <Github className={`w-3.5 h-3.5 ${confirmGithub ? 'text-white' : 'group-hover:text-white transition-colors'}`} />
              <span>{confirmGithub ? (lang === 'zh' ? '确认？' : 'Confirm?') : 'GitHub'}</span>
           </button>
        </div>

        <div className="w-full text-[9px] tracking-tighter text-slate-600 text-center whitespace-nowrap">
          {t.footer}
        </div>
      </div>
    </div>
  );
};
