import { notImplemented } from "core/platform";
import storage from "platform/storage";

export default class {
	constructor() {
		this.storage = storage;
		this.getItem = this.storage.getItem.bind(this.storage);
		this.setItem = this.storage.setItem.bind(this.storage);
		this.removeItem = this.storage.removeItem.bind(this.storage);
		this.clear = this.storage.clear.bind(this.storage);
	}

	setObject(key, object) {
		this.storage.setItem(key, JSON.stringify(object));
	}

	getObject(key) {
	  const o = storage.getItem(key);
	  return o && JSON.parse(o);
	}

	getList(key) {
		var list = storage.getItem(key);
		list = list ? JSON.parse(list) : [];
		return list;
	}
}