import { promiseResolve, promiseReject } from "core/promises";
import { utils } from "core/cliqz";
import { NEWS_DOMAINS_LIST as NEWS_DOMAINS } from "freshtab/news";

export default class {

  constructor() {
    this.newsCache = Object.create(null);
  }

  getNews(domain) {
    if (domain.indexOf("www.") === 0) {
      domain = domain.substring(4, domain.length);
    }

    const hash = utils.hash(domain);

    const richHeaderUrl = utils.RICH_HEADER + utils.getRichHeaderQueryString(`[${hash}]`);

    if (!(hash in NEWS_DOMAINS)) {
      return promiseResolve(null);
    }

    if (domain in this.newsCache) {
      return promiseResolve(this.newsCache[domain]);
    } else {
      return utils.promiseHttpHandler("PUT", richHeaderUrl, JSON.stringify({
        q: `[${hash}]`,
        results: [
          {
            url: 'hb-news.cliqz.com',
            snippet: {}
          }
        ]
      }), 2000).then( response => {
        const payload = JSON.parse(response.response);
        const news = payload.results[0].news[domain];

        this.newsCache[domain] = news;

        return news;
      }, () => {});
    }
  }
}
