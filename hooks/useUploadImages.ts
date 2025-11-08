"use client";
import { useState } from 'react';
import { processMultipleImages, CompressedImages } from '../lib/imageCompression';

export interface ImagePair {
  original: string;
  thumbnail: string;
}

export function useUploadImages() {
  const [images, setImages] = useState<ImagePair[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    
    setIsCompressing(true);
    try {
      const compressed = await processMultipleImages(fileList);
      const newImages: ImagePair[] = compressed.map((img: CompressedImages) => ({
        original: img.original,
        thumbnail: img.thumbnail
      }));
      setImages((prev: ImagePair[]) => [...prev, ...newImages]);
    } catch (error) {
      console.error('Error procesando imágenes:', error);
    } finally {
      setIsCompressing(false);
    }
  };

  const removeAt = (index: number) => {
    setImages((prev: ImagePair[]) => prev.filter((_, i) => i !== index));
  };

  const reset = () => setImages([]);

  return { images, addFiles, removeAt, reset, isCompressing };
}
