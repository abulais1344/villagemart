'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, X, ChevronUp, ChevronDown, ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui/Spinner';

interface ImageState {
  url: string;
  progress: number; // 0-100, 100 = done
  error?: string;
}

interface ProductImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  productId?: string;
  maxImages?: number;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIM = 800;

async function compressToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('WebP conversion failed'))),
        'image/webp',
        0.85
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
    img.src = objectUrl;
  });
}

export function ProductImageUpload({ images, onChange, productId, maxImages = 5 }: ProductImageUploadProps) {
  const [uploading, setUploading] = useState<Record<string, ImageState>>({});
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const tempId = useRef(productId ?? 'temp-' + Math.random().toString(36).slice(2));

  const uploadFile = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert(`${file.name}: only JPEG, PNG, or WebP allowed`);
      return;
    }
    if (file.size > MAX_SIZE) {
      alert(`${file.name}: file must be under 10MB`);
      return;
    }
    if (images.length >= maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    const key = file.name + Date.now();
    setUploading(prev => ({ ...prev, [key]: { url: '', progress: 10 } }));

    try {
      // Compress + convert to WebP
      const blob = await compressToWebP(file);
      setUploading(prev => ({ ...prev, [key]: { ...prev[key], progress: 40 } }));

      const filename = `${Date.now()}_${file.name.replace(/\.[^.]+$/, '')}.webp`;
      const path = `${tempId.current}/${filename}`;

      const { error } = await supabase.storage
        .from('products')
        .upload(path, blob, { contentType: 'image/webp', upsert: false });

      if (error) throw error;

      setUploading(prev => ({ ...prev, [key]: { ...prev[key], progress: 90 } }));

      const { data } = supabase.storage.from('products').getPublicUrl(path);
      const publicUrl = data.publicUrl;

      setUploading(prev => ({ ...prev, [key]: { url: publicUrl, progress: 100 } }));
      onChange([...images, publicUrl]);

      // Clean up progress state after short delay
      setTimeout(() => setUploading(prev => { const n = { ...prev }; delete n[key]; return n; }), 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploading(prev => ({ ...prev, [key]: { ...prev[key], progress: 0, error: msg } }));
      setTimeout(() => setUploading(prev => { const n = { ...prev }; delete n[key]; return n; }), 3000);
    }
  }, [images, maxImages, onChange, supabase]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = maxImages - images.length;
    Array.from(files).slice(0, remaining).forEach(uploadFile);
  };

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...images];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };

  const moveDown = (idx: number) => {
    if (idx === images.length - 1) return;
    const next = [...images];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  };

  const activeUploads = Object.values(uploading);
  const isUploading = activeUploads.some(u => u.progress < 100 && !u.error);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#1A1A1A]">Product Images</p>
        <p className="text-xs text-[#6B7280]">{images.length}/{maxImages} · First image = main photo</p>
      </div>

      {/* Uploaded images grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {images.map((url, idx) => (
            <div key={url} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Product image ${idx + 1}`}
                className="w-full aspect-square object-cover rounded-xl border border-[#E5E7EB]"
              />
              {idx === 0 && (
                <span className="absolute top-1 left-1 bg-primary-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  Main
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="bg-white rounded-full p-1 disabled:opacity-30"
                >
                  <ChevronUp className="w-3 h-3 text-[#1A1A1A]" />
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="bg-white rounded-full p-1"
                >
                  <X className="w-3 h-3 text-error" />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(idx)}
                  disabled={idx === images.length - 1}
                  className="bg-white rounded-full p-1 disabled:opacity-30"
                >
                  <ChevronDown className="w-3 h-3 text-[#1A1A1A]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload progress bars */}
      {activeUploads.map((u, i) => (
        <div key={i} className="space-y-1">
          {u.error ? (
            <p className="text-xs text-error">{u.error}</p>
          ) : (
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${u.progress}%` }}
              />
            </div>
          )}
        </div>
      ))}

      {/* Drop zone */}
      {images.length < maxImages && (
        <div
          className={`border-2 border-dashed rounded-2xl transition-colors cursor-pointer
            ${dragging ? 'border-primary-500 bg-primary-50' : 'border-[#E5E7EB] hover:border-primary-400 hover:bg-gray-50'}`}
          onClick={() => !isUploading && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        >
          <div className="h-24 flex flex-col items-center justify-center gap-1.5 text-[#6B7280]">
            {isUploading ? (
              <Spinner />
            ) : (
              <>
                <Upload className="w-6 h-6 text-primary-400" />
                <p className="text-sm font-medium">Drag & drop or tap to upload</p>
                <p className="text-xs">JPEG, PNG, WebP · max 10MB · compressed to 800×800</p>
              </>
            )}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
