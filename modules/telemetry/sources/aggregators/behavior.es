import Aggregator from 'telemetry/aggregators/base';
import Stats from 'telemetry/simple-statistics';

export default class extends Aggregator {
  // TODO: rename 'records' to 'data'?
  // TODO: include telemetry signal version?
  aggregate(records) {
    const aggregation = {
      // TODO: keep DRY (same logic as in retention)
      empty: Object.keys(records).length === 0 ||
           !Object.keys(records).some(key => records[key].length),
      types: { },
    };

    Object.keys(records).forEach((type) => {
      // TODO: combine getting keys and series (for efficiency)
      const keys = this.getAllKeys(records[type], { blacklist: this.keyBlacklist });

      aggregation.types[type] = { count: records[type].length, keys: { } };
      keys.forEach((key) => {
        const series = this.getValuesForKey(records[type], key);
        if (this.isIntervalSeries(series)) {
          aggregation.types[type].keys[key] = this.describeIntervalSeries(series);
        } else {
          aggregation.types[type].keys[key] = this.describeCategoricalSeries(series);
        }
      });
    });

    return aggregation;
  }

  getValuesForKey(objects, key) {
    return objects.filter(o => key in o).map(o => o[key]);
  }

  isIntervalSeries(series) {
    return series.every(e => e === null || typeof e === 'number');
  }

  countOccurences(array) {
    const counts = Object.create(null);
    array.forEach((value) => {
      if (!(value in counts)) {
        counts[value] = 0;
      }
      counts[value]++;
    });
    return counts;
  }

  describeCategoricalSeries(series) {
    return Object.assign(Object.create(null), {
      count: series.length,
      categories: this.countOccurences(series),
    });
  }

  // TODO: add histogram
  describeIntervalSeries(series) {
    const numbers = [];
    const nulls = [];

    series.forEach((value) => {
      if (typeof value === 'number') {
        numbers.push(value);
      } else if (value === null) {
        nulls.push(value);
      }
    });

    return Object.assign(Object.create(null), {
      numbers: {
        count: numbers.length,
        mean: Stats.mean(numbers),
        median: Stats.median(numbers),
        stdev: Stats.standardDeviation(numbers),
        min: Stats.min(numbers),
        max: Stats.max(numbers),
      },
      nulls: {
        count: nulls.length,
      },
    });
  }
}
