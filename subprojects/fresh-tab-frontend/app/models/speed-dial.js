import Model from 'ember-data/model';
import attr from 'ember-data/attr';

export default Model.extend({
  type: attr(),
  url: attr(),
  displayTitle: attr(),
  title: attr(),
  logo: attr(),
  notificationCount: attr(),
  hasNewNotifications: attr(),
  custom: attr(),
  searchAlias: attr(),
});
