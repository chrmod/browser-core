# Navigation Extension

See - [wiki](https://github.com/cliqz/navigation-extension/wiki)

Please use the configuration from [editorconfig](https://github.com/cliqz/navigation-extension/blob/master/.editorconfig)
 - for sublimetext install [this](https://github.com/sindresorhus/editorconfig-sublime)

## Requirements

```bash
npm install -g bower
npm install -g broccoli-cli

npm install   # to satisfy package.json
bower install # to satisfy bower.json
```

## Development

Use `fern.js`:

To start build system for beta release:

`./fern.sh serve`

Release channel configuration file can be specified via optional argument:

`./fern.sh serve ./configs/beta.json`

## Packaging

Build beta release with:

`./fern.sh build`

Other releases are build with respective configuration files with:

`./fern.sh build ./config/beta.json`

once having `build` folder present you need to install bower_component for your platform build, e.g.:
`cd build/dev/firefox/cliqz@cliqz.com && bower install`

## UI debugging

http://localhost:4200/tool/
