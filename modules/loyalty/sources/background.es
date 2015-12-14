import CliqzLoyalty from 'loyalty/main';

export default {

  init() {
    CliqzLoyalty.onExtensionStart();
  },

  unload() {
    CliqzLoyalty.unload();
  }
};
