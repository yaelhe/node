'use strict';
const common = require('../common');
const assert = require('assert');
const { locks, Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  const sab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
  const arrtemp = new Int32Array(sab);
  arrtemp[0] = 0;

  const numOfWorkerThreads = 8;

  Array(numOfWorkerThreads).fill(null).map(() => {
    const w = new Worker(__filename);
    setImmediate(() => {
      w.postMessage(sab);
    });
    return w;
  });

  process.on('exit', () => {
    const arr = new Int32Array(sab);
    assert.strictEqual(arr[0], numOfWorkerThreads);
  });

} else {
  parentPort.once('message', (sab) => {
    locks.request('my_resource', common.mustCall((lock) => {
      assert.strictEqual(lock.name, 'my_resource');
      assert.strictEqual(lock.mode, 'exclusive');
      const arr = new Int32Array(sab);
      const value = arr[0];
      arr[0] = value + 1;
    }));
  });
}
