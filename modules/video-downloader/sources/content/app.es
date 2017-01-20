import helpers from 'video-downloader/content/helpers';
import { messageHandler, sendMessageToWindow } from 'video-downloader/content/data';
import $ from 'jquery';
import Handlebars from 'handlebars';
import templates from 'video-downloader/templates';
import { saveFileAs } from 'video-downloader/content/save-file-from-url';

Handlebars.partials = templates;

function localizeDocument() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), el => {
    var elArgs = el.dataset.i18n.split(','),
        key = elArgs.shift();

    el.innerHTML = chrome.i18n.getMessage(key, elArgs);
  });
}

function resize() {
  var $videoDownloader = $('#video-downloader');
  var width = $videoDownloader.width();
  var height = $videoDownloader.height();
  sendMessageToWindow({
    action: 'resize',
    data: {
      width: width,
      height: height,
    }
  });
}

$(document).ready(function() {
  Object.keys(helpers).forEach(function (helperName) {
    Handlebars.registerHelper(helperName, helpers[helperName]);
  });

  sendMessageToWindow({
    action: 'getMockData',
    data: {}
  });
});

$(document).on('click', '#more-formats-btn', function(e) {
  e.stopPropagation();
  $('#download-links .hidden').attr('class', '');
  $('#more-formats-btn').css('display', 'none');
  resize();
});

$(document).on('click', '#send-to-mobile-btn', function(e) {
  e.stopPropagation();
  var dataToSend = {
    url: $(this).attr('data-href'),
    title: $(this).attr('data-title'),
    format: $(this).attr('data-format'),
  }
  $(this).attr('class', 'disabled');
  sendMessageToWindow({
    action: 'sendToMobile',
    data: dataToSend,
  });
});

$(document).on('click', '#download-links li', function(e) {
  e.stopPropagation();
  hidePopup();
  saveFileAs($(this).find('p').attr('data-href'), $(this).find('p').attr('download'));
});

$(document).on('click', '#pairing-dashboard', function(){
  hidePopup();
});

function hidePopup () {
  sendMessageToWindow({
    action: 'hidePopup',
    data: {}
  });
}

function draw(data) {
  if(data.sendingStatus) {
    if(data.sendingStatus === 'success') {
      $('#sending-status').attr('src', 'chrome://cliqz/content/video-downloader/images/checkbox-green.svg');
    } else {
      $('#sending-status').attr('src', 'chrome://cliqz/content/video-downloader/images/checkbox-red.svg');
    }
  } else {
    $('#video-downloader').html(templates['template'](data));
  }
  localizeDocument();
  resize();
}

window.draw = draw;
