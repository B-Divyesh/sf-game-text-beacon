export type ReadItem = { id: string; text: string; source: string; at: string }

export const sampleRead: ReadItem = {
  id: 'sample-objective',
  source: 'Sample objective panel',
  text: 'Find the weathered radio tower. The north gate is locked. Look for a maintenance key near the loading bay.',
  at: 'Sample capture'
}

export function queueRead(queue: ReadItem[], item: ReadItem): ReadItem[] {
  return [...queue, item]
}

export function demoKey(key: string) {
  return `demo:game-text-beacon:${key}`
}

export function onlySameOrigin(urls: string[], origin: string) {
  return urls.every((url) => new URL(url, origin).origin === origin)
}
