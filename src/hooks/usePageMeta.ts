import { useEffect } from 'react'

interface MetaOptions {
  title?: string
  description?: string
  image?: string
  url?: string
}

function updateMeta(nameOrProperty: string, content: string, attr: 'property' | 'name' = 'property') {
  let el = document.querySelector(`meta[${attr}="${nameOrProperty}"]`) as HTMLMetaElement | null
  if (!el && attr === 'property') {
    el = document.querySelector(`meta[name="${nameOrProperty}"]`) as HTMLMetaElement | null
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, nameOrProperty)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function usePageMeta({ title, description, image, url }: MetaOptions) {
  useEffect(() => {
    if (title) {
      const fullTitle = title.includes('ConectaComuna') ? title : `${title} | ConectaComuna`
      document.title = fullTitle
      updateMeta('og:title', fullTitle)
      updateMeta('twitter:title', fullTitle)
    }

    if (description) {
      updateMeta('description', description, 'name')
      updateMeta('og:description', description)
      updateMeta('twitter:description', description)
    }

    if (image) {
      updateMeta('og:image', image)
      updateMeta('twitter:image', image)
    }

    if (url) {
      updateMeta('og:url', url)
    }
  }, [title, description, image, url])
}
