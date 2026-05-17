'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

interface Props {
  extracting: boolean
  onExtract: (files: File[]) => void
}

/**
 * Photo picker for the new-recipe page.
 * Manages up to 3 selected files with object-URL previews, cleans up on unmount.
 */
export default function PhotoPicker({ extracting, onExtract }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  useEffect(() => {
    return () => { imagePreviews.forEach((u) => URL.revokeObjectURL(u)) }
  }, [imagePreviews])

  function handleChange() {
    const newFiles = Array.from(fileRef.current?.files ?? [])
    const merged = [...selectedFiles, ...newFiles].slice(0, 3)
    const mergedSet = new Set(merged)
    selectedFiles.forEach((f, idx) => {
      if (!mergedSet.has(f)) URL.revokeObjectURL(imagePreviews[idx])
    })
    const newPreviews = merged.map((f) => {
      const existingIdx = selectedFiles.indexOf(f)
      return existingIdx !== -1 ? imagePreviews[existingIdx] : URL.createObjectURL(f)
    })
    setSelectedFiles(merged)
    setImagePreviews(newPreviews)
  }

  function removePhoto(i: number) {
    URL.revokeObjectURL(imagePreviews[i])
    const updatedFiles = selectedFiles.filter((_, idx) => idx !== i)
    setSelectedFiles(updatedFiles)
    setImagePreviews(updatedFiles.map((f) => URL.createObjectURL(f)))
  }

  return (
    <div className="space-y-4">
      <div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-sans font-medium text-sm px-4 py-2.5 rounded-md transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {selectedFiles.length === 0
            ? 'Choose Photos'
            : `${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''} selected — tap to add more`}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={handleChange}
        />
        <p className="font-sans text-xs text-neutral-500 mt-1">
          Select up to 3 photos — useful when a recipe spans multiple pages.
          Tap &apos;Choose Photos&apos; again to add more from your library or camera.
          Images will each be compressed to ~400KB before uploading.
        </p>
      </div>
      {imagePreviews.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {imagePreviews.map((url, i) => (
            <div key={i} className="relative">
              <Image
                src={url}
                alt={`Photo ${i + 1}`}
                width={80}
                height={100}
                unoptimized
                className="rounded object-cover border border-neutral-200"
              />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                className="absolute -top-1 -right-1 bg-white border border-neutral-300 rounded-full w-5 h-5 text-xs leading-none flex items-center justify-center hover:bg-neutral-100"
                onClick={() => removePhoto(i)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => onExtract(selectedFiles)}
        disabled={extracting || selectedFiles.length === 0}
        className="bg-brand-500 hover:bg-brand-600 text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-md transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {extracting
          ? `Extracting from ${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''}…`
          : 'Extract Recipe'}
      </button>
    </div>
  )
}
