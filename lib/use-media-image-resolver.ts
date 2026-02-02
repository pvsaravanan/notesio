"use client"

import { useEffect, useRef } from "react"
import { getMedia } from "./media-store"

const objectUrlCache = new Map<string, string>()

export function useMediaImageResolver(html: string) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    const resolveImages = async () => {
      const root = containerRef.current
      if (!root) return

      const imgs = Array.from(root.querySelectorAll("img"))

      await Promise.all(
        imgs.map(async (img) => {
          const src = img.getAttribute("src") || ""
          if (!src.startsWith("media:")) return

          const id = src.slice("media:".length)
          if (!id) return

          if (objectUrlCache.has(id)) {
            img.src = objectUrlCache.get(id)!
            return
          }

          try {
            const record = await getMedia(id)
            if (!record) return
            if (cancelled) return

            const url = URL.createObjectURL(record.blob)
            objectUrlCache.set(id, url)
            img.src = url
          } catch {
            // ignore
          }
        }),
      )
    }

    resolveImages()

    return () => {
      cancelled = true
    }
  }, [html])

  return containerRef
}
