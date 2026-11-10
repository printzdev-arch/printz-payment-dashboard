/**
 * Browser shim for Node.js "stream" module required by client-side excel libraries (e.g. xlsx-js-style)
 */
export class Readable {
  constructor() {}
  pipe() { return this; }
  on() { return this; }
}
export class Writable {
  constructor() {}
  write() {}
  end() {}
  on() { return this; }
}
export class Transform extends Readable {}
export class PassThrough extends Transform {}
export class Stream extends Readable {}

export default {
  Readable,
  Writable,
  Transform,
  PassThrough,
  Stream,
};

