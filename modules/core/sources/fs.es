import platform from "core/platform";

/**
 * read file from default location
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export let readFile = platform.import('fs', 'readFile');

/**
 * write to file from default location
 *
 * @param {string|Array} path
 * @param {data} data - in a format accepted by the platform
 * @returns {Promise}
 */
export let writeFile = platform.import('fs', 'writeFile');

/**
 * create directory in default location
 *
 * @param {string|Array} path
 * @returns {Promise}
 */
export let mkdir = platform.import('fs', 'mkdir');
