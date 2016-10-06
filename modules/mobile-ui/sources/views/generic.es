export class GenericResult {

  get links() {
    return this.categories || (this.richData && this.richData.categories);
  }

  get shortDescription() {
    let description = this.description;
    if (this.template === 'pattern-h2' && this.description) {
      // rough calculations to determine how much of description to show
      // line padding: 60, character width: 10, keyboard height: 400, line height: 20
      const descLength = ((this.screen.width - 60) / 10)
                         * Math.max((this.screen.height - 400) / 20, 1);
      if (this.description.length > descLength + 3) {
        const shortDescription = this.description.slice(0, descLength);
        description = `${shortDescription}...`;
      }
    }
    return description;
  }
}

function getLogoDetails(url) {
  return CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(url));
}

function attachLogoDetails(resources = []) {
  return resources.map(resource => Object.assign({}, resource, {
    logoDetails: getLogoDetails(resource.url),
  }));
}

export default class Generic {

  enhanceResults(data, screen) {
    const result = data;
    result.richData = result.richData || {};
    result.screen = screen;
    Object.setPrototypeOf(result, GenericResult.prototype);

    result.external_links = attachLogoDetails(result.external_links);
    result.richData.additional_sources = attachLogoDetails(result.richData.additional_sources);
    result.news = attachLogoDetails(result.news);

    if (result.actions && result.external_links) {
      result.actionsExternalMixed = result.actions.concat(result.external_links);
      result.actionsExternalMixed.sort((a, b) => {
        if (a.rank < b.rank) { return 1; }
        if (a.rank > b.rank) { return -1; }
        return 0;
      });
    }
  }
}
