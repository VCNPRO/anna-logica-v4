'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { type AnalysisResult } from '@/lib/types';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button'; 

interface FileUploaderProps {
    onUploadStart: () => void;
    onUploadSuccess: (result: AnalysisResult) => void;
    onUploadError: (message: string) => void;
    isLoading: boolean;
}

export function FileUploader({ onUploadStart, onUploadSuccess, onUploadError, isLoading }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('FileUploader');

  const handleUpload = async (file: File) => {
    if (!file) return;

    if (file.size > 200 * 1024 * 1024) {
        onUploadError(t('sizeExceededError'));
        return;
    }

    onUploadStart();

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('uploadError'));
      }
      
      onUploadSuccess(data);

    } catch (error: unknown) {
      let message = t('connectionError');
      if (error instanceof Error) {
        message = error.message;
      }
      onUploadError(message);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl">
        <div
            className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg transition-all duration-300 ease-in-out
            ${isDragging ? 'border-blue-500 bg-gray-700' : 'border-gray-600 hover:border-blue-500 hover:bg-gray-700'}
            ${isLoading && 'cursor-not-allowed opacity-60'}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={!isLoading ? triggerFileSelect : undefined}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                disabled={isLoading}
            />
            {isLoading ? (
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div> 
                    <p className="text-xl text-blue-400 font-semibold">{t('processingFile')}</p> 
                    <p className="mt-2 text-sm text-gray-400">{t('processingTimeWarning')}</p>
                </div>
            ) : (
                <>
                    <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg> 
                    <p className="text-lg text-gray-300 font-medium">{t('dragAndDropPrompt')}</p>
                    <p className="mt-2 text-sm text-gray-500">{t('or')}</p>
                    <Button className="mt-4 px-6 py-2" size="lg"> 
                        {t('selectFileButton')}
                    </Button>
                </>
            )}
            <p className="mt-4 text-xs text-gray-500">{t('maxFileSize')}</p>
        </div>
    </div>
  );
}