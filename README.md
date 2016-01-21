# Navigation Extension

See - [wiki](https://github.com/cliqz/navigation-extension/wiki)

Please use the configuration from [editorconfig](https://github.com/cliqz/navigation-extension/blob/master/.editorconfig)
 - for sublimetext install [this](https://github.com/sindresorhus/editorconfig-sublime)

## Requirements

Node version required: is >= 4.x

(use `nvm` https://github.com/creationix/nvm to manage multiple node versions)

```bash
npm install -g bower
npm install -g broccoli-cli

npm install   # to satisfy package.json
bower install # to satisfy bower.json
```

## Development

Use `fern.js`:

To start build system:

`./fern.js serve`

Release channel configuration file can be specified via optional argument (default is ./config/jenkins.json`):

`./fern.js serve ./configs/amo.json`

## Packaging

All release channels configurations files are stored in `./configs` folder. Choose your channel and build it with:

`./fern.js build ./configs/<CHANNEL_NAME>.json`

Examples:

* `./fern.js build ./configs/amo.json`
* `./fern.js build ./configs/browser.json`

## Testing

you need to build extension with `./fern.js serve ./configs/jenkins.json` configuration file in order to run tests. 

Then open this URL to start tests `chrome://cliqz/content/firefox-tests/index.html`


## UI debugging

http://localhost:4200/tool/

## Firefox extension versioning

* <= 1.0.X  -> extension built for Firefox and distributed via our own update channe (unsigned)
* 1.1.X     -> extension on/for AMO (signed by Firefox)
* 1.2.X     -> extension build for the CLIQZ browser (signed by CLIQZ)
* X.X.X.1bX -> beta version

