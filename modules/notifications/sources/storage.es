import Storage from '../core/storage';

export default class {
  constructor() {
    this.storage = new Storage('chrome://cliqz/content/notifications');
  }

  watchedDomainNames() {
    return this.storage.getObject('watchedDomains', ['gmail.com']);
  }

  updateDomain(domain, data) {
    const key = `watchedDomains.${domain}`;
    const domainData = this.storage.getObject(key, {});
    const update = Object.assign(
      domainData,
      data
    );
    this.storage.setObject(key, update);
  }

  counts() {
    return this.watchedDomainNames().reduce((counts, domain) => {
      const key = `watchedDomains.${domain}`;
      const domainData = this.storage.getObject(key, { count: 0 });
      return Object.assign({}, counts, {
        [domain]: domainData.count,
      });
    }, Object.create(null));
  }
}
