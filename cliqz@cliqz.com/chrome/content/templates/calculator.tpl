{{#if data.is_calculus}}
    <div class='cqz-result-h3 ez-calculator'
         style="cursor: {{#if data.support_copy_ans}} pointer {{else}} auto {{/if}}" cliqz-action='copy-calc-answer'>
    {{#with data}}
        <div>
           <div class="answer">{{prefix_answer}} <span id='calc-answer'>{{answer}}</span></div>
           <div style="margin-top: 14px; color: #999999"> {{expression}}</div>
           {{#if support_copy_ans}}
               <div id="calc-copy-msg" style="padding-bottom:17px; padding-top:3px; background-color:white; color:#cccccc"> Click anywhere to copy</div>
               <div id="calc-copied-msg" style="padding-bottom:18px; padding-top:3px; background-color:white; color:#cccccc; display: none"> Copied</div>
            {{else}}
               <div id="calc-copy-msg" style="padding-bottom:17px; padding-top:3px; background-color:white; color:#cccccc"> {{line3}}</div>
            {{/if}}
        </div>
    {{/with}}
    {{> logo}}
    </div>
{{else}}
    <div class='cqz-result-h3 ez-calculator'>
    {{#with data}}
        <div>
           <div class="answer">= {{answer}}</div>
           <div class="expression">{{expression}}</div>
        </div>
    {{/with}}
    {{> logo}}
    </div>
{{/if}}