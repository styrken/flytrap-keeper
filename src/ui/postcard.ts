/**
 * Wrap a raw canvas screenshot in a warm paper postcard frame: even border,
 * a wide foot with the plant's name on the left and the game's name on the
 * right. Pure DOM-canvas work — no Three.js involved.
 */
export async function composePostcard(
  raw: string,
  caption: string,
  stamp: string,
): Promise<string> {
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('screenshot failed to load'))
    img.src = raw
  })

  const unit = Math.max(img.width, img.height)
  const border = Math.round(unit * 0.03)
  const foot = Math.round(unit * 0.085)
  const canvas = document.createElement('canvas')
  canvas.width = img.width + border * 2
  canvas.height = img.height + border + foot
  const ctx = canvas.getContext('2d')
  if (!ctx) return raw

  ctx.fillStyle = '#f6f1e6'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, border, border)

  const base = img.height + border
  const nameSize = Math.round(foot * 0.42)
  ctx.fillStyle = '#3c2f24'
  ctx.font = `600 ${nameSize}px system-ui, -apple-system, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.fillText(caption, border, base + foot / 2, canvas.width * 0.6)

  ctx.fillStyle = '#8a7a67'
  ctx.font = `${Math.round(nameSize * 0.72)}px system-ui, -apple-system, sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText(`${stamp} · Flytrap Keeper 🪴`, canvas.width - border, base + foot / 2)

  return canvas.toDataURL('image/png')
}
