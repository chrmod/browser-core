<div class="meta">
    {{> logo}}
    <h3 class="meta__url">
        <span>{{data.name}}</span></h3>
</div>

<div class="cqz-result-h1 cqz-result-padding ez-video main mulitple">
    {{#each data.items}}
    
        <div class="item">
          <div class="main__image" style="background-image: url({{ thumbnail }})">
              {{#if (sec_to_duration duration)}}<span> {{ sec_to_duration duration}}</span>{{/if}}
          </div>
          <h1 class="main__headline"><a href="{{link}}">{{ title }}</a></h1>
          <!--<div class="main__meta">{{ views_helper views}}</div>-->
        </div>

    {{/each}}
</div>
{{>EZ-category}}
