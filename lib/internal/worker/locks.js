'use strict';

const locks = internalBinding('locks');
const DOMException = require('internal/domexception');

const kMode = Symbol('mode');
const kName = Symbol('kName');

// https://wicg.github.io/web-locks/#api-lock
class Lock {
  constructor() {
    // eslint-disable-next-line no-restricted-syntax
    throw new TypeError('Illegal constructor');
  }

  get name() {
    return this[kName];
  }

  get mode() {
    return this[kMode];
  }
}

Object.defineProperties(Lock.prototype, {
  name: { enumerable: true },
  mode: { enumerable: true },
  [Symbol.toStringTag]: {
    value: 'Lock',
    writable: false,
    enumerable: false,
    configurable: true,
  },
});

// https://wicg.github.io/web-locks/#api-lock-manager
class LockManager {
  constructor() {
    // eslint-disable-next-line no-restricted-syntax
    throw new TypeError('Illegal constructor');
  }

  // https://wicg.github.io/web-locks/#api-lock-manager-request
  request(name, options, callback) {
    if (callback === undefined) {
      callback = options;
      options = undefined;
    }

    // Let promise be a new promise.
    let reject;
    let resolve;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    // If options was not passed, then let options be a new LockOptions
    // dictionary with default members.
    if (options === undefined) {
      options = {
        mode: 'exclusive',
        ifAvailable: false,
        steal: false,
      };
    }

    if (name.startsWith('-')) {
      // If name starts with U+002D HYPHEN-MINUS (-), then reject promise with a
      // "NotSupportedError" DOMException.
      reject(new DOMException('NotSupportedError'));
    } else if (options.ifAvailable === true && options.steal === true) {
      // Otherwise, if both options' steal dictionary member and option's
      // ifAvailable dictionary member are true, then reject promise with a
      // "NotSupportedError" DOMException.
      reject(new DOMException('NotSupportedError'));
    } else if (options.steal === true && options.mode !== 'exclusive') {
      // Otherwise, if options' steal dictionary member is true and option's
      // mode dictionary member is not "exclusive", then reject promise with a
      // "NotSupportedError" DOMException.
      reject(new DOMException('NotSupportedError'));
    } else {
      // Otherwise, run these steps:

      // Let request be the result of running the steps to request a lock with
      // promise, the current agent, environment's id, origin, callback, name,
      // options' mode dictionary member, options' ifAvailable dictionary
      // member, and option's steal dictionary member.
      queueMicrotask(() => {
        locks.request(
          promise,
          (name, mode, waitingPromise, release) => {
            const lock = Object.create(Lock.prototype, {
              [kName]: {
                value: name,
                writable: false,
                enumerable: false,
                configurable: false,
              },
              [kMode]: {
                value: mode === 0 ? 'shared' : 'exclusive',
                writable: false,
                enumerable: false,
                configurable: false,
              },
            });

            // When lock lock's waiting promise settles (fulfills or rejects),
            // enqueue the following steps on the lock task queue:
            waitingPromise
              .finally(() => undefined)
              .then(() => {
                // Release the lock lock.
                release();

                // Resolve lock's released promise with lock's waiting promise.
                resolve(waitingPromise);
              });

            return callback(lock);
          },
          name,
          options.mode === 'shared' ? 0 : 1,
          options.ifAvailable || false,
          options.steal || false);
      });
    }

    // Return promise.
    return promise;
  }

  // https://wicg.github.io/web-locks/#api-lock-manager-query
  query() {
    return new Promise((resolve) => {
      queueMicrotask(() => {
        const snapshot = locks.snapshot();
        resolve(snapshot);
      });
    });
  }
}

Object.defineProperties(LockManager.prototype, {
  request: { enumerable: true },
  query: { enumerable: true },
  [Symbol.toStringTag]: {
    value: 'LockManager',
    writable: false,
    enumerable: false,
    configurable: true,
  },
});

module.exports = {
  LockManager,
};
