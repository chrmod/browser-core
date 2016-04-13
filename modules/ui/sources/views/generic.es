export default class {

  enhanceResults(data) {

    var partialSizeCounter = 0,
        partialsPath = [];

    // Space Count: 1 means that it takes one line
    var partialsBank = {
      'title': {
        'space-count': 1,
        'path': 'partials/ez-title',
      },
      'url': {
        'space-count': 1,
        'path': 'partials/ez-url'
      },
      'history': {
        'space-count': 3,
        'path': 'partials/ez-history'
      },
      'description': {
        'space-count': 0.5,
        'path': 'partials/ez-description'
      },
      'description-m': {
        'space-count': 1,
        'path': 'partials/ez-description'
      },
      'description-l': {
        'space-count': 2,
        'path': 'partials/ez-description'
      },
      'buttons': {
        'space-count': 1,
        'path': 'partials/ez-generic-buttons'
      },
      'local-data-sc': {
        'space-count': 3,
        'path': 'partials/location/local-data'
      },
      'missing_location_1': {
        'space-count': 3,
        'path': 'partials/missing_location_1'
      }
    }

    // If we have more than 5 history results we extent the result to full height.
    if (data.urls && data.urls.length > 5) {
      partialsBank['history']['space-count'] = 6;
    }

    for (var ii = 0; ii < data.partials.length; ii++) {
      var prName = data.partials[ii];

      if (partialsBank[prName]) {
        partialSizeCounter += partialsBank[prName]['space-count'];
        partialsPath.push(partialsBank[prName].path);
      }

      // Check which description has to be One line or Multiline.
      if (prName.indexOf('description') > -1) {
        // If it is entity-generic
        if (data.template === 'entity-generic') {
          prName = 'description-m';
        }

        var partialDescr = prName;
      }
    }

    // Calculate the EZ size. If it is size 3 = 1 line result; If it is between 3 & 6 size = 2 line result; Over 6 = 3 line result;
    if (partialSizeCounter <= 3) {
      data.genericZone = {
        'size': 1,
        'class': 'cqz-result-h3'
      };
    } else if (partialSizeCounter > 3 && partialSizeCounter <= 6) {
      data.genericZone = {
        'size': 2,
        'class': 'cqz-result-h2'
      };
    } else {
      data.genericZone = {
        'size': 3,
        'class': 'cqz-result-h1',
      };
    }

    data.genericZone.partials = partialsPath;

    //Push the description classes
    if (partialDescr) {
      if (partialsBank[partialDescr]['space-count'] == 0.5) {
        data.genericZone.partials.descriptionSizeClass = "cqz-ellipsis"
      } else {
        data.genericZone.partials.descriptionSizeClass = "cqz-multy-lines-ellipses"
        data.genericZone.partials.descriptionSizeClass += " ";

        // will display 2 lines of descr
        if (partialsBank[partialDescr]['space-count'] == 1) {
          data.genericZone.partials.descriptionSizeClass += "cqz-line-vis-2";
        }
        // will display 3 lines of descr
        if (partialsBank[partialDescr]['space-count'] == 2) {
          data.genericZone.partials.descriptionSizeClass += "cqz-line-vis-3";
        }
      }

    }

    // Format Generic Buttons
    // Max 4 buttons per result otherwise they are hidden and the select arrow goes out of screen.
    if(data.btns && data.btns.length > 4) {
      data.btns = data.btns.slice(0, 4);
    }

  }
};
