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
        {{#if data.richData.type}}
            <div class="cliqz-result-dictionary-type">
                {{data.richData.type}}
            </div>
        {{/if}}

        {{#if multilang}}
            <!-- translation snippet -->
            {{#with data.richdata.translations.[0]}}
                <span class='cliqz-result-dictionary-translation-language'>{{language}}:</span>
            <ol>
                {{#each values}}
                <li>
                <div class='cliqz-result-dictionary-definition'>
                    {{ definition }}  <!-- no type for translations yet -->
                </div>
                </li>
                {{/each}}
            </ol>
            {{/with}}
        {{else}}
            <!-- definition snippet -->
            <ol>
                {{#each data.richData.definitions}}
                <li>
                <div class='cliqz-result-dictionary-definition'>
                    {{ definition }} {{#if type}} - <span class='cliqz-result-dictionary-subtype'>{{type}}</span>{{/if}}
                </div>
                </li>
                {{/each}}
            </ol>
        {{/if}}
    </div>

    <div class='cliqz-result-right-box cliqz-logo {{ logo }}'
         newtab='true'>
    </div>
</div>

{{#if multilang}}
    <!-- translation snippet -->
    {{#if data.richData.translations}}
    <div class='cliqz-result-dictionary-translations'>
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
    {{/if}}
{{else}}
    <!-- definition snippet -->
    {{#if data.richData.synonyms}}
    <div class='cliqz-result-dictionary-synonyms'>
        <span class='cliqz-result-dictionary-synonyms-header'>Synonyms:</span>
        {{#each data.richData.synonyms}}
            <span>{{this}}{{#if @last}}{{else}},{{/if}}</span>
        {{/each}}
    </div>
    {{/if}}
{{/if}}
