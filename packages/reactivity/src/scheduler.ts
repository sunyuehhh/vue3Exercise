let preFlushCbs: Function[] = []

export function queuePreFlushCb(cb: Function) {
  if (!preFlushCbs.includes(cb)) {
    preFlushCbs.push(cb)
  }
}

export function flushPreFlushCbs() {
  for (const cb of preFlushCbs) {
    cb()
  }
  preFlushCbs.length = 0
}
