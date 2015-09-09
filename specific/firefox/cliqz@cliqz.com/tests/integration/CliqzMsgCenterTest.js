'use strict';

TESTS.CliqzMsgCenterTestItegration = function (CliqzMsgCenter) {
	describe('CliqzMsgCenter (integration)', function() {
        var response,
            core = CliqzUtils.getWindow().CLIQZ.Core,
            ui = CliqzUtils.getWindow().CLIQZ.UI,
            gBrowser = CliqzUtils.getWindow().gBrowser;

        beforeEach(function() {
            response = {
                campaigns: {
                    TEST001: {
                        DEBUG_remaining_clicks: 10,
                        DEBUG_remaining_shows: 48,
                        handlerId: 'MESSAGE_HANDLER_DROPDOWN_FOOTER',
                        limits: {
                            confirm: -1,
                            discard: -1,
                            ignore: -1,
                            postpone: -1,
                            show: -1,
                            trigger: 1
                        },
                        message: {
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
                            text: 'Der CLIQZ browser ist besser als Firefox.',
                            textColor: 'FFFFFF'
                        },
                        triggerId: 'TRIGGER_URLBAR_FOCUS'
                    }
                }
            };
            CliqzMsgCenter._updateCampaigns = function () { };
            CliqzMsgCenter._deactivateCampaignUpdates();
            for (var c in CliqzMsgCenter._campaigns) {
                CliqzMsgCenter._removeCampaign(c);
            }
            CliqzMsgCenter._addCampaign('TEST001', response.campaigns.TEST001);
            chai.expect(Object.keys(CliqzMsgCenter._campaigns).length).to.equal(1);
       	});

		it('should show message', function() {
			CliqzMsgCenter._campaigns.TEST001.limits.trigger = 2;

		 	core.urlbar.blur();
			core.urlbar.focus();
			chai.expect(CliqzMsgCenter._campaigns.TEST001.counts.trigger).to.equal(1);
			core.urlbar.blur();
			core.urlbar.focus();
			chai.expect(CliqzMsgCenter._campaigns.TEST001.state).to.equal('show');
			chai.expect(ui.messageCenterMessage).to.exist;
			fillIn('some query');
			return waitForResult().then(function() {
				chai.expect(core.popup.cliqzBox.messageContainer.innerHTML).to.contain(response.campaigns.TEST001.message.text);
				return Promise.resolve();
			});
		});

		it('should hide message', function() {
			CliqzMsgCenter._campaigns.TEST001.limits.trigger = 1;
			core.urlbar.blur();
			core.urlbar.focus();
			chai.expect(CliqzMsgCenter._campaigns.TEST001.state).to.equal('show');
			chai.expect(ui.messageCenterMessage).to.exist;
			fillIn('some query');
			CliqzMsgCenter._onMessageAction('TEST001', 'postpone');
			chai.expect(ui.messageCenterMessage).not.to.exist;
			return waitForResult().then(function() {
				chai.expect(core.popup.cliqzBox.messageContainer.innerHTML).to.equal('');
				return Promise.resolve();
			});
		});

        context('URL tests', function () {
            var url = 'https://cliqz.com/';

            afterEach(function () {
                if (gBrowser.tabs.length > 1) {
                    gBrowser.removeTab(gBrowser.selectedTab);
                }
            });

            it('should open URL on confirm without limit', function(done) {
                CliqzMsgCenter._campaigns.TEST001.limits.trigger = 1;
                CliqzMsgCenter._campaigns.TEST001.limits.confirm = -1;
                CliqzMsgCenter._campaigns.TEST001.message.options[0].url = url;


                core.urlbar.blur();
                core.urlbar.focus();
                fillIn('some query');
                waitForResult().then(function() {
                    click($cliqzMessageContainer().find(".cqz-msg-btn-action-confirm")[0]);
                    setTimeout(function () {
                        chai.expect(CliqzUtils.getWindow().gBrowser.tabs).to.have.length(2);
                        // checks (1) for expected URL and (2) that new tab is focused
                        chai.expect(core.urlbar.value).to.equal(url);
                        done();
                    }, 1000)
                });
            });


            it('should open URL on actions other than confirm', function(done) {
                CliqzMsgCenter._campaigns.TEST001.limits.trigger = 1;
                CliqzMsgCenter._campaigns.TEST001.limits.postpone = 1;
                CliqzMsgCenter._campaigns.TEST001.message.options[1].url = url;


                core.urlbar.blur();
                core.urlbar.focus();
                fillIn('some query');
                waitForResult().then(function() {
                    click($cliqzMessageContainer().find(".cqz-msg-btn-action-postpone")[0]);
                    setTimeout(function () {
                        chai.expect(CliqzUtils.getWindow().gBrowser.tabs).to.have.length(2);
                        // checks (1) for expected URL and (2) that new tab is focused
                        chai.expect(core.urlbar.value).to.equal(url);
                        done();
                    }, 1000)
                });
            });
        });
	});
};







