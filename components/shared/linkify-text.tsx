'use client'

/**
 * LinkifyText Component
 * Detects and converts http://, https://, and www. URLs to clickable links.
 * Preserves all other text and formatting.
 */
export function LinkifyText({ text }: { text: string }) {
  if (!text) return null

  // Match URLs: http://, https://, or www.
  // Use /g to find all matches
  const matches: Array<{ text: string; url: string; index: number; endIndex: number }> = []

  // Find all URLs in text
  const urlPatterns = [
    { pattern: /(https?:\/\/[^\s]+)/g, isHttps: true },
    { pattern: /(www\.[^\s]+)/g, isWww: true }
  ]

  let allMatches: Array<{ text: string; url: string; index: number }> = []

  // Find http(s) URLs
  const httpRegex = /(https?:\/\/[^\s]+)/g
  let httpMatch: RegExpExecArray | null
  while ((httpMatch = httpRegex.exec(text)) !== null) {
    allMatches.push({
      text: httpMatch[0],
      url: httpMatch[0],
      index: httpMatch.index
    })
  }

  // Find www URLs (only if not already found as http)
  const wwwRegex = /(www\.[^\s]+)/g
  let wwwMatch: RegExpExecArray | null
  while ((wwwMatch = wwwRegex.exec(text)) !== null) {
    // Check if this overlaps with an http match
    const overlaps = allMatches.some(m =>
      wwwMatch!.index >= m.index && wwwMatch!.index < m.index + m.text.length
    )
    if (!overlaps) {
      allMatches.push({
        text: wwwMatch[0],
        url: 'https://' + wwwMatch[0],
        index: wwwMatch.index
      })
    }
  }

  // Sort by index
  allMatches.sort((a, b) => a.index - b.index)

  if (allMatches.length === 0) {
    return <span>{text}</span>
  }

  // Build the parts: text + link + text + link...
  const parts = []
  let lastIndex = 0

  for (const match of allMatches) {
    // Add text before this URL
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      })
    }

    // Add the URL link
    parts.push({
      type: 'link',
      content: match.text,
      url: match.url
    })

    lastIndex = match.index + match.text.length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    })
  }

  return (
    <>
      {parts.map((part, idx) =>
        part.type === 'link' ? (
          <a
            key={idx}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer break-all"
            onClick={(e) => e.stopPropagation()}
            title={`Open ${part.url}`}
          >
            {part.content}
          </a>
        ) : (
          <span key={idx}>{part.content}</span>
        )
      )}
    </>
  )
}
