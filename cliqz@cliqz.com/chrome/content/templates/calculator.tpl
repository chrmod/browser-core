{{#if data.is_calculus}}


<div class='cqz-result-h3' style="background-color: white; cursor: {{#if data.support_copy_ans}} pointer {{else}} auto {{/if}}" cliqz-action='copy-calc-answer'>
{{#with data}}
    <div style="margin-left: 22px; margin-top: 17px">
       <div style="font-size:25px">{{prefix_answer}} <span id='calc-answer'>{{answer}}</span></div>
       <div style="margin-top:14px; color:#999999"> {{expression}}</div>
       {{#if support_copy_ans}}
           <div id="calc-copy-msg" style="padding-bottom:17px; padding-top:3px; background-color:white; color:#cccccc"> Click anywhere to copy</div>
           <div id="calc-copied-msg" style="padding-bottom:18px; padding-top:3px; background-color:white; color:#cccccc; display: none"> Copied</div>
        {{else}}
           <div id="calc-copy-msg" style="padding-bottom:17px; padding-top:3px; background-color:white; color:#cccccc"> {{line3}}</div>
        {{/if}}
    </div>
<br style="clear:left"/>
{{/with}}
{{> logo}}
</div>

{{else}}

<div class='cqz-result-h3' style="background-color: white">
{{#with data}}
    <div style="margin-left: 22px; margin-top: 17px">
       <div style="font-size:25px"> {{answer}}</div>
       <div style="margin-top:35px; color:#999999"> {{expression}}</div>
    </div>
<br style="clear:left"/>
{{/with}}
{{> logo}}
</div>
{{/if}}