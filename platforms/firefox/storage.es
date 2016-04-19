/* global CLIQZEnvironment */
var localStorage = CLIQZEnvironment.getLocalStorage();

export let setItem = localStorage.setItem;
export let getItem = localStorage.getItem;
export let removeItem = localStorage.removeItem;
export let clear = localStorage.clear;
export function setObject(key, object) {
	localStorage.setItem(key, JSON.stringify(object));
}
export function getObject(key) {
  let o = localStorage.getItem(key);
  return o && JSON.parse(o);
}