import utils from '../../core/utils';

export default class {

  constructor({ domain, selector, attribute }) {
    this.domain = domain;
    this.selector = selector;
    this.attribute = attribute;
  }

  count() {
    const url = 'https://twitter.com';
    return utils.callAction('core', 'queryHTML', [
      url, this.selector, this.attribute
    ]).then(() => {
      return 5;
    });
  }

}
