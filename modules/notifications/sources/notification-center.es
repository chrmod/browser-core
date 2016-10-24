import Gmail from './providers/gmail';
import { Cron } from '../core/anacron';
import Storage from './storage';

const AVAILABLE_DOMAINS = {
  'gmail.com': {
    providerName: 'gmail',
    config: {},
    schedule: '*/10 *',
  },
  'mail.google.com': {
    providerName: 'gmail',
    config: {},
    schedule: '*/10 *',
  },
};

const AVAILABLE_PROVIDERS = {
  'gmail': Gmail
};

export default class {

  constructor() {
    this.storage = new Storage();
    this.cron = new Cron();

    this.storage.watchedDomainNames()
      .filter(domain => domain in AVAILABLE_DOMAINS)
      .forEach(domain => {
        const { providerName, config, schedule } = AVAILABLE_DOMAINS[domain];
        const Provider = AVAILABLE_PROVIDERS[providerName];

        this.cron.schedule(() => {
          const provider = new Provider(config);
          provider.count().then(count => {
            this.storage.updateDomain(domain, { count });
          });
        }, schedule);
      });
  }

  start() {
    this.cron.run(new Date(), { force: true });
    this.cron.start();
  }

  stop() {
    this.cron.stop();
  }

  domainList() {
    return this.storage.watchedDomainNames();
  }

  counts() {
    return this.storage.counts();
  }

  addDomain(domain) {

  }

  removeDomain(domain) {

  }

  ignoreDomain(domain) {

  }
}
