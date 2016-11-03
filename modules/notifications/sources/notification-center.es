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
  'twitter.com': {
    providerName: 'twitter',
    config: {},
    schedule: '*/1 *',
  },
};

const AVAILABLE_PROVIDERS = {
  'gmail': Gmail,
  'twitter': Gmail,
};

export default Evented(class {

  constructor() {
    this.storage = new Storage();
    this.cron = new Cron();
    this.tasks = new Map();

    this.domainList()
      .filter(domain => domain in AVAILABLE_DOMAINS)
      .forEach(this.createSchedule.bind(this));
  }

  start() {
    this.cron.run(new Date(), { force: true });
    this.cron.start();
  }

  stop() {
    this.cron.stop();
    this.tasks.clear();
  }

  domainList() {
    return this.storage.watchedDomainNames();
  }

  notifications(domains = []) {
    const allWatchedDomains = new Set(this.domainList());
    const allAvailabledDomains = new Set(Object.keys(AVAILABLE_DOMAINS));
    const watchedDomains = domains.filter(
      domain => allWatchedDomains.has(domain)
    );
    const availableDomains = domains.filter(
      domain => allAvailabledDomains.has(domain) &&
        !allWatchedDomains.has(domain)
    );
    const notifications = this.storage.notifications(watchedDomains);
    const availableNotifications = availableDomains.reduce((hash, domain) => {
      return Object.assign({}, hash, {
        [domain]: {
          status: 'available',
        },
      });
    }, Object.create(null));
    return Object.assign({}, notifications, availableNotifications);
  }

  updateDomain(domain) {
    const { providerName, config } = AVAILABLE_DOMAINS[domain];
    const Provider = AVAILABLE_PROVIDERS[providerName];
    const provider = new Provider(config);

    console.log('Notification', `get notifications for ${domain}`);

    return provider.count().then(count => {
      console.log('Notification', `notifications for ${domain} - count ${count}`);
      const isChanged = this.storage.updateDomain(domain, { count });

      if (isChanged) {
        // TODO: remove double update
        this.storage.updateDomain(domain, { unread: true });
        this.updateUnreadStatus();
      }
    });
  }

  createSchedule(domain) {
    const { schedule } = AVAILABLE_DOMAINS[domain];
    const task = this.cron.schedule(
      this.updateDomain.bind(this, domain),
      schedule
    );
    this.tasks.set(domain, task);
  }

  updateUnreadStatus() {
    const hasUnread = this.storage.hasUnread();
    const eventName = hasUnread ? 'new-notification' : 'notifications-cleared';
    this.publishEvent(eventName);
  }

  clearDomainUnread(domain) {
    const isWatched = this.domainList().indexOf(domain) !== -1;
    if (!isWatched) {
      return;
    }

    const isChanged = this.storage.updateDomain(domain, { unread: false });
    if (isChanged) {
      this.updateUnreadStatus();
    }
  }

  addDomain(domain) {
    this.storage.addWatchedDomain(domain);
    return this.updateDomain(domain).then(() => {
      this.createSchedule(domain);
    });
  }

  removeDomain(domain) {
    const task = this.tasks.get(domain);
    this.cron.unschedule(task);
    this.tasks.delete(task);
    this.clearDomainUnread(domain);
    this.storage.removeWatchedDomain(domain);
  }
});
