export default class {
  // TODO: rename to *Storage
  constructor(behavior, demographics) {
    this.behavior = behavior;
    this.demographics = demographics;
  }

  // TODO: rename `interval` to `split`, `period`, `duration`, ...
  // for daily retention: createMessages(retention, { from: now - 30 DAYS, now },
  //    interval = 86400000 (DAY))
  // for daily behavior:  createMessages(behavior, { from: now - 1 DAY, now })
  createMessages(behaviorAggregator, demographicsAggregator, { from = null, to = null } = { }, interval = null) {
    const timespans = [];

    if (interval === null) {
      timespans.push({ from, to });
    } else {
      if (from === null || to === null) {
        throw new Error('need explicit `from` and `to` if interval is given');
      }
      if (interval <= 0) {
        throw new Error('`interval` needs to be > 0');
      }

      while (from < to) {
        timespans.push({ from, to: Math.min(from + interval, to) });
        from += interval + 1;
      }
    }

    return Promise.all([
      // use the same demographics for all messages
      this.getMessagesFromDemographics(timespans[timespans.length - 1], demographicsAggregator),
      ...timespans.map(timespan => this.getMessageFromBehavior(timespan, behaviorAggregator)),
    ])
      // create all combinations of demographics and behavior messages
      .then(([demographicsMessages, ...behaviorMessages]) =>
        this.joinMessages(demographicsMessages, behaviorMessages));
  }

  joinMessages(listA, listB) {
    const joined = [];
    listA.forEach((msgA) => {
      listB.forEach((msgB) => {
        joined.push(Object.assign({ }, msgA, msgB));
      });
    });
    return joined;
  }

  // TODO: rename, this actually returns a message stub
  getMessageFromBehavior(timespan, behaviorAggregator) {
    return this.behavior.getByTimespanAndType(timespan)
      .then(records => behaviorAggregator.aggregate(records))
      .then((aggregation) => {
        aggregation.timespan = timespan;
        return {
          behavior: aggregation,
        };
      });
  }

  // TODO: rename, this actually returns a message stub
  getMessagesFromDemographics(timespan, demographicsAggregator) {
    return this.demographics.getByTimespanAndType(timespan)
      .then(records => {
        const demographics = demographicsAggregator.aggregate(records);
        demographics._any = true;
        return Object.keys(demographics)
          .map((key) => {
            return {
              demographics: { [key]: demographics[key] },
            };
          });
      });
  }
}
