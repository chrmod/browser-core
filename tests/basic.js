var expect = chai.expect;

var  contentWindow;

function $(selector) {
	return contentWindow.document.querySelectorAll(selector)
}

describe('Search View', function() {
  var testBox, 
	  isReady;

  beforeEach(function(done) {

	testBox = document.createElement("iframe");
	testBox.setAttribute("class", "testFrame")
	testBox.src = 	"/mobile/search/index.html";
	document.body.appendChild(testBox);

	contentWindow = testBox.contentWindow;
	
	contentWindow.onload = function() {
		isReady = contentWindow.osBridge.isReady;
		contentWindow.osBridge.isReady = function () { console.log('IS READY'); isReady(); done() };
	}

  });

  afterEach(function () {
  	contentWindow.osBridge.isReady = isReady;
  	contentWindow.localStorage.clear();
    document.body.removeChild(testBox);
  });
  
  context("Local Results", function () {

	beforeEach(function (done) {
	  contentWindow.addEventListener('imgLoadingOver', function () { done() });
	  contentWindow.search_mobile("kino cadillac", true, 48.151753799999994, 11.620054999999999);
	});

	it("should have local template with address and map", function () {
	  expect($('.local')).to.have.length(1);

	  var address = $('.cqz-local-address')[0];
	  expect(address).to.be.ok;

	  var addressText = address.lastChild.wholeText;
	  expect(addressText).to.be.ok;
	  expect(addressText.trim()).to.equal("Rosenkavalierpl. 12, 81925 München, Germany");

	  var img = $('.local-data-img')[0];
	  expect(img).to.be.ok
	  expect(img).to.have.property('style');
	  expect(img.style).to.have.property('display');
	  expect(img.style.display).to.not.equal('none')
	});

  });


  context("Generic Entities", function () {

	beforeEach(function (done) {
	  contentWindow.addEventListener('imgLoadingOver', function () { done() });
	  contentWindow.search_mobile("amazon");
	});

	it("should render generic template", function () {
	  expect($("#cliqz-results")[0].innerHTML).to.contain('<!-- entity-generic -->');
	});
  });

  context("Adult Filter", function () {

	beforeEach(function (done) {
	  contentWindow.addEventListener('imgLoadingOver', function () { done() });
	  contentWindow.search_mobile("titten");
	});

	it("should filter all results", function () {
	  expect($("#cliqz-results")[0].innerHTML).to.contain('<!-- noResult.tpl -->');
	});
  });

  context("Weather", function () {

	beforeEach(function (done) {
	  contentWindow.addEventListener('imgLoadingOver', function () { done() });
	  contentWindow.search_mobile("wetter münchen");
	});

	it("should have the weather card", function () {
	  expect($('.EZ-weather-container')).to.have.length(4);
	  expect($('.EZ-weather-img')).to.have.length(4);
	});
  });

  context("FC Bayern", function () {

	beforeEach(function (done) {
	  contentWindow.addEventListener('imgLoadingOver', function () { done() });
	  contentWindow.search_mobile("fcbayern");
	});

	it("should have the latest results smart card", function () {
	  expect($('.ez-liga')).to.have.length(1);
	  expect($('.meta__legend')).to.have.length(1);
	});
  });

})