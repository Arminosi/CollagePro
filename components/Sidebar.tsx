
/// <reference lib="dom" />
import React from 'react';
import {
  Settings, Clock, Image as ImageIcon, RotateCcw, Upload, Grid, Github, Trash2, AlertTriangle, Download,
  FileUp, Save, Filter
} from 'lucide-react';
import { AppSettings, SavedVersion, Language } from '../types';
import { translations } from '../utils/i18n';

interface SidebarProps {
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  versions: SavedVersion[];
  onLoadVersion: (v: SavedVersion) => void;
  onExportVersion: (v: SavedVersion) => void;
  onExportVersionPSD: (v: SavedVersion) => void;
  onImportVersion: (file: File) => void;
  onImportPSD: (file: File) => void;
  onExportPSD: () => void;
  onClearAllVersions: () => void;
  onDeleteVersion: (versionId: string) => void;
  onManualSave: () => void;
  isOpen: boolean;
  lang: Language;
  onProcessFiles: (files: File[]) => void;
  onClearCanvas: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  settings,
  updateSettings,
  versions,
  onLoadVersion,
  onExportVersion,
  onExportVersionPSD,
  onImportVersion,
  onImportPSD,
  onExportPSD,
  onClearAllVersions,
  onDeleteVersion,
  onManualSave,
  isOpen,
  lang,
  onProcessFiles,
  onClearCanvas
}) => {
  const [tab, setTab] = React.useState<'settings' | 'history'>('settings');
  const [confirmGithub, setConfirmGithub] = React.useState(false);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [confirmClearVersions, setConfirmClearVersions] = React.useState(0); // 0, 1, 2 for three-step confirmation
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [versionFilter, setVersionFilter] = React.useState<'all' | 'manual' | 'auto'>('all');
  const t = translations[lang];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      // Separate PSD files and image files
      const psdFiles = files.filter(f => f.name.toLowerCase().endsWith('.psd'));
      const imageFiles = files.filter(f => !f.name.toLowerCase().endsWith('.psd'));

      // Process PSD files
      psdFiles.forEach(file => onImportPSD(file));

      // Process image files
      if (imageFiles.length > 0) {
        onProcessFiles(imageFiles);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onProcessFiles(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const handleVersionPackageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportVersion(e.target.files[0]);
    }
    e.target.value = '';
  };

  const handlePSDInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportPSD(e.target.files[0]);
    }
    e.target.value = '';
  };

  // Filter versions
  const filteredVersions = versions.filter(v => {
    if (versionFilter === 'all') return true;
    return v.saveType === versionFilter;
  });

  React.useEffect(() => {
    const handleClickOutside = () => {
      setConfirmGithub(false);
      setConfirmClear(false);
      setConfirmClearVersions(0);
      setConfirmDeleteId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div
      className={`
        bg-surface border-r border-slate-800 flex flex-col shrink-0
        transition-[width,opacity] duration-300 ease-in-out overflow-hidden
        md:z-20 max-md:z-50
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
                        <p className="text-xs text-slate-500 mt-1">{t.uploadSubtextWithPSD}</p>
                    </div>
                    <input type="file" className="hidden" multiple accept="image/*,.psd" onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const files = Array.from(e.target.files);
                        const psdFiles = files.filter(f => f.name.toLowerCase().endsWith('.psd'));
                        const imageFiles = files.filter(f => !f.name.toLowerCase().endsWith('.psd'));

                        psdFiles.forEach(file => handlePSDInput({ target: { files: [file] } } as any));
                        if (imageFiles.length > 0) {
                          handleFileInput({ target: { files: imageFiles } } as any);
                        }
                      }
                      e.target.value = '';
                    }} />
                </label>
            </div>

            {/* Clear Canvas Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (confirmClear) {
                        onClearCanvas();
                        setConfirmClear(false);
                    } else {
                        setConfirmClear(true);
                    }
                }}
                className={`relative w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg transition-all text-sm font-medium ${
                    confirmClear
                        ? 'bg-red-600 hover:bg-red-700 border-red-500 text-white'
                        : 'bg-red-900/20 hover:bg-red-900/40 border-red-800/50 text-red-400 hover:text-red-300'
                }`}
            >
                <Trash2 className="w-4 h-4" />
                {t.clearCanvas}
                {confirmClear && (
                  <span className="absolute -top-9 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap border border-red-400">
                    {t.clearAllVersionsHint}
                  </span>
                )}
            </button>

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
            {/* Warning Banner */}
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 leading-relaxed">
                {t.localDataWarning}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onManualSave}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm hover:shadow-md"
                title={t.saveManuallyTooltip}
              >
                <Save className="w-4 h-4" />
                {t.saveManually}
              </button>
              <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-all cursor-pointer shadow-sm hover:shadow-md">
                <FileUp className="w-4 h-4" />
                {t.importVersion}
                <input type="file" className="hidden" accept=".zip" onChange={handleVersionPackageInput} />
              </label>
              <button
                onClick={onExportPSD}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm hover:shadow-md col-span-2"
              >
                <Download className="w-4 h-4" />
                {t.exportPSD}
              </button>
            </div>

            {/* Filter and Clear */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Filter className="w-4 h-4 text-slate-400" />
                <div className="flex rounded bg-slate-800 p-0.5 flex-1">
                  <button
                    onClick={() => setVersionFilter('all')}
                    className={`flex-1 py-1 text-[10px] font-medium rounded transition-colors ${versionFilter === 'all' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                  >
                    {t.filterAll}
                  </button>
                  <button
                    onClick={() => setVersionFilter('manual')}
                    className={`flex-1 py-1 text-[10px] font-medium rounded transition-colors ${versionFilter === 'manual' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                  >
                    {t.filterManual}
                  </button>
                  <button
                    onClick={() => setVersionFilter('auto')}
                    className={`flex-1 py-1 text-[10px] font-medium rounded transition-colors ${versionFilter === 'auto' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                  >
                    {t.filterAuto}
                  </button>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirmClearVersions === 2) {
                    // Third click: execute without browser confirm
                    onClearAllVersions();
                    setConfirmClearVersions(0);
                  } else {
                    // First or second click: increment counter
                    setConfirmClearVersions(confirmClearVersions + 1);
                  }
                }}
                className={`relative p-2 border rounded-lg transition-all ${
                  confirmClearVersions > 0
                    ? 'bg-red-600 hover:bg-red-700 border-red-500 text-white'
                    : 'bg-red-900/20 hover:bg-red-900/40 border-red-800/50 text-red-400 hover:text-red-300'
                }`}
                title={t.clearAllVersions}
              >
                <Trash2 className="w-4 h-4" />
                {confirmClearVersions > 0 && (
                  <span className="absolute -top-9 right-0 bg-red-600 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap border border-red-400">
                    {confirmClearVersions === 1 ? (lang === 'zh' ? '再次点击确认' : 'Click again') : (lang === 'zh' ? '最后确认！' : 'Final confirm!')}
                  </span>
                )}
              </button>
            </div>

            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.savedExports} ({filteredVersions.length})
            </h3>
            {filteredVersions.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                {t.noVersions} <br/> {t.noVersionsSub}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredVersions.map(v => (
                  <div
                    key={v.id}
                    className="w-full bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden group"
                  >
                    <div className="aspect-video w-full bg-slate-950 relative border-b border-slate-800">
                      {/* Save type badge */}
                      <div className="absolute top-2 left-2 z-10">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          v.saveType === 'manual'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-600 text-slate-300'
                        }`}>
                          {v.saveType === 'manual' ? t.manualSave : t.autoSave}
                        </span>
                      </div>
                      {v.thumbnail ? (
                        <img src={v.thumbnail} alt="Version" className="w-full h-full object-contain" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                           <ImageIcon className="w-8 h-8 text-slate-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 px-2">
                          <button
                             onClick={() => onLoadVersion(v)}
                             className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 shadow-lg"
                             title={t.restore}
                          >
                             <RotateCcw className="w-3 h-3" />
                             <span className="hidden sm:inline">{lang === 'zh' ? '恢复' : 'Restore'}</span>
                          </button>
                          <button
                             onClick={(e) => {
                               e.stopPropagation();
                               onExportVersion(v);
                             }}
                             className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 shadow-lg"
                             title={t.exportVersionTooltip}
                          >
                             <Download className="w-3 h-3" />
                             <span className="hidden sm:inline">{lang === 'zh' ? '导出' : 'Export'}</span>
                          </button>
                          <button
                             onClick={(e) => {
                               e.stopPropagation();
                               onExportVersionPSD(v);
                             }}
                             className="bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 shadow-lg"
                             title={t.exportVersionPSD}
                          >
                             <Download className="w-3 h-3" />
                             <span className="hidden sm:inline">PSD</span>
                          </button>
                          <button
                             onClick={(e) => {
                               e.stopPropagation();
                               if (confirmDeleteId === v.id) {
                                 onDeleteVersion(v.id);
                                 setConfirmDeleteId(null);
                               } else {
                                 setConfirmDeleteId(v.id);
                               }
                             }}
                             className={`relative px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 shadow-lg transition-all ${
                               confirmDeleteId === v.id
                                 ? 'bg-red-600 hover:bg-red-700 text-white'
                                 : 'bg-red-900/80 hover:bg-red-800 text-red-200'
                             }`}
                             title={lang === 'zh' ? '删除' : 'Delete'}
                          >
                             <Trash2 className="w-3 h-3" />
                             <span className="hidden sm:inline">{lang === 'zh' ? '删除' : 'Delete'}</span>
                             {confirmDeleteId === v.id && (
                               <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap border border-red-400">
                                 {t.clearAllVersionsHint}
                               </span>
                             )}
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
