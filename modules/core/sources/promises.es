

/* Because of crazy monky patching of Promises in the tests,
 * we need to implement our own `reject` and `resolve` functions
 * to be sure it always works...
 */
export function promiseReject(...args) {
  return new Promise((resolve, reject) => {
    reject(...args);
  });
}


export function promiseResolve(...args) {
  return new Promise((resolve, reject) => {
    resolve(...args);
  });
}
