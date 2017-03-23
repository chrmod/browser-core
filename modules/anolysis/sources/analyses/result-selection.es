export default class {
  constructor() {
    this.name = 'result_selection';
  }

  generateSignals(aggregation) {
    const signals = [];

    Object.keys(aggregation).forEach((key) => {
      if (key.startsWith('result_selection')) {
        signals.push(aggregation[key]);
      }
    });

    return signals;
  }
}
