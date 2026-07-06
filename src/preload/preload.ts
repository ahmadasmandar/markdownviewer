/**
 * @author Ahmad Asmandar <ahmedasmnr2@gmail.com>
 * @license MIT
 */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  exportHtml: (filePath: string, content: string) => ipcRenderer.invoke('export:html', filePath, content),
  exportPdf: (filePath: string) => ipcRenderer.invoke('export:pdf', filePath),
  readDroppedFile: (filePath: string) => ipcRenderer.invoke('file:readDropped', filePath),
  getOpenFileArg: () => ipcRenderer.invoke('file:getOpenArg'),
  onFileOpenedExternally: (callback: (data: any) => void) => {
    ipcRenderer.on('file:opened-externally', (_, data) => callback(data));
  },
  onZoomIn: (callback: () => void) => {
    ipcRenderer.on('menu:zoom-in', callback);
  },
  onZoomOut: (callback: () => void) => {
    ipcRenderer.on('menu:zoom-out', callback);
  },
  onZoomReset: (callback: () => void) => {
    ipcRenderer.on('menu:zoom-reset', callback);
  },
  onExportPdf: (callback: () => void) => {
    ipcRenderer.on('menu:export-pdf', callback);
  },
  onExportHtml: (callback: () => void) => {
    ipcRenderer.on('menu:export-html', callback);
  },
  openFolder: (filePath: string) => ipcRenderer.invoke('file:openFolder', filePath),
  selectMultipleFiles: () => ipcRenderer.invoke('dialog:selectMultipleFiles'),
  selectOutputFolder: (defaultPath: string) => ipcRenderer.invoke('dialog:selectOutputFolder', defaultPath),
  exportPdfFromHtml: (htmlContent: string, outputPath: string) => ipcRenderer.invoke('export:pdfFromHtml', htmlContent, outputPath),
  
  // New Save and Menu API
  saveFile: (filePath: string, content: string) => ipcRenderer.invoke('file:save', filePath, content),
  saveCopyAs: (content: string, defaultPath?: string) => ipcRenderer.invoke('file:saveCopyAs', content, defaultPath),
  onOpenFile: (callback: () => void) => {
    ipcRenderer.on('menu:open-file', callback);
  },
  onSave: (callback: () => void) => {
    ipcRenderer.on('menu:save', callback);
  },
  onSaveCopyAs: (callback: () => void) => {
    ipcRenderer.on('menu:save-copy-as', callback);
  },
  onToggleEdit: (callback: () => void) => {
    ipcRenderer.on('menu:toggle-edit', callback);
  },
  onAbout: (callback: () => void) => {
    ipcRenderer.on('menu:about', callback);
  }
});
