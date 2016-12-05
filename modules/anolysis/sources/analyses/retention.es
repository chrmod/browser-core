
export default class {
  constructor() {
    // TODO: Keep track of activity
    // - day
    // - weeks
    // - month
    this.name = 'retention';
    this.needs_gid = true;
  }

  generateSignals() {
    return [{ id: this.name, data: 'Activity' }];
  }
}
