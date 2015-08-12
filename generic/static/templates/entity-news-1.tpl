<div class="ez">
    
  <div class="meta">
      {{> logo}}
      <h3 class="meta__url"><i class="fa fa-mobile mobile"></i>
          <span>{{ data.news.0.time }}</span>&nbsp;&nbsp;·&nbsp;&nbsp;
          <a href="{{url}}">{{ emphasis data.name text 2 true }}</a></h3>
  </div>
  
  <div class="main">
  {{#each data.news}}
      <div class="main__image" style="background-image: url({{ thumbnail }});">
          Image
      </div>
      <h1 class="main__headline"><a href="{{url}}">{{ title }}</a></h1>
      {{!--<p class="main__content">{{ emphasis data.description text 2 true }}</p> --}}
  </div>
  {{/each}}
  
  {{>EZ-category}}
</div>
