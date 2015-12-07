window.SCRIPTS["index"] = {
  LOCK_IMG: "images/Badges/lock_6.svg",

  model: function () {
    var self = this,
      cliqzLoyalData = CliqzLoyalty.getAllStatCurrentTerm(),
      cliqzBeData = CliqzLoyalty.getBadgesInfo(),
      awardCodes = CliqzLoyalty.getBadgeCode();

    cliqzLoyalData.membership.awards.awardList = awardCodes.map(function (code) {
      var item = cliqzBeData[code],
        st = cliqzLoyalData.membership.awards.awardList[code];
      return{
        img: st ? item.img : self.LOCK_IMG,
        name: item.name,
        des: item.des[st ? 0 : 1] || "_",
        st: st
      };
    });

    return Promise.resolve(cliqzLoyalData);
  },

  ready: function (modelData) {
  }
};