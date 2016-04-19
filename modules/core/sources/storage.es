import { notImplemented } from "core/platform";
import * as storage from "platform/storage";

export let setItem = storage.setItem.bind(localStorage) || notImplemented;
export let getItem = storage.getItem.bind(localStorage) || notImplemented;
export let removeItem = storage.removeItem.bind(localStorage) || notImplemented;
export let clear = storage.clear.bind(localStorage) || notImplemented;
export let setObject = storage.setObject || notImplemented;
export let getObject = storage.getObject || notImplemented;