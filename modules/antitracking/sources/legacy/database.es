import console from '../../core/console';
import { deletePersistantObject, LazyPersistentObject } from '../persistent-state';

/**
 * Remove any old database entries which are no longer needed
 */
export default function () {
  deletePersistantObject('requestKeyValue');
  deletePersistantObject('checkedToken');
  deletePersistantObject('blockedToken');
  deletePersistantObject('loadedPage');
  deletePersistantObject('tokens');
}

export function migrateTokenDomain(tokenDomain) {
  const dbName = 'tokenDomain';
  const oldTokenDomain = new LazyPersistentObject(dbName);
  return oldTokenDomain.load().then((tokens) => {
    // tokens format:
    // {token: {firstparty: date}}
    const tokenArrayTuples = Object.keys(tokens).map(token => (
      // get array of (token, firstParty, day) tuples for this tuple
      Object.keys(tokens[token]).map(firstParty => [token, firstParty, tokens[token][firstParty]])
    ));
    // flatten array of arrays of tuples into array of tuples
    const tokenTuples = [].concat(...tokenArrayTuples);
    console.log('migrate', tokenTuples.length, 'tokenDomain tuples');
    // insert all the tuples into the new token db
    return Promise.all(
      tokenTuples.map(tup => tokenDomain.addTokenOnFirstParty(...tup))).then(() => {
        deletePersistantObject(dbName);
      }
    );
  });
}
