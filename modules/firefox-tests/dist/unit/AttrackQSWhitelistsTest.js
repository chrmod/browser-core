
TESTS.AttrackQSWhitelistTest = function (CliqzUtils, CliqzEvents) {
  var System = CliqzUtils.getWindow().CLIQZ.System,
      QSWhitelist = System.get('antitracking/qs-whitelists').default,
      md5 = System.get('antitracking/md5').default,
      persist = System.get('antitracking/persistent-state'),
      datetime = System.get('antitracking/time');


  describe('QSWhitelist', function() {
    var whitelist;

    beforeEach(function() {
      whitelist = new QSWhitelist();
    });

    it('token whitelist URL is correct', function() {
      chai.expect(whitelist.TOKEN_WHITELIST_URL).to.equal('https://cdn.cliqz.com/anti-tracking/whitelist/domain_whitelist_tokens_md5.json');
    });

    it('safekey list URL is correct', function() {
      chai.expect(whitelist.SAFE_KEY_URL).to.equal('https://cdn.cliqz.com/anti-tracking/whitelist/domain_safe_key.json');
    });

    describe('isTrackerDomain', function() {

      var domain = md5('example.com');

      it('returns false if domain not in tokens list', function() {
        chai.expect(whitelist.isTrackerDomain(domain)).to.be.false;
      });

      it('returns true if domain in tokens list', function() {
        whitelist.addSafeToken(domain, '');
        chai.expect(whitelist.isTrackerDomain(domain)).to.be.true;
      });

      it('returns false if domain is only in safe key list', function() {
        whitelist.addSafeKey(domain, '');
        chai.expect(whitelist.isTrackerDomain(domain)).to.be.false;
      });

    });

    describe('addSafeKey', function() {
      var domain = md5('example.com'),
          key = md5('callback');

      it('adds a key to the safekey list', function() {
        whitelist.addSafeKey(domain, key);
        chai.expect(whitelist.isSafeKey(domain, key)).to.be.true;
      });

    });

    describe('addSafeToken', function() {
      var domain = md5('example.com'),
          token = md5('safe');

      it('adds a key to the token list', function() {
        whitelist.addSafeToken(domain, token);
        chai.expect(whitelist.isSafeToken(domain, token)).to.be.true;
      });
    });

    describe('isUpToDate', function() {

      it('returns false if lists have not been updated', function() {
        chai.expect(whitelist.isUpToDate()).to.be.false;
      });

      describe('after list update', function() {
        var mock_token_string = '{\"f528764d624db129\": {\"7269d282a42ce53e58c7b3f66ca19bac\": true}}\n',
          mock_token_url = '/token_whitelist.json',
          mock_token_hash = '4b45ea02efdbc85bf5a456beb3ab1cac',
          mock_safekey_string = '{\"f528764d624db129\": {\"924a8ceeac17f54d3be3f8cdf1c04eb2\": \"20200101\"}}\n',
          mock_safekey_url = '/safekey.json',
          mock_safekey_hash = '3e82cf3535f01bfb960e826f1ad8ec2d';

        beforeEach(function() {
          testServer.registerPathHandler('/token_whitelist.json', function(request, response) {
            response.write(mock_token_string);
          });
          testServer.registerPathHandler('/safekey.json', function(request, response) {
            response.write(mock_safekey_string);
          });

          whitelist.SAFE_KEY_URL = 'http://localhost:' + testServer.port + '/safekey.json';
          persist.setValue('safeKeyExtVersion', '');
          whitelist.TOKEN_WHITELIST_URL = 'http://localhost:' + testServer.port + '/token_whitelist.json';
          persist.setValue('tokenWhitelistVersion', '');

          whitelist._loadRemoteSafeKey();
          whitelist._loadRemoteTokenWhitelist();
        });

        it('returns true', function() {
          return waitFor(function() {
            return whitelist.isUpToDate();
          });
        });
      });

    });

    describe('_loadRemoteTokenWhitelist', function() {

      var mock_token_string = '{\"f528764d624db129\": {\"7269d282a42ce53e58c7b3f66ca19bac\": true}}\n',
          mock_token_url = '/token_whitelist.json',
          mock_token_hash = '4b45ea02efdbc85bf5a456beb3ab1cac';

      beforeEach(function() {
        testServer.registerPathHandler('/token_whitelist.json', function(request, response) {
          response.write(mock_token_string);
        });
        mock_token_url = 'http://localhost:' + testServer.port + '/token_whitelist.json';

        // mock token whitelist URL
        whitelist.TOKEN_WHITELIST_URL = mock_token_url;
        persist.setValue('tokenWhitelistVersion', '');
      });

      it('loads remote token list', function(done) {
        whitelist._loadRemoteTokenWhitelist();
        waitFor(function() {
          return persist.getValue('tokenWhitelistVersion', '').length > 0;
        }).then(function() {
          chai.expect(persist.getValue('tokenWhitelistVersion')).to.equal(mock_token_hash);
          chai.expect(whitelist.isTrackerDomain('f528764d624db129')).to.be.true;
          chai.expect(whitelist.isSafeToken('f528764d624db129', '7269d282a42ce53e58c7b3f66ca19bac')).to.be.true;
          done();
        });
      });

      it('fires an event with the new list version number', function(done) {
        var testEventVersion = function(version) {
          try {
            chai.expect(version).to.equal(mock_token_hash);
            done();
          } catch(e) {
            done(e);
          } finally {
            CliqzEvents.un_sub('attrack:token_whitelist_updated', testEventVersion);
          }
        };
        CliqzEvents.sub('attrack:token_whitelist_updated', testEventVersion);
        whitelist._loadRemoteTokenWhitelist();
      });
    });

    describe('_loadRemoteSafeKey', function() {
      var mock_safekey_string = '{\"f528764d624db129\": {\"924a8ceeac17f54d3be3f8cdf1c04eb2\": \"20200101\"}}\n',
          mock_safekey_url = '/safekey.json',
          mock_safekey_hash = '3e82cf3535f01bfb960e826f1ad8ec2d';

      beforeEach(function() {
        testServer.registerPathHandler('/safekey.json', function(request, response) {
          response.write(mock_safekey_string);
        });
        mock_safekey_url = 'http://localhost:' + testServer.port + '/safekey.json';

        whitelist.SAFE_KEY_URL = mock_safekey_url;
        persist.setValue('safeKeyExtVersion', '');
      });

      it('loads remote safekeys', function() {
        whitelist._loadRemoteSafeKey();
        waitFor(function() {
          return persist.getValue('safeKeyExtVersion', '').length > 0;
        }).then(function() {
          try {
            chai.expect(persist.getValue('safeKeyExtVersion')).to.equal(mock_safekey_hash);
            chai.expect(whitelist.isSafeKey('f528764d624db129', '924a8ceeac17f54d3be3f8cdf1c04eb2'));
            done();
          } catch(e) { done(e); }
        });
      });

      it('fires an event with the new list version number', function(done) {
        var testEventVersion = function(version) {
          try {
            chai.expect(version).to.equal(mock_safekey_hash);
            done();
          } catch(e) {
            done(e);
          } finally {
            CliqzEvents.un_sub('attrack:safekeys_updated', testEventVersion);
          }
        };
        CliqzEvents.sub('attrack:safekeys_updated', testEventVersion);
        whitelist._loadRemoteTokenWhitelist();
      });

      it('merges with existing safekeys', function(done) {
        var domain1_hash = 'f528764d624db129',
          domain2_hash = '9776604f86ca9f6a',
          key_hash = '4a8a08f09d37b73795649038408b5f33';
        whitelist.addSafeKey(domain1_hash, key_hash);
        whitelist.addSafeKey(domain2_hash, key_hash);

        whitelist._loadRemoteSafeKey();
        waitFor(function() {
          return persist.getValue('safeKeyExtVersion', '').length > 0;
        }).then(function() {
          try {
            chai.expect(persist.getValue('safeKeyExtVersion')).to.equal(mock_safekey_hash);

            chai.expect(whitelist.isSafeKey(domain1_hash, key_hash)).to.be.true;
            chai.expect(whitelist.isSafeKey(domain1_hash, '924a8ceeac17f54d3be3f8cdf1c04eb2')).to.be.true;
            chai.expect(whitelist.isSafeKey(domain2_hash, key_hash)).to.be.true;
            chai.expect(whitelist.isSafeKey(domain2_hash, '924a8ceeac17f54d3be3f8cdf1c04eb2')).to.be.false;
            done();
          } catch(e) { done(e); }
        });
      });

      it('replaces local key with remote if remote is more recent', function(done) {
        var domain1_hash = 'f528764d624db129',
          key_hash = '924a8ceeac17f54d3be3f8cdf1c04eb2',
          today = datetime.getTime().substring(0, 8),
          safeKeys = whitelist.safeKeys.value;
        safeKeys[domain1_hash] = {};
        safeKeys[domain1_hash][key_hash] = [today, 'l'];

        whitelist._loadRemoteSafeKey();
        waitFor(function() {
          return persist.getValue('safeKeyExtVersion', '').length > 0;
        }).then(function() {
          try {
            chai.expect(persist.getValue('safeKeyExtVersion')).to.equal(mock_safekey_hash);
            chai.expect(safeKeys[domain1_hash]).to.have.property(key_hash);
            chai.expect(safeKeys[domain1_hash][key_hash]).to.eql(['20200101', 'r']);
            done();
          } catch(e) { done(e); }
        });
      });

      it('leaves local key if it is more recent than remote', function(done) {
        var domain1_hash = 'f528764d624db129',
          key_hash = '924a8ceeac17f54d3be3f8cdf1c04eb2',
          day = '20200102',
          safeKeys = whitelist.safeKeys.value;
        safeKeys[domain1_hash] = {};
        safeKeys[domain1_hash][key_hash] = [day, 'l'];

        whitelist._loadRemoteSafeKey();
        waitFor(function() {
          return persist.getValue('safeKeyExtVersion', '').length > 0;
        }).then(function() {
          try {
            chai.expect(persist.getValue('safeKeyExtVersion')).to.equal(mock_safekey_hash);
            chai.expect(safeKeys[domain1_hash]).to.have.property(key_hash);
            chai.expect(safeKeys[domain1_hash][key_hash]).to.eql([day, 'l']);
            done();
          } catch(e) { done(e); }
        });
      });

      it('prunes keys more than 7 days old', function(done) {
        var domain1_hash = 'f528764d624db129',
          key_hash = '4a8a08f09d37b73795649038408b5f33',
          day = new Date(),
          daystr = null,
          d = '',
          m = '',
          safeKeys = whitelist.safeKeys.value;
        day.setDate(day.getDate() - 8);
        d = (day.getDate()  < 10 ? '0' : '' ) + day.getDate();
        m = (day.getMonth() < 10 ? '0' : '' ) + parseInt((day.getMonth()));
        daystr = '' + day.getFullYear() + m + d;
        safeKeys[domain1_hash] = {};
        safeKeys[domain1_hash][key_hash] = [daystr, 'l'];

        whitelist._loadRemoteSafeKey();
        waitFor(function() {
          return persist.getValue('safeKeyExtVersion', '').length > 0;
        }).then(function() {
          try {
            chai.expect(persist.getValue('safeKeyExtVersion')).to.equal(mock_safekey_hash);
            chai.expect(safeKeys[domain1_hash]).to.not.have.property(key_hash);
            done();
          } catch(e) { done(e); }
        });
      });

    });

    describe('after init', function() {

      beforeEach(function() {
        whitelist.init();
      });

      afterEach(function() {
        whitelist.destroy();
      });

      describe('attrack:updated_config event', function() {

        var tokenCallCount,
            safekeyCallCount;

        beforeEach(function() {
          tokenCallCount = 0;
          whitelist._loadRemoteTokenWhitelist = function() {
            tokenCallCount++;
          };
          safekeyCallCount = 0;
          whitelist._loadRemoteSafeKey = function() {
            safekeyCallCount++;
          };
        });

        it('triggers _loadRemoteTokenWhitelist if version is different', function() {
          CliqzEvents.pub('attrack:updated_config', { token_whitelist_version: 'new_version' });
          return waitFor(function() {
            return tokenCallCount == 1;
          }).then(() => {
            chai.expect(tokenCallCount).to.equal(1);
            chai.expect(safekeyCallCount).to.equal(0);
          });
        });

        it('does not load if token version is same', function(done) {
          CliqzEvents.pub('attrack:updated_config', { token_whitelist_version: persist.getValue('tokenWhitelistVersion') });
          setTimeout(function() {
            try {
              chai.expect(tokenCallCount).to.equal(0);
              chai.expect(safekeyCallCount).to.equal(0);
              done();
            } catch(e) {
              done(e);
            }
          }, 100);
        });

        it('triggers _loadRemoteSafeKey if safekey version is different', function() {
          CliqzEvents.pub('attrack:updated_config', { safekey_version: 'new_version' });
          return waitFor(function() {
            return safekeyCallCount == 1;
          }).then(function() {
            chai.expect(tokenCallCount).to.equal(0);
            chai.expect(safekeyCallCount).to.equal(1);
          });
        });

        it('does not safekey load if version is same', function(done) {
          CliqzEvents.pub('attrack:updated_config', { safekey_version: persist.getValue('safeKeyExtVersion') });
          setTimeout(function() {
            try {
              chai.expect(safekeyCallCount).to.equal(0);
              chai.expect(tokenCallCount).to.equal(0);
              done();
            } catch(e) {
              done(e);
            }
          }, 100);
        });

        it('loads both lists if both have new versions', function() {
          CliqzEvents.pub('attrack:updated_config', { token_whitelist_version: 'new_version', safekey_version: 'new_version' });
          return waitFor(function() {
            return safekeyCallCount === 1 && tokenCallCount === 1;
          }).then(function() {
            chai.expect(tokenCallCount).to.equal(1);
            chai.expect(safekeyCallCount).to.equal(1);
          });
        });
      });
    });

  });
};
