'use client';

import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui/Spinner';

interface ImageUploadProps {
  bucket: 'products' | 'merchants' | 'riders' | 'documents';
  onUpload: (url: string) => void;
  currentUrl?: string | null;
  accept?: string;
  label?: string;
}

export function ImageUpload({ bucket, onUpload, currentUrl, accept = 'image/*', label = 'Upload Image' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB');
      return;
    }

    setUploading(true);
    setError(null);

    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setPreview(data.publicUrl);
    onUpload(data.publicUrl);
    setUploading(false);
  };

  return (
    <div className="w-full">
      {label && <p className="text-sm font-medium text-[#1A1A1A] mb-2">{label}</p>}
      <div
        className={`relative border-2 border-dashed rounded-2xl transition-colors ${preview ? 'border-primary-300' : 'border-[#E5E7EB] hover:border-primary-400'} cursor-pointer`}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-2xl" />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setPreview(null); onUpload(''); }}
              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
            >
              <X className="w-4 h-4 text-[#6B7280]" />
            </button>
          </div>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center gap-2 text-[#6B7280]">
            {uploading ? (
              <Spinner />
            ) : (
              <>
                <Upload className="w-8 h-8 text-primary-400" />
                <p className="text-sm">Tap to upload</p>
                <p className="text-xs">Max 10MB</p>
              </>
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}
