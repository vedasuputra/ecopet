import { Fragment, type ReactNode } from 'react'

// Meilu writes a little markdown (**bold**, *italic*, `code`, lists, headings). It is shown as styled text, never as raw
// asterisks. Only these few marks are understood and everything is built as React elements (no HTML is ever inserted).
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>
    return <Fragment key={i}>{part}</Fragment>
  })
}

export default function ChatText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/)
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split('\n')
        const bullet = (l: string) => /^\s*[-*•]\s+/.test(l)
        const numbered = (l: string) => /^\s*\d+[.)]\s+/.test(l)
        if (lines.every(bullet) || lines.every(numbered)) {
          const Tag = lines.every(bullet) ? 'ul' : 'ol'
          return (
            <Tag key={bi} className="chat-md-list">
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ''))}</li>
              ))}
            </Tag>
          )
        }
        const heading = lines.length === 1 && /^#{1,4}\s+/.test(lines[0])
        return (
          <p key={bi} className={heading ? 'chat-md-head' : undefined}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(heading ? l.replace(/^#{1,4}\s+/, '') : l)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </>
  )
}
