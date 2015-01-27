<div class="cqz-result-h1 cqz-result-padding">
  <div class="cqz-ez-title cqz-ez-video-title">
      {{data.name}}
  </div>
  <div class='cqz-ez-btns'>
      {{#each data.categories}}
        <div
          class="cqz-ez-btn"
          style="background-color: #EFEFEF; color: black"
          url="{{ this.url }}"
          extra="entity-video-category-{{ @index }}">
          {{ this.title }}
        </div>
      {{/each}}
  </div>
  <div class="entity-video-stories">
    {{#each data.items}}
      <div class="entity-video-story"
           url="{{ this.link }}" type="X" extra="entity-video-story-{{ @index }}">
        <div class="entity-video-story-image"
          style="background-image: url({{ this.thumbnail }})">
               <span> {{ sec_to_duration duration}}</span>
        </div>
        <div class="entity-video-story-description cqz-vert-center">
          <div class="entity-video-story-title">
            {{ this.title }}
          </div>
          <div class="entity-video-story-time">
            {{ local_number this.views }} views
          </div>
        </div>
      </div>
    {{/each}}
  </div>
</div>