<!--
The dictionary template defines two snippet types:
- translation (for multilingual dictionaries) (multilang property);
- definition (for monolingual dictionaries + thesauri).
-->
<div class='cliqz-inline-box-children cliqz-result-generic'>
    <div class='cliqz-result-left-box'>
        <div class='cliqz-result-type' ></div>
    </div>
    <div class='cliqz-result-mid-box' style="width:{{ width }}px">
        <!-- the common part for both snippet types -->
        <div class='cliqz-result-title-box overflow'>
            {{ title }}
            {{#if data.richData.pronunciation}}
            <span class='cliqz-result-dictionary-pronunciation'>[ {{data.richData.pronunciation}} ]</span>
            {{/if}}
        </div>
        <!-- TODO only for definitions? -->
        {{#if data.richData.type}}
            <div class="cliqz-result-dictionary-type">
                {{data.richData.type}}
            </div>
        {{/if}}
        <div {{#if data.richData.multilang}}style='display:none'{{/if}}
             defi='true'>
            <!-- definition snippet -->
            <div {{#if data.richData.translations}}
                 class='cliqz-result-dictionary-main'{{/if}}>
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
            {{#if data.richData.translations}}
                <div class='cliqz-result-dictionary-toggler'>
                    <div cliqz-action="toggle"
                          toggle-hide="defi"
                          toggle-show="trans"
                          toggle-context="cliqz-result-item-box"
                          align="center">
                        Translations<br/>
                        &lt;&lt;
                    </div>
                </div>
            {{/if}}
        </div>
        <div {{#unless data.richData.multilang}}style='display:none'{{/unless}}
             trans='true'>
            <!-- translation snippet -->
            <div {{#if data.richData.definitions}}
                 class='cliqz-result-dictionary-main'{{/if}}>
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
                    </ol>
                {{/with}}
            </div>
            {{#if data.richData.definitions}}
                <div class='cliqz-result-dictionary-toggler'>
                    <div cliqz-action="toggle"
                          toggle-hide="trans"
                          toggle-show="defi"
                          toggle-context="cliqz-result-item-box">
                        &lt;&lt;
                    </div>
                </div>
            {{/if}}
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
    {{#each data.richData.translations}}
        <!-- the first translation is the main content -->
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
    <span class='cliqz-result-dictionary-synonyms-header'>Synonyms:</span>
    {{#each data.richData.synonyms}}
        <span>{{this}}{{#if @last}}{{else}},{{/if}}</span>
    {{/each}}
</div>
