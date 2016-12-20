import { utils } from 'core/cliqz';
import ToolbarButtonManager from 'video-downloader/ToolbarButtonManager';
import { isVideoURL, getVideoInfo } from 'video-downloader/video-downloader';
import Panel from '../core/ui/panel';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';

function toPx(pixels) {
  return `${pixels.toString()}px`;
}

function getSize(contentLength) {
  let size = parseInt(contentLength, 10);
  if (size >= 1073741824) {
    size = `${parseFloat((size / 1073741824).toFixed(1))} GB`;
  } else if (size >= 1048576) {
    size = `${parseFloat((size / 1048576).toFixed(1))} MB`;
  } else {
    size = `${parseFloat((size / 1024).toFixed(1))} KB`;
  }
  return size;
}

const BTN_ID = 'cliqz-vd-btn';
const PANEL_ID = `${BTN_ID}-panel`;
const firstRunPref = 'cliqz-vd-initialized';
const TOOLTIP_LABEL = 'CLIQZ Video Downloader';

export default class UI {
  constructor(PeerComm, window) {
    this.PeerComm = PeerComm;
    this.window = window;
    this.cssUrl = 'chrome://cliqz/content/video-downloader/styles/xul.css';

    this.actions = {
      getVideoLinks: this.getVideoLinks.bind(this),
      getMockData: this.getMockData.bind(this),
      checkForVideoLink: this.checkForVideoLink.bind(this),
      resize: this.resizePopup.bind(this),
      sendToMobile: this.sendToMobile.bind(this),
      hidePopup: this.hidePopup.bind(this),
    };

    this.panel = new Panel(
      this.window,
      'chrome://cliqz/content/video-downloader/index.html',
      PANEL_ID,
      'video-downloader',
      false,
      this.actions
    );
  }

  init() {
    this.panel.attach();
    // stylesheet for control center button
    addStylesheet(this.window.document, this.cssUrl);

    this.addVDbutton();

    CliqzEvents.sub('core.location_change', this.actions.checkForVideoLink);
  }

  unload() {
    this.panel.detach();
    removeStylesheet(this.window.document, this.cssUrl);
    this.button.parentElement.removeChild(this.button);
  }

  resizePopup({ width, height }) {
    this.panel.iframe.style.width = toPx(width);
    this.panel.iframe.style.height = toPx(height);

    this.panel.iframe.contentDocument.body.style.margin = 0;
    this.panel.iframe.contentDocument.body.style.overflowX = 'hidden';
  }

  hidePopup() {
    this.panel.hide();
  }

  sendToMobile({ url, format, title }) {
    this.PeerComm.getObserver('YTDOWNLOADER').sendVideo({ url, format, title })
      .then(() => {
        this.sendMessageToPopup({
          action: 'pushData',
          data: { sendingStatus: 'success' },
        });
      })
      .catch(() => {
        this.sendMessageToPopup({
          action: 'pushData',
          data: { sendingStatus: 'error' },
        });
      });
  }

  getCurrentUrl() {
    const url = this.window.gBrowser.currentURI.spec;
    let friendlyURL = url;
    try {
      // try to clean the url
      friendlyURL = utils.stripTrailingSlash(utils.cleanUrlProtocol(url, true));
    } catch (e) {
      utils.log(url, e);
    }

    return friendlyURL;
  }

  getMockData() {
    const result = { isMockData: true };
    this.sendMessageToPopup({
      action: 'pushData',
      data: result,
    });

    this.getVideoLinks();
  }

  checkForVideoLink() {
    if (!this.button) {
      return;
    }

    const url = this.getCurrentUrl();

    const isCustomizing = this.window.document.documentElement.hasAttribute("customizing");

    if (isVideoURL(url) || isCustomizing) {
      this.button.setAttribute('class',
        'cliqz-video-downloader toolbarbutton-1 chromeclass-toolbar-additional');
    } else {
      this.button.setAttribute('class',
        'hidden toolbarbutton-1 chromeclass-toolbar-additional');
    }
  }

  addVDbutton() {
    const doc = this.window.document;
    const firstRunPrefVal = utils.getPref(firstRunPref, false);
    if (!firstRunPrefVal) {
      utils.setPref(firstRunPref, true);
      ToolbarButtonManager.setDefaultPosition(BTN_ID, 'nav-bar', 'bookmarks-menu-button');
    }

    const button = doc.createElement('toolbarbutton');
    button.setAttribute('id', BTN_ID);
    button.setAttribute('label', TOOLTIP_LABEL);
    button.setAttribute('tooltiptext', TOOLTIP_LABEL);
    button.classList.add('toolbarbutton-1');
    button.classList.add('chromeclass-toolbar-additional');

    const div = doc.createElement('div');
    div.setAttribute('class', 'cliqz-video-downloader');
    button.appendChild(div);

    button.addEventListener('command', () => {
      this.panel.open(button);
    });

    ToolbarButtonManager.restorePosition(doc, button);

    this.badge = div;
    this.button = button;
    this.button.setAttribute('class', 'hidden');
  }

  // used for a first faster rendering
  getVideoLinks() {
    const url = this.getCurrentUrl();
    Promise.resolve()
    .then(() => {
      if (this.PeerComm) {
        return this.PeerComm.waitInit();
      }
      return null;
    })
    .then(() => getVideoInfo(url))
    .then(info => {
      if (info.formats.length > 0) {
        utils.log('All video formats: ', info.formats);
        const videos = [];
        let audio;
        const videosOnly = [];
        let videoForPairing = {};
        info.formats.forEach(item => {
          if (item.size === 0) {
            return;
          }
          if (item.type.includes('audio/mp4')) {
            audio = {
              name: `M4A ${item.audioBitrate}kbps Audio Only`,
              size: getSize(item.size),
              url: item.url,
              title: info.title,
              format: 'm4a',
            };
          } else if (item.container === 'mp4') {
            const video = {
              name: `${item.container.toUpperCase()} ${item.resolution}`,
              size: getSize(item.size),
              url: item.url,
              title: info.title,
              format: item.container,
            };

            if (item.audioBitrate !== null) {
              videos.push(video);
            } else {
              video.name = `${video.name} Video Only`;
              video.class = 'hidden';
              videosOnly.push(video);
            }
          }
        });
        if (videos.length > 0) {
          videoForPairing = videos[videos.length - 1];
        }
        videos.push(audio);
        const result = {
          pairingAvailable: !!this.PeerComm,
          isPaired: this.PeerComm && this.PeerComm.isPaired,
          videoForPairing,
          formats: videos.concat(videosOnly),
        };
        if (result.formats.length > 0) {
          this.sendMessageToPopup({
            action: 'pushData',
            data: result,
          });
        } else {
          this.sendMessageToPopup({
            action: 'pushData',
            data: {
              unSupportedFormat: true,
            },
          });
        }
      }
    });
  }

  sendMessageToPopup(message) {
    this.panel.sendMessage({
      target: 'cliqz-video-downloader',
      origin: 'window',
      message,
    });
  }

}
