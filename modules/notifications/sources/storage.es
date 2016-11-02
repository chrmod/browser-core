import Storage from '../core/storage';
import equal from './lib/deep-equal';

export default class {
  constructor() {
    this.storage = new Storage('chrome://cliqz/content/notifications');
  }

  watchedDomainNames() {
    return this.storage.getObject('watchedDomains', ['mail.google.com']);
  }

  /*
   * returns true if storage was changed
   * returns false if object in storage is the same as "data"
   */
  updateDomain(domain, data) {
    const key = `watchedDomains.${domain}`;
    const domainData = this.storage.getObject(key, {});
    const update = Object.assign(
      {},
      domainData,
      data
    );
    const isChanged = !equal(domainData, update);

    if (isChanged) {
      this.storage.setObject(key, update);
    }

    return isChanged;
  }

  notifications() {
    return this.watchedDomainNames().reduce((counts, domain) => {
      const key = `watchedDomains.${domain}`;
      const domainData = this.storage.getObject(key, {
        count: 0,
        unread: false
      });
      return Object.assign({}, counts, {
        [domain]: {
          count: domainData.count,
          unread: domainData.unread,
        }
      });
    }, Object.create(null));
  }

  hasUnread() {
    return this.watchedDomainNames().some(domain => {
      const key = `watchedDomains.${domain}`;
      const { unread } = this.storage.getObject(key, { unread: false });
      return unread;
    });
  }
}
