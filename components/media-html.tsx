"use client"

import React from "react"
import { useMediaImageResolver } from "@/lib/use-media-image-resolver"

interface MediaHtmlProps {
  html: string
  className?: string
}

const MediaHtml = React.memo<MediaHtmlProps>(({ html, className }) => {
  const ref = useMediaImageResolver(html)

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />
})

MediaHtml.displayName = "MediaHtml"

export default MediaHtml
