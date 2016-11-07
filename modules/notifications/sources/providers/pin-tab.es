import utils from '../../core/utils';
import { mapWindows } from '../../core/browser';
import { queryActiveTabs as getTabs } from '../../core/tabs';

const domainForUrl = url => utils.getDetailsFromUrl(url).host;
const isUrlBelongToDomain = (domain, url) => domainForUrl(url) === domain;
const getWindows = mapWindows.bind(null, w => w);
const activeUrlsForDomain = domain => getWindows().map(
  window => getTabs(window)
    .map(tab => tab.url)
    .filter(url => isUrlBelongToDomain(domain, url))
).reduce((set, urls) => new Set([...set, ...urls]), new Set());

export default class {

  constructor({ domain, selector, attribute }) {
    this.domain = domain;
    this.selector = selector;
    this.attribute = attribute;
  }

  count() {
    const urls = [...activeUrlsForDomain(this.domain)];
    const countForUrl = url => utils
      .callAction('core', 'queryHTML', [url, this.selector, this.attribute])
      .then(results => results.find(result => result));

    return Promise.all(
      urls.map(countForUrl)
    ).then(results => results.find(result => result))
  }

}
