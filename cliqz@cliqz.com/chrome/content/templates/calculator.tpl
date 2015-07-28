{{!
    EZ calling that template:
        1. Time: time Berlin
        2. Calculator: 1+2
        3. Unit Converter: 10m to cm
}}

{{#if data.is_calculus}}
    <div class='cqz-result-h3 ez-calculator' cliqz-action='copy-calc-answer'>
    {{#with data}}
        <div>
           {{! Result from calc }}
           <div class="answer">{{prefix_answer}} <span id='calc-answer'>{{answer}}</span></div>
           <div class="expression">
               {{expression}}

               {{! Copy Message }}
               {{#if support_copy_ans}}
                   <span class="message" id="calc-copy-msg">{{local 'Click anywhere to copy'}}</span>
                   <span class="message" id="calc-copied-msg" style="display: none">{{local 'Copied'}}</span>
                {{else}}
                   <span class="message" id="calc-copy-msg"> {{line3}}</span>
                {{/if}}
           </div>
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