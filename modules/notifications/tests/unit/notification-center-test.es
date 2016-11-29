export default describeModule("notifications/notification-center",
  function() {
    return {
      "core/console": {
        default: {}
      },
      "core/anacron": {
        Cron: function() {}
      },
      "notifications/providers/gmail": {
        default: class {
          activate() {
          }
        }
      },
      "notifications/providers/pin-tab": {
        default: function() {}
      },
      "notifications/storage": {
        default: class {
          watchedDomainNames() { return []; }
          notifications() { return {} }
        }
      },
      "core/mixins/evented": {
        default: c => c,
      }
    }
  },
  function() {
    let nc;
    beforeEach(function() {
      const NotificationCenter = this.module().default;
      nc = new NotificationCenter();
    });
    describe('#start', function() {
      it('calls cron run on start', function () {
        const cron = nc.cron;
        const startSpy = sinon.spy(cron.start);
        const runSpy = sinon.spy(cron.run);

        cron.run = runSpy;
        cron.start = startSpy;

        nc.start();

        chai.expect(startSpy).to.have.been.called;
        chai.expect(runSpy).to.have.been.called;
      });
    });

    describe('#stop', function() {
      it('calls cron stop on stop', function() {
        const cron = nc.cron;
        const stopSpy = sinon.spy(cron.stop);

        cron.stop = stopSpy;
        nc.stop();

        chai.expect(stopSpy).to.have.been.called;
      });
    });

    describe('#domainList', function() {
      it('returns list of watched domains', function() {
        sinon.stub(nc.storage, 'watchedDomainNames')
           .returns(['mail.google.com']);

        chai.expect(nc.domainList()).to.deep.equal(['mail.google.com'])
      });
    });

    describe('#notifications', function() {
      context('available domains', function() {
        beforeEach(function() {
          nc.availableDomains = function() {
            return {
              'mail.google.com': {
                providerName: 'gmail',
                config: {},
                schedule: '*/1 *',
              },
              'twitter.com': {
                providerName: 'pin-tab',
                config: {
                  domain: 'twitter.com',
                  selector: '.with-count .count-inner',
                  attribute: 'innerText',
                },
                schedule: '*/1 *',
              },
            }
          }
        });
        context('no previously stored notifications', function() {
          beforeEach(function() {
            sinon.stub(nc.storage, 'notifications')
               .returns({});
          });

          it('should return no notifications if none of the speed dials is in the list of available domains', function() {
            const notifications = nc.notifications(['localhost', 'www.facebook.com']);
            chai.expect(notifications).to.deep.equal({});
          });

          it('should return notifications for the speed dials that match available domains', function() {
            const notifications = nc.notifications(['localhost', 'mail.google.com']);
            chai.expect(notifications).to.include.keys('mail.google.com');
            chai.expect(notifications).to.be.deep.equal({ 'mail.google.com': { status: 'available' } })
          });
        });

        context('previously stored notifications', function() {
          beforeEach(function() {
            nc.domainList = function() {
              return ['mail.google.com'];
            }
          });

          it('should return notifications for new speed dials that match available domains', function() {
            sinon.stub(nc.storage, 'notifications')
             .returns({
                'mail.google.com': {
                   count: 0, status: true, unread: 30
                }
            });
            const notifications = nc.notifications(['localhost', 'mail.google.com', 'twitter.com']);
            chai.expect(notifications).to.include.keys('mail.google.com');
            chai.expect(notifications).to.include.keys('twitter.com');
            chai.expect(notifications).to.deep.equal({
              'mail.google.com': {
                count: 0, status: true, unread: 30
              },
              'twitter.com': {
                status: 'available'
              }
            });
          });

          it('should not return notifications for previously stored speed dials that match available domains', function() {

            const notifications = nc.notifications(['localhost','twitter.com']);
            sinon.stub(nc.storage, 'notifications')
               .returns({});
            chai.expect(notifications).to.not.include.keys('mail.google.com');
            chai.expect(notifications).to.include.keys('twitter.com');
            chai.expect(notifications).to.deep.equal({
              'twitter.com': {
                status: 'available'
              }
            });
          });

          it('should not return notifications for previously stored speed dials that don\'t match available domains anymore', function() {
            nc.domainList = function() {
              return ['www.facebook.com'];
            }

            var spy = sinon.spy(nc.storage, 'notifications');
            nc.storage.notifications = spy

            const notifications = nc.notifications(['localhost','twitter.com', 'www.facebook.com']);
            chai.expect(spy).to.have.been.calledWith([]);
            chai.expect(notifications).to.not.include.keys('www.facebook.com');
            chai.expect(notifications).to.deep.equal({
              'twitter.com': {
                status: 'available'
              }
            });
          });
        });


      });
    });
  }
);
