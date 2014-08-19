<div class='cliqz-inline-box-children cliqz-result-generic'>
    <div class='cliqz-result-left-box'>
        <div class='cliqz-result-type' ></div>
    </div>
    <div class='cliqz-result-mid-box' style="width:{{ width }}px">
        <div class='cliqz-result-title-box overflow'>
            {{ title }}
        </div>

        <ol>
            {{#each data.richData.definitions}}
            <li>
            <div class='cliqz-result-dictionary-definition'>
                {{ definition }} {{#if type}} - <span class='cliqz-result-dictionary-type'>{{type}}</span>{{/if}}
            </div>
            </li>
            {{/each}}
        </ol>
    </div>

    <div class='cliqz-result-right-box cliqz-logo {{ logo }}'
         newtab='true'>
    </div>
</div>

{{#if data.richData.translations}}
<div class='cliqz-result-dictionary-translations'>
    {{#each data.richData.translations}}
        <span class='cliqz-result-dictionary-translation-language'>{{language}}:</span>
        <span>
            {{#each values}}
                {{this}}
            {{/each}}
        </span>
    {{/each}}
</div>
{{/if}}
