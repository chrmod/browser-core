import BaseResult from './base';

class AdultAnswerResult extends BaseResult {
  get displayUrl() {
    return this.rawResult.text;
  }

  click(...args) {
    this.rawResult.onClick(...args);
  }

  get className() {
    return this.rawResult.className;
  }

  get suffixImageUrl() {
    return this.rawResult.suffixImageUrl;
  }
}

export default class AdultQuestionResult extends BaseResult {

  get template() {
    return 'adult-question';
  }

  get internalResults() {
    return this.rawResult.adultAssistant.actions.map((action) => {
      let additionalClassName = '';
      let suffixImageUrl = false;

      if (action.actionName === 'allowOnce') {
        additionalClassName = 'adult-allow-once';
        suffixImageUrl = true;
      }

      return new AdultAnswerResult({
        title: action.title,
        url: `cliqz-actions,${JSON.stringify({ type: 'adult', actionName: action.actionName })}`,
        text: this.rawResult.text,
        className: additionalClassName,
        onClick: this.click.bind(this),
        suffixImageUrl,
      });
    });
  }

  get selectableResults() {
    return this.internalResults;
  }

  click(window, href) {
    const action = JSON.parse(href.split('cliqz-actions,')[1]);
    const adultAssistant = this.rawResult.adultAssistant;
    const actionName = action.actionName;
    if (!adultAssistant.hasAction(actionName)) {
      return;
    }
    adultAssistant[actionName]().then(() => {
      this.rawResult.onButtonClick();
    });
  }
}
