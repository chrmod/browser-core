import background from '../core/base/background';
import Gmail from './providers/gmail';
import { Cron } from '../core/anacron';

const CONFIG = {
  'watched-domains': ['gmail.com'],
};

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

class Storage {
  constructor() {
    const watchedDomains = ['gmail.com'];
    this.watchedDomains = watchedDomains.reduce((domains, domain) => {
      domains[domain] = Object.create(null);
      return domains;
    }, Object.create(null));
  }

  watchedDomainNames() {
    return Object.keys(this.watchedDomains);
  }

  updateDomain(domain, data) {
    this.watchedDomains[domain] = Object.assign(
      this.watchedDomains[domain],
      data
    );
  }

  counts() {
    return this.watchedDomainNames().reduce((counts, domain) => {
      counts[domain] = this.watchedDomains[domain].count;
      return counts;
    }, Object.create(null));
  }
}

export default background({

  init() {
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

    this.cron.run(new Date(), { force: true });

    this.cron.start();
  },

  unload() {
    this.cron.stop();
  },

  beforeBrowserShutdown() {

  },

  actions: {
    /**
    * get configuration with notification sources
    **/
    getConfig() {
      return {
        sources: this.storage.watchedDomainNames(),
      };
    },

    /**
    * query store for notifications for specified sources
    */
    getNotificationsCount() {
      return this.storage.counts();
    },

    /**
    * Add a new source to configuration
    **/
    watch(url) {

    },

    /**
    * Remove a url from notification sources
    **/
    unwatch(url) {

    },
  },
});
