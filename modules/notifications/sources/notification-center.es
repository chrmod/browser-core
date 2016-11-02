import console from '../core/console';
import { Cron } from '../core/anacron';
import Gmail from './providers/gmail';
import Storage from './storage';
import Evented from '../core/mixins/evented';

// TODO: find a way to handle aliases, example: gmail.com === mail.google.com


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

export default Evented(class {

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
            const isChanged = this.storage.updateDomain(domain, { count });

            if (isChanged) {
              // TODO: remove double update
              this.storage.updateDomain(domain, { unread: true });
              this.updateUnreadStatus();
            }
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

  notifications() {
    return this.storage.notifications();
  }

  updateUnreadStatus() {
    const hasUnread = this.storage.hasUnread();
    const eventName = hasUnread ? 'new-notification' : 'notifications-cleared';
    this.publishEvent(eventName);
  }

  clearDomainUnread(domain) {
    const isWatched = this.domainList().indexOf(domain) !== 1;
    if (!isWatched) {
      return;
    }

    const isChanged = this.storage.updateDomain(domain, { unread: false });
    if (isChanged) {
      this.updateUnreadStatus();
    }
  }

  addDomain(domain) {

  }

  removeDomain(domain) {

  }

  ignoreDomain(domain) {

  }
});
