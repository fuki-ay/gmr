// 4-char alphanumeric codes — no 0/O/1/I to avoid confusion when read aloud
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return code
}

export function getPointsForDistance(distance: number): number {
  return Math.max(0, 5 - distance)
}

export function getScoreLabel(score: number): string {
  if (score < 1.5) return 'You barely know this person.'
  if (score < 2.5) return 'You know them a little.'
  if (score < 3.5) return 'You know them moderately.'
  if (score < 4.5) return 'You know them well.'
  return 'You know them very well.'
}

const REACTIONS: Record<number, string[]> = {
  0: ['Spot on! 🎯', 'Mind reader! 🧠', 'Perfect!', 'Nailed it! ✨'],
  1: ['So close! 👏', 'Almost perfect!', 'Nearly there! 🔥', 'Great guess!'],
  2: ['Pretty close!', 'Not bad!', 'Getting warmer…', 'Decent guess!'],
  3: ['A bit off…', 'Missed by a bit.', 'Room to grow!', 'Not quite.'],
  4: ['Way off! 😮', 'Surprised?', "Didn't see that coming!", 'Plot twist! 😂'],
}

export function getReactionCopy(distance: number): string {
  const bucket = REACTIONS[Math.min(distance, 4)]
  return bucket[Math.floor(Math.random() * bucket.length)]
}
