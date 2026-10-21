/** Normalize common avatar URL formats so <img> can load them. */
export function resolveAvatarUrl(raw: string | null | undefined): string {
  const url = String(raw ?? '').trim()
  if (!url) return ''

  // Google Drive share links → direct view URL
  const driveFile = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i)
  if (driveFile?.[1]) {
    return `https://lh3.googleusercontent.com/d/${driveFile[1]}=w400`
  }
  const driveId = url.match(/[?&]id=([^&]+)/i)
  if (/drive\.google\.com/i.test(url) && driveId?.[1]) {
    return `https://lh3.googleusercontent.com/d/${driveId[1]}=w400`
  }

  // Dropbox share → raw
  if (/dropbox\.com/i.test(url)) {
    return url.replace(/\?dl=0/i, '?raw=1').replace(/www\.dropbox\.com/i, 'dl.dropboxusercontent.com')
  }

  return url
}
