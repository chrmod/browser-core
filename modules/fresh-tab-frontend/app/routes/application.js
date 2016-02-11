import Ember from "ember";

export default Ember.Route.extend({
  actions: {
    openModal(modalName) {
      return this.render(modalName, {
        into: "application",
        outlet: "modal"
      });
    },
    closeModal() {
      return this.disconnectOutlet({
        outlet: "modal",
        parentView: "application"
      });
    }
  }
});
