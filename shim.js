import { Buffer } from "buffer";
globalThis.Buffer = globalThis.Buffer || Buffer;
globalThis.global = globalThis;
globalThis.process = globalThis.process || { env: {}, browser: true, version: "", versions: {}, nextTick: (f, ...a) => queueMicrotask(() => f(...a)) };
const base = { type: () => "iOS", release: () => "1.0", platform: () => "browser", arch: () => "arm64", hostname: () => "iphone", homedir: () => "/", tmpdir: () => "/tmp", EOL: "\n" };
export default new Proxy(base, { get: (t, k) => (k in t ? t[k] : typeof k === "string" && k !== "then" ? () => "" : undefined) });
export const Socket = class {};
export const inspect = Object.assign(() => "", { custom: Symbol.for("nodejs.util.inspect.custom") });
export const promisify = (f) => f;
