/**
 * Serializes generate requests while the engine is busy (V66 P3).
 * Caller supplies the IPC-backed runner — no duplicate engine logic.
 */

const MAX_QUEUE_DEPTH = 8;

/** @type {{ payload: unknown, resolve: Function, reject: Function }[]} */
let queue = [];
let running = false;
/** @type {((payload: unknown) => Promise<unknown>) | null} */
let generateRunner = null;

/** @type {Map<string, Set<Function>>} */
const listeners = new Map([
  ['deferred:queued', new Set()],
  ['deferred:complete', new Set()],
]);

function emit(type, detail) {
  const set = listeners.get(type);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(detail);
    } catch {
      /* listener error ignored */
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

/**
 * @param {{ generate: (payload: unknown) => Promise<unknown> }} cfg
 */
export function configureDeferredEngine(cfg) {
  generateRunner = cfg.generate;
}

/** @param {'deferred:queued' | 'deferred:complete'} type @param {(detail: unknown) => void} cb */
export function onDeferredEvent(type, cb) {
  const set = listeners.get(type);
  if (!set) return () => undefined;
  set.add(cb);
  return () => set.delete(cb);
}

export function getQueueDepth() {
  return queue.length + (running ? 1 : 0);
}

export function cancelAll() {
  const pending = queue.splice(0, queue.length);
  for (const item of pending) {
    item.reject(new Error('CANCELLED'));
  }
  emit('deferred:complete', { cancelled: true, depth: getQueueDepth() });
}

async function drainQueue() {
  if (running || !generateRunner) return;
  const item = queue.shift();
  if (!item) return;
  running = true;
  try {
    const result = await generateRunner(item.payload);
    item.resolve(result);
    emit('deferred:complete', { ok: true, depth: getQueueDepth() });
  } catch (err) {
    item.reject(err);
    emit('deferred:complete', { ok: false, error: err, depth: getQueueDepth() });
  } finally {
    running = false;
    if (queue.length > 0) {
      void drainQueue();
    }
  }
}

/**
 * @param {unknown} payload
 * @returns {Promise<unknown>}
 */
export function enqueue(payload) {
  if (!generateRunner) {
    return Promise.reject(new Error('DEFERRED_NOT_CONFIGURED'));
  }
  if (queue.length >= MAX_QUEUE_DEPTH) {
    return Promise.reject(new Error('QUEUE_FULL'));
  }
  return new Promise((resolve, reject) => {
    queue.push({ payload, resolve, reject });
    emit('deferred:queued', { depth: getQueueDepth(), payload });
    void drainQueue();
  });
}
