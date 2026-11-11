import { Buffer } from "buffer";
globalThis.Buffer = globalThis.Buffer || Buffer;
globalThis.global = globalThis;
globalThis.process = globalThis.process || { env: {}, browser: true, version: "", versions: {}, nextTick: (f, ...a) => queueMicrotask(() => f(...a)) };
export default {};
export const Socket = class {};
export const inspect = Object.assign(() => "", { custom: Symbol.for("nodejs.util.inspect.custom") });
export const promisify = (f) => f;
