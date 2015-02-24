{{#if data.is_calculus}}
    <div class='cqz-result-h3 ez-calculator' cliqz-action='copy-calc-answer'>
    {{#with data}}
        <div>
           <div class="answer">{{prefix_answer}} <span id='calc-answer'>{{answer}}</span></div>
           <div class="expression"> {{expression}}</div>
           {{#if support_copy_ans}}
               <div class="message" id="calc-copy-msg">Click anywhere to copy</div>
               <div class="message" id="calc-copied-msg" style="display: none"> Copied</div>
            {{else}}
               <div class="message" id="calc-copy-msg"> {{line3}}</div>
            {{/if}}
        </div>
    {{/with}}
    {{> logo}}
    </div>
{{else}}
    <div class='cqz-result-h3 ez-calculator'>
    {{#with data}}
        <div>
           <div class="answer">{{prefix_answer}} {{answer}}</div>
           <div class="expression">{{expression}}</div>
        </div>
    {{/with}}
    {{> logo}}
    </div>
{{/if}}