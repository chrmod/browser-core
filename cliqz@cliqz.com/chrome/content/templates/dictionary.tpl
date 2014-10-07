<div class='cliqz-inline-box-children cliqz-result-generic'>
    <div class='cliqz-result-left-box'>
        <div class='cliqz-result-type' ></div>
    </div>
    <div class='cliqz-result-mid-box' style="width:{{ width }}px">
        <div class='cliqz-result-title-box overflow'>
            {{ title }}
            {{#if data.richData.pronunciation}}
            <span class='cliqz-result-dictionary-pronunciation'>[ {{data.richData.pronunciation}} ]</span>
            {{/if}}
        </div>
        {{#if data.richData.type}}
            <div class="cliqz-result-dictionary-type">
                {{data.richData.type}}
            </div>
        {{/if}}
        <div {{#if data.richData.multilang}}style='display:none'{{/if}}
             defi='true'>
            <ol>
                {{#each data.richData.definitions}}
                <li>
                <div class='cliqz-result-dictionary-definition'>
                    {{ definition }} {{#if type}} - <span class='cliqz-result-dictionary-subtype'>{{type}}</span>{{/if}}
                </div>
                </li>
                {{/each}}
            </ol>
        </div>
        <div {{#unless data.richData.multilang}}style='display:none'{{/unless}}
             trans='true'>
           {{#with data.richData.translations.[0]}}
               <div class='cliqz-result-dictionary-language-header'>{{language}}:</div>
               <ol>
                       {{#each values}}
                       <li>
                       <div class='cliqz-result-dictionary-definition'>
                           {{this}}
                       </div>
                       </li>
                       {{/each}}
                   {{/with}}
               </ol>
        </div>
    </div>

    <div class='cliqz-result-right-box cliqz-logo {{ logo }}'
         newtab='true'>
    </div>
</div>

<!-- translation snippet -->
<div class='cliqz-result-dictionary-translations'
     {{#unless data.richData.multilang}}style='display:none'{{/unless}}
     trans='true'>
    {{#if data.richData.definitions.length}}
        <span cliqz-action="toggle"
              toggle-hide="trans"
              toggle-show="defi"
              toggle-context="cliqz-result-item-box"
        >
            &lt;&lt;
        </span>
    {{/if}}
    {{#each data.richData.translations}}
        {{#unless @first}}
            <span class='cliqz-result-dictionary-translation-language'>{{language}}:</span>
            <span>
                {{#each values}}
                    {{this}}
                {{/each}}
            </span>
        {{/unless}}
    {{/each}}
</div>
<!-- definition snippet -->
<div class='cliqz-result-dictionary-synonyms'
     {{#if data.richData.multilang}}style='display:none'{{/if}}
     defi='true'>
    {{#if data.richData.translations.length}}
        <span cliqz-action="toggle"
              toggle-hide="defi"
              toggle-show="trans"
              toggle-context="cliqz-result-item-box"
        >
            &lt;&lt;
        </span>
    {{/if}}
    <span class='cliqz-result-dictionary-synonyms-header'>Synonyms:</span>
    {{#each data.richData.synonyms}}
        <span>{{this}}{{#if @last}}{{else}},{{/if}}</span>
    {{/each}}
</div>
