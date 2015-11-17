'use strict';

TESTS.CliqzCampaignManagerTestItegration = function (CliqzUtils) {
	describe('CliqzCampaignManager (integration)', function() {
    var response, messageCenter, campaignManager,
    core = CliqzUtils.getWindow().CLIQZ.Core,
    ui = CliqzUtils.getWindow().CLIQZ.UI,
    gBrowser = CliqzUtils.getWindow().gBrowser;

    beforeEach(function() {
      response = {
        campaigns: {
          TEST001: {
            DEBUG_remaining_clicks: 10,
            DEBUG_remaining_shows: 48,
            handlerId: 'MESSAGE_HANDLER_DROPDOWN',
            limits: {
              confirm: -1,
              discard: -1,
              ignore: -1,
              postpone: -1,
              show: -1,
              trigger: 1
            },
            message: {
              location: 'bottom',
              backgroundColor: 'FC554F',
              options: [
              {
                action: 'confirm',
                label: 'Jetzt installieren!',
                style: 'default'
              },
              {
                action: 'postpone',
                label: 'Später',
                style: 'default'
              },
              {
                action: 'discard',
                label: 'Nicht mehr anzeigen',
                style: 'gray'
              }
              ],
              text: 'Der CLIQZ-Browser ist besser als Firefox.',
              textColor: 'FFFFFF'
            },
            triggerId: 'TRIGGER_URLBAR_FOCUS'
          }
        }
      };
      messageCenter = CliqzUtils.messageCenter;
      campaignManager = CliqzUtils.campaignManager;
      campaignManager.updateCampaigns = function () { };
      campaignManager.deactivateCampaignUpdates();
      for (var c in campaignManager._campaigns) {
        campaignManager.removeCampaign(c);
      }
      campaignManager.addCampaign('TEST001', response.campaigns.TEST001);
      chai.expect(Object.keys(campaignManager._campaigns).length).to.equal(1);
    });

it('should show message', function() {
 campaignManager._campaigns.TEST001.limits.trigger = 2;

 core.urlbar.blur();
 core.urlbar.focus();
 chai.expect(campaignManager._campaigns.TEST001.counts.trigger).to.equal(1);
 core.urlbar.blur();
 core.urlbar.focus();
 chai.expect(campaignManager._campaigns.TEST001.state).to.equal('show');
 chai.expect(ui.messageCenterMessage).to.be.ok;
 fillIn('some query');
 return waitForResult().then(function() {
  chai.expect(ui.messageCenterMessage).to.be.ok;
  chai.expect(core.popup.cliqzBox.messageContainer.innerHTML).to.contain(response.campaigns.TEST001.message.text);
  return Promise.resolve();
});
});

it('should hide message', function() {
 campaignManager._campaigns.TEST001.limits.trigger = 1;
 core.urlbar.blur();
 core.urlbar.focus();
 chai.expect(campaignManager._campaigns.TEST001.state).to.equal('show');
 chai.expect(ui.messageCenterMessage).to.be.ok;
 fillIn('some query');
 campaignManager._onMessageAction('TEST001', 'postpone');
 chai.expect(ui.messageCenterMessage).not.to.exist;
 return waitForResult().then(function() {
  chai.expect(core.popup.cliqzBox.messageContainer.innerHTML).to.not.contain(response.campaigns.TEST001.message.text);
  return Promise.resolve();
});
});

context('URL tests', function () {
  var url = 'https://cliqz.com';

  afterEach(function () {
    if (gBrowser.tabs.length > 1) {
      gBrowser.removeTab(gBrowser.selectedTab);
    }
  });

  it('should open URL on confirm without limit', function(done) {
    campaignManager._campaigns.TEST001.limits.trigger = 1;
    campaignManager._campaigns.TEST001.limits.confirm = -1;
    campaignManager._campaigns.TEST001.message.options[0].url = url;


    core.urlbar.blur();
    core.urlbar.focus();
    fillIn('some query');
    waitForResult().then(function() {
      click($cliqzMessageContainer().find(".cqz-msg-btn-action-confirm")[0]);
      setTimeout(function () {
        chai.expect(CliqzUtils.getWindow().gBrowser.tabs).to.have.length(2);
                        // checks (1) for expected URL and (2) that new tab is focused
                        //remove trailing slash
                        var str = CliqzUtils.stripTrailingSlash(core.urlbar.value);
                        chai.expect(str).to.equal(url);
                        done();
                      }, 1000)
    });
  });


  it('should open URL on actions other than confirm', function(done) {
    this.timeout(4000);
    campaignManager._campaigns.TEST001.limits.trigger = 1;
    campaignManager._campaigns.TEST001.limits.postpone = 1;
    campaignManager._campaigns.TEST001.message.options[1].url = url;


    core.urlbar.blur();
    core.urlbar.focus();
    fillIn('some query');
    waitForResult().then(function() {
      click($cliqzMessageContainer().find(".cqz-msg-btn-action-postpone")[0]);
      setTimeout(function () {
        chai.expect(CliqzUtils.getWindow().gBrowser.tabs).to.have.length(2);
                        // checks (1) for expected URL and (2) that new tab is focused
                        //remove trailing slash
                        var str = CliqzUtils.stripTrailingSlash(core.urlbar.value);
                        chai.expect(str).to.equal(url);
                        done();
                      }, 1000)
    });
  });
});
});
};







