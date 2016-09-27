import storage from "platform/storage";

console.log("test")
/**
* @namespace core
*/
export default {
  getItem: storage.getItem.bind(storage),
  setItem: storage.setItem.bind(storage),
  removeItem: storage.removeItem.bind(storage),
  clear: storage.clear.bind(storage),

  /**
  * @method setObject
  * @param key {string}
  * @param object
  */
	setObject(key, object) {
		storage.setItem(key, JSON.stringify(object));
	},

  /**
  * @method getObject
  * @param key {string}
  * @param notFound {Boolean}
  */
	getObject(key, notFound = false) {
	  const o = storage.getItem(key);
	  if (o) {
	  	return JSON.parse(o);
	  }
	  return notFound;
	}
}
