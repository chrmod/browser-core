<!-- entity-portal -->

<div class="meta">
    {{> logo}}
    <h3 class="meta__url"><a href="{{url}}">{{ data.name }}</a></h3>
</div>

<div class="main mulitple">
{{#each data.news}}
  <div class="item" url="{{ url }}" extra="entry-{{ @index }}" arrow="false">
    <div class="main__image" data-style="background-image: url({{ thumbnail }});">
        Image
    </div>
    <h1 class="main__headline"><a href="{{url}}">{{ title }}</a></h1>
    <span class="main__multiple__time">{{ time }}</span>
  </div>

{{/each}}
</div>

<!--<div class="cqz-result-h1 ez-news cqz-result-padding">
  <div class="cqz-ez-title" selectable=''><a href="{{url}}">{{ data.name }}</a></div>
  <div class="entity-stories">
    {{#each data.news}}
      <div class="entity-story"
           url="{{ url }}"
           extra="entry-{{ @index }}"
           arrow="false">
        <div class="entity-story-image cqz-image-round" data-style="background-image: url({{ thumbnail }})"></div>
        <div class="entity-story-description">
          <div class="entity-story-title"><a href="{{url}}">{{ title }}</a></div>
          <div class="entity-story-comment">{{ time }}</div>
        </div>
      </div>
    {{/each}}
  </div>-->
  {{>EZ-category}}
</div>
