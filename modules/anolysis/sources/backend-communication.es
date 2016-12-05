import log from 'anolysis/logging';
import md5 from 'core/helpers/md5';
import { fetch, Request } from 'core/http';


function post(url, payload) {
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  const request = new Request(url, {
    headers,
    method: 'POST',
    body: JSON.stringify(payload) });
  return fetch(request);
}

/**
 * Takes care of the communications with the backend
 *
 */

const GID_BACKEND_URL = 'http://127.0.0.1:5001';
const TELEMETRY_BACKEND_URL = 'http://127.0.0.1:5000/collect';


/**
 * Send a new_install signal to the backend, with granular demographics.
 */
function newInstall(demographics) {
  log(`newInstall ${JSON.stringify(demographics)}`);
  return post(`${GID_BACKEND_URL}/new_install`, { id: demographics })
    .then((response) => {
      if (response.ok) {
        return Promise.resolve();
      }
      return Promise.reject();
    });
}


/**
 * Once during each month (except during the same month as the new_install),
 * sends the granular demographic factors again to the backend.
 */
function activeUserSignal(demographics) {
  log(`activeUserSignal ${JSON.stringify(demographics)}`);
  return post(`${GID_BACKEND_URL}/active_user`, { id: demographics })
    .then((response) => {
      if (response.ok) {
        return Promise.resolve();
      }
      return Promise.reject();
    });
}


/**
 * Signal a demographics update of the client to the backend.
 */
function updateGID(demographics) {
  log(`updateDemographics ${JSON.stringify(demographics)}`);
  const hash = md5(demographics);
  const prefix = hash.slice(0, 3);

  // Send a prefix of the hash to the backend
  // TODO: What is the right size?
  return post(`${GID_BACKEND_URL}/update_gid`, { hash_prefix: prefix })
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      return Promise.reject();
    })
    .then((data) => {
      log(`updateGID response ${JSON.stringify(data)}`);
      if (data.candidates) {
        const candidates = data.candidates;
        let gid = null;

        // Check if our granular demographics are in the list of candidates
        candidates.forEach((candidate) => {
          if (candidate.hash === hash) {
            gid = candidate.gid;
          }
        });

        if (gid !== null) {
          return Promise.resolve(gid);
        }
      }

      return Promise.reject();
    });
}


/**
 * Sends a behavioral signal to the backend
 */
function sendSignal(gid, signal) {
  log(`sendSignal ${gid} => ${JSON.stringify(signal)}`);
  return post(TELEMETRY_BACKEND_URL, signal);
}


export default {
  newInstall,
  activeUserSignal,
  updateGID,
  sendSignal,
};
