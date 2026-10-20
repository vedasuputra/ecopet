// Meilu as a layered SVG. Every part of her drawing is its own transparent PNG (public/meilu/*.png), all cut from the
// same 1024x768 canvas, so each <image> keeps its original position (x, y, width, height are canvas coordinates).
// Parts that move on their own are grouped (<g className="mp-...">) and animated with CSS (see MeiluAvatar).
export const SPRITE_VIEW = { x: 138, y: 126, w: 360, h: 292 }

export const SPRITE_PARTS = ['tail-a', 'tail-b', 'wing-left', 'wing-shadow', 'body', 'wing-right', 'head', 'beak', 'eyes']

// She is nine separate pictures, so she can appear in pieces. This loads them all once (the browser keeps them) and says when
// every part is there, so the screen can show a spinner until she can be drawn whole.
let loaded: Promise<void> | null = null
export function loadSprite(): Promise<void> {
  loaded ??= Promise.all(
    SPRITE_PARTS.map(
      (n) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = img.onerror = () => resolve() // a part that fails must not keep the spinner forever
          img.src = `/meilu/${n}.png`
        }),
    ),
  ).then(() => undefined)
  return loaded
}

const part = (name: string, x: number, y: number, w: number, h: number) => <image href={`/meilu/${name}.png`} x={x} y={y} width={w} height={h} />

export default function MeiluSprite({ className, width }: { className?: string; width?: number | string }) {
  const { x, y, w, h } = SPRITE_VIEW
  return (
    <svg
      className={className}
      viewBox={`${x} ${y} ${w} ${h}`}
      width={width}
      role="img"
      aria-label="Meilu"
      style={{ display: 'block', width: width === undefined ? '100%' : undefined, height: 'auto', overflow: 'visible' }}
    >
      {/* back to front. The left wing and the shadow of the right wing are "inner" parts: the body covers them, so only
          a sliver of the left wing shows until an animation moves them out. */}
      <g className="mp-tail">
        {part('tail-a', 366, 338, 126, 72)}
        {part('tail-b', 378, 331, 95, 44)}
      </g>
      <g className="mp-wing-left">{part('wing-left', 144, 232, 107, 145)}</g>
      <g className="mp-wing-right">{part('wing-shadow', 296, 235, 86, 125)}</g>
      <g className="mp-body">{part('body', 156, 220, 230, 192)}</g>
      <g className="mp-wing-right">{part('wing-right', 320, 223, 81, 123)}</g>
      <g className="mp-head">
        {part('head', 175, 132, 185, 143)}
        {part('beak', 233, 215, 30, 21)}
        <g className="mp-eyes">{part('eyes', 204, 203, 96, 26)}</g>
      </g>
    </svg>
  )
}
