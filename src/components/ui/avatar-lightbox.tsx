"use client"

import { useState } from "react"
import Image from "next/image"
import { X } from "lucide-react"

interface AvatarLightboxProps {
  src: string | null | undefined
  alt: string
  children: React.ReactNode
}

export function AvatarLightbox({ src, alt, children }: AvatarLightboxProps) {
  const [open, setOpen] = useState(false)

  if (!src) return <>{children}</>

  return (
    <>
      <button
        type="button"
        className="cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white z-20"
            onClick={() => setOpen(false)}
          >
            <X className="h-8 w-8" />
          </button>
          <div
            className="relative w-72 h-72 sm:w-96 sm:h-96"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={src}
              alt={alt}
              fill
              className="object-cover rounded-full"
              sizes="384px"
            />
          </div>
        </div>
      )}
    </>
  )
}
