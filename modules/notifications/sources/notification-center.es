import console from '../core/console';
import { Cron } from '../core/anacron';
import Gmail from './providers/gmail';
import Storage from './storage';

const AVAILABLE_DOMAINS = {
  'gmail.com': {
    providerName: 'gmail',
    config: {},
    schedule: '*/1 *',
  },
  'mail.google.com': {
    providerName: 'gmail',
    config: {},
    schedule: '*/1 *',
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
          console.log('Notification', `get notifications for ${domain}`);
          const provider = new Provider(config);
          provider.count().then(count => {
            console.log('Notification', `notifications for ${domain} - count ${count}`);
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
