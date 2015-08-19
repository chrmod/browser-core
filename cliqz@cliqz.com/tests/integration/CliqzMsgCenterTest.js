'use strict';

var campaigns = {
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

TESTS.CliqzMsgCenterTest = function (CliqzMsgCenter) {
	describe('CliqzMsgCenter', function() {
        beforeEach(function() {
            CliqzMsgCenter._updateCampaigns = function () { };
            CliqzMsgCenter._deactivateCampaignUpdates();
            for (var c in CliqzMsgCenter._campaigns) {
                CliqzMsgCenter._removeCampaign(c);
            }
            CliqzMsgCenter._addCampaign('TEST001', campaigns.campaigns.TEST001);
            chai.expect(Object.keys(CliqzMsgCenter._campaigns).length).to.equal(1);
       	});

		it('should show message', function() {
			CliqzMsgCenter._campaigns.TEST001.limits.trigger = 2;
			var core = CliqzUtils.getWindow().CLIQZ.Core,
				ui = CliqzUtils.getWindow().CLIQZ.UI;

		 	core.urlbar.blur();
			core.urlbar.focus();
			chai.expect(CliqzMsgCenter._campaigns.TEST001.counts.trigger).to.equal(1);
			core.urlbar.blur();
			core.urlbar.focus();
			chai.expect(CliqzMsgCenter._campaigns.TEST001.state).to.equal('show');
			core.popup._openAutocompletePopup(core.urlbar, core.urlbar);
			fillIn('some query');
			core.popup.openPopup();
			chai.expect(ui.messageCenterMessage).to.exist;
			chai.expect(core.popup.cliqzBox.messageContainer.innerHTML).to.contain(campaigns.campaigns.TEST001.message.text);
		});
	});
};







