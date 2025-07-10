// mega-file-picker.tsx

import React, { useState, useCallback } from 'react';
import { Upload, Shuffle, Copy, Download, Folder, RefreshCw, ExternalLink } from 'lucide-react';

interface MegaFile {
  id: number;
  fileName: string;
  fullPath: string;
  folderPath: string;
  extension: string;
  type: string;
  handle: string;
}

const MegaFilePicker = () => {
  const [database, setDatabase] = useState<MegaFile[]>([]);
  const [currentBatch, setCurrentBatch] = useState<MegaFile[]>([]);
  const [currentFile, setCurrentFile] = useState<MegaFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [stats, setStats] = useState({ folders: 0, files: 0 });

  // --- THIS IS THE UPDATED FUNCTION FOR YOUR COPY-PASTE METHOD ---
  const parseNewStructure = useCallback((text: string): MegaFile[] => {
    const lines = text.split('\n');
    const files: MegaFile[] = [];
    
    // This regex captures the path and the handle from the `megacmd` output format.
    const lineRegex = /^(.+?)\s+<H:([^>]+)>$/;

    for (const line of lines) {
      // We only care about lines that contain the handle format.
      // This automatically skips command prompts or other junk text.
      if (line.includes('<H:')) {
        const trimmedLine = line.trim();
        const match = trimmedLine.match(lineRegex);

        if (match && match.length === 3) {
          const fullPath = match[1].trim();
          const handle = match[2].trim();

          const pathSegments = fullPath.split('/').filter(Boolean);
          if (pathSegments.length === 0) continue;

          const fileName = pathSegments[pathSegments.length - 1];
          // Handle root files where folderPath would be empty
          const folderPath = pathSegments.length > 1 ? '/' + pathSegments.slice(0, -1).join('/') : '/';
          const extension = fileName.split('.').pop()?.toLowerCase() || '';

          files.push({
            id: files.length,
            fileName,
            fullPath,
            folderPath,
            extension,
            type: getFileType(extension),
            handle,
          });
        }
      }
    }
    
    return files;
  }, []);
  // --- END OF UPDATED FUNCTION ---

  const getFileType = (extension: string) => {
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg'];
    const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
    
    if (imageExts.includes(extension)) return 'image';
    if (videoExts.includes(extension)) return 'video';
    if (audioExts.includes(extension)) return 'audio';
    if (docExts.includes(extension)) return 'document';
    return 'file';
  };

  const getFileIcon = (type: string) => {
    switch(type) {
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'audio': return '🎵';
      case 'document': return '📄';
      default: return '📁';
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    setIsLoading(true);
    try {
      const text = await file.text();
      const parsedFiles = parseNewStructure(text);
      if (parsedFiles.length === 0) {
        alert('Could not find any valid file entries. Please ensure you copy-pasted the lines containing file paths and handles (e.g., /path/to/file.jpg <H:handle>).');
      }
      setDatabase(parsedFiles);
      setCurrentBatch([]);
      setCurrentFile(null);
      
      const folders = new Set(parsedFiles.map(f => f.folderPath)).size;
      setStats({
        files: parsedFiles.length,
        folders,
      });
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Error parsing file. Please check the format.');
    } finally {
      setIsLoading(false);
    }
  };

  // The rest of the file is identical to the previous version...
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const pickRandomFile = () => {
    if (database.length === 0) return;
    
    const randomFile = database[Math.floor(Math.random() * database.length)];
    setCurrentFile(randomFile);
    
    if (!currentBatch.find(f => f.id === randomFile.id)) {
      setCurrentBatch(prev => [randomFile, ...prev]);
    }
  };

  const generateBatch = (count = 10) => {
    if (database.length === 0) return;
    
    const batch: MegaFile[] = [];
    const used = new Set<number>();
    
    const limit = Math.min(count, database.length);
    while (batch.length < limit) {
      const randomFile = database[Math.floor(Math.random() * database.length)];
      if (!used.has(randomFile.id)) {
        batch.push(randomFile);
        used.add(randomFile.id);
      }
    }
    
    setCurrentBatch(batch);
    setCurrentFile(batch[0] || null);
  };

  const copyAllFiles = () => {
    if (currentBatch.length === 0) return;
    
    const timestamp = new Date().toLocaleString();
    const text = `Random Files - ${timestamp}\n\n` + 
      currentBatch.map((file, index) => 
        `${index + 1}. ${file.fileName}\n   Path: ${file.fullPath}\n   Link: https://mega.nz/file/${file.handle}\n`
      ).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      alert('Files and links copied to clipboard!');
    });
  };

  const downloadFileList = () => {
    if (currentBatch.length === 0) return;
    
    const timestamp = new Date().toISOString().split('T')[0];
     const text = `Random Files - ${timestamp}\n\n` + 
      currentBatch.map((file, index) => 
        `${index + 1}. ${file.fileName}\n   Path: ${file.fullPath}\n   Link: https://mega.nz/file/${file.handle}\n`
      ).join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `random-files-${timestamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const clearBatch = () => {
    setCurrentBatch([]);
    setCurrentFile(null);
  };

  const resetApp = () => {
    setDatabase([]);
    setCurrentBatch([]);
    setCurrentFile(null);
    setStats({ folders: 0, files: 0 });
  };

  const openInMega = (handle: string) => {
    if (!handle) return;
    const megaUrl = `https://mega.nz/file/${handle}`;
    window.open(megaUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-sans">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">MEGA File Picker</h1>
            <p className="text-gray-600 text-sm">Random file discovery from your MEGA cloud</p>
          </div>

          {database.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">Drop your .txt file here.</p>
              <p className="text-xs text-gray-500 mb-4">
                (Create the .txt file by copy-pasting the output of the `find` command)
              </p>
              <input type="file" accept=".txt,.log" onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} className="hidden" id="fileInput" />
              <label htmlFor="fileInput" className="bg-blue-500 text-white px-6 py-3 rounded-xl cursor-pointer hover:bg-blue-600 transition-colors inline-block">
                Choose File
              </label>
            </div>
          ) : (
             <>
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.files}</div>
                  <div className="text-xs text-gray-600">Files</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.folders}</div>
                  <div className="text-xs text-gray-600">Unique Folders</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{currentBatch.length}</div>
                  <div className="text-xs text-gray-600">In Batch</div>
                </div>
              </div>

              {currentFile && (
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-5 mb-6 text-white shadow-lg">
                  <div className="flex items-start mb-4">
                    <span className="text-3xl mr-4 mt-1">{getFileIcon(currentFile.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xl break-words">{currentFile.fileName}</div>
                      <div className="text-blue-200 text-sm capitalize">{currentFile.type}</div>
                    </div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-xl p-3 mb-4 text-sm flex items-start">
                    <Folder className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="break-all">{currentFile.folderPath}</span>
                  </div>
                  <button
                    onClick={() => openInMega(currentFile.handle)}
                    className="w-full bg-white text-blue-600 font-semibold px-4 py-3 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2"
                  >
                    <ExternalLink className="h-5 w-5" />
                    <span>Open in MEGA</span>
                  </button>
                </div>
              )}
              
              <div className="space-y-3 mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={pickRandomFile} disabled={isLoading} className="bg-blue-500 text-white px-4 py-3 rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2">
                    <Shuffle className="h-5 w-5" /> <span>Pick Random</span>
                  </button>
                  <button onClick={() => generateBatch(10)} disabled={isLoading} className="bg-green-500 text-white px-4 py-3 rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center space-x-2">
                    <RefreshCw className="h-5 w-5" /> <span>New Batch</span>
                  </button>
                </div>
                
                {currentBatch.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={copyAllFiles} className="bg-purple-500 text-white p-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center space-x-1 text-sm">
                      <Copy className="h-4 w-4" /> <span>Copy List</span>
                    </button>
                    <button onClick={downloadFileList} className="bg-indigo-500 text-white p-2 rounded-lg hover:bg-indigo-600 transition-colors flex items-center justify-center space-x-1 text-sm">
                      <Download className="h-4 w-4" /> <span>Download List</span>
                    </button>
                    <button onClick={clearBatch} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center justify-center">
                      Clear Batch
                    </button>
                  </div>
                )}
              </div>
              
              {currentBatch.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Current Batch ({currentBatch.length})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {currentBatch.map((file) => (
                      <div
                        key={file.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center space-x-3 ${
                          currentFile?.id === file.id ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setCurrentFile(file)}
                      >
                        <span className="text-lg">{getFileIcon(file.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{file.fileName}</div>
                          <div className="text-xs text-gray-500 truncate">{file.folderPath}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); openInMega(file.handle); }} className="text-gray-400 hover:text-blue-600 p-1 rounded-full">
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <button onClick={resetApp} className="w-full mt-6 bg-gray-500 text-white px-4 py-3 rounded-xl hover:bg-gray-600 transition-colors">
                Load Different File
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MegaFilePicker;