function wait(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

class Subject {
  load() {
    this.iframe = document.createElement('iframe');
    this.iframe.src = '/build/cliqz@cliqz.com/chrome/content/control-center/index.html';
    document.body.appendChild(this.iframe)

    return new Promise(resolve => {
      this.iframe.contentWindow.addEventListener('load', () => resolve());
    }).then(() => {
      return new Promise(resolve => {
        this.iframe.contentWindow.addEventListener('message', ev => {
          resolve();
        })
      })
    });
  }

  unload() {
    document.body.removeChild(this.iframe);
  }

  query(selector) {
    return this.iframe.contentWindow.document.querySelector(selector);
  }

  pushData(data = {}) {
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target: 'cliqz-control-center',
      origin: 'window',
      message:  {
        action: 'pushData',
        data,
      }
    }), "*");
    return wait(500);
  }
}

describe("Control Center App", function () {
  let subject;

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  })

  afterEach(function () {
    subject.unload();
  });

  it("loads", function () {
    chai.expect(true).to.eql(true);
  })

  context("antitracking", function () {

    context("security off", function () {
      beforeEach(() => {
        return subject.pushData();
      });

      it("does not render antitracking box", function () {
        chai.expect(subject.query('#anti-tracking')).to.be.null;
      });
    });

    context("security on", function () {
      beforeEach(() => {
        return subject.pushData({
          securityON: true,
        });
      });

      it("renders antitracking box", function () {
        chai.expect(subject.query('#anti-tracking')).to.not.be.null;
      });
    });

  });

})
