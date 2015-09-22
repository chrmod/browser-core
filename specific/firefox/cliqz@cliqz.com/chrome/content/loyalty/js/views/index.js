window.SCRIPTS["index"] = {
  LOCK_IMG: "images/Badges/lock_6.svg",

  model: function () {
    var self = this,
      cliqzLoyalData = CliqzLoyalty.getAllStatCurrentTerm(),
      cliqzBeData = CliqzLoyalty.getBadgesInfo(),
      badges = [],
      awardCodes = CliqzLoyalty.getBadgeCode(),
      st;

    for (var i = 0, item; i < awardCodes.length; i++) {
      item = cliqzBeData[awardCodes[i]];
      st = cliqzLoyalData.membership.awards.awardList[awardCodes[i]];
      badges.push({
        img: st ? item.img : self.LOCK_IMG,
        name: item.name,
        des: item.des[st ? 0 : 1] || "_",
        st: st
      });
    }

    cliqzLoyalData.membership.awards.awardList = badges;

    return Promise.resolve(cliqzLoyalData);
  },

  ready: function (modelData) {}
};