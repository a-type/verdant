const {
  setTimeout: safeSetTimeout,
  setInterval: safeSetInterval,
  clearInterval: safeClearInterval,
  clearTimeout: safeClearTimeout
} = globalThis;
function withSafeTimers(fn) {
  const currentSetTimeout = globalThis.setTimeout;
  const currentSetInterval = globalThis.setInterval;
  const currentClearInterval = globalThis.clearInterval;
  const currentClearTimeout = globalThis.clearTimeout;
  try {
    globalThis.setTimeout = safeSetTimeout;
    globalThis.setInterval = safeSetInterval;
    globalThis.clearInterval = safeClearInterval;
    globalThis.clearTimeout = safeClearTimeout;
    const result = fn();
    return result;
  } finally {
    globalThis.setTimeout = currentSetTimeout;
    globalThis.setInterval = currentSetInterval;
    globalThis.clearInterval = currentClearInterval;
    globalThis.clearTimeout = currentClearTimeout;
  }
}

export { safeClearTimeout as a, safeSetInterval as b, safeClearInterval as c, safeSetTimeout as s, withSafeTimers as w };
