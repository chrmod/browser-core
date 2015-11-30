<!-- calculator.tpl -->
{{#if data.is_calculus}}
    <div class="meta">
        {{> logo}}
        <h3 class="meta__url">Calculator</h3>
    </div>
    <div class='cqz-result-h3 ez-calculator' {{#if support_copy_ans}} cliqz-action='copy-calc-answer' {{/if}}>
    {{#with data}}
        <div class="main">
           <div class="main__headline">{{prefix_answer}} <span id='calc-answer'>{{answer}}</span></div>
           <div class="expression "> {{expression}}</div>
           {{#if support_copy_ans}}
               <div class="message" id="calc-copy-msg">{{local 'Tap anywhere to copy'}}</div>
               <div class="message" id="calc-copied-msg" style="display: none">{{local 'Copied'}}</div>
            {{else}}
               <div class="message" id="calc-copy-msg"> {{line3}}</div>
            {{/if}}
        </div>
    {{/with}}
    </div>
{{else}}
    <div class='cqz-result-h3 ez-calculator'>
    {{#with data}}
        <div>
           <div class="answer">{{prefix_answer}} {{answer}}</div>
           <div class="expression">{{expression}}</div>
        </div>
    {{/with}}
    </div>
{{/if}}