import utils from '../core/utils';

export default class {
  constructor(settings) {
  }

  init() {
    utils.callAction('notifications', 'updateUnreadStatus');
  }

  unload() {

  }
}
