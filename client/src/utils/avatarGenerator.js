
export function generateUniqueAvatar(name, uniqueId) {

  const getInitials = (fullName) => {
    if (!fullName || !fullName.trim()) return 'U'
    const words = fullName.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return 'U'
    if (words.length === 1) return words[0][0].toUpperCase()
    return (words[0][0] + words[words.length - 1][0]).toUpperCase().slice(0, 2)
  }

  const initials = getInitials(name)

  // Ensure uniqueId is a string before calling split
  const uniqueIdStr = String(uniqueId || '')
  const hash = uniqueIdStr.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0)

const hue = Math.abs(hash) % 360
  const saturation = 60 + (Math.abs(hash) % 20)
  const lightness = 45 + (Math.abs(hash) % 15)

  const bgColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`

const textColor = lightness < 50 ? '#FFFFFF' : '#1F2937'

const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 200
  const ctx = canvas.getContext('2d')

ctx.fillStyle = bgColor
  ctx.beginPath()
  ctx.arc(100, 100, 100, 0, 2 * Math.PI)
  ctx.fill()

ctx.fillStyle = textColor
  ctx.font = 'bold 80px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials, 100, 100)

return canvas.toDataURL('image/png')
}

export function getDefaultAvatar(name, uid) {
  return generateUniqueAvatar(name, uid)
}

