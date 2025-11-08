"use client";
import { useState } from 'react';

export function useUploadImages() {
  const [images, setImages] = useState<string[]>([]);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const files: File[] = Array.from(fileList);
    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          setImages((prev: string[]) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAt = (index: number) => {
  setImages((prev: string[]) => prev.filter((_, i) => i !== index));
  };

  const reset = () => setImages([]);

  return { images, addFiles, removeAt, reset };
}
