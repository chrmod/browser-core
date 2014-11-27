<div class='cliqz-inline-box-children cliqz-pattern'>
  <div class='cliqz-result-mid-box' style="width:{{ width }}px; margin-right: 32px">
    <div style='margin-bottom:10px;'>
      <span class="cliqz-pattern-title overflow">
        {{ data.title}} <span class='cliqz-pattern-entry-link' style='font-size: 16px'>- {{data.url}}</span>
      </span>
      <br style="clear:both"/>
    </div>
    <div style="position:relative;">
      <div class='cliqz-pattern-logo {{ logo }}' newtab='false'></div>
      <div class='overflow cliqz-cluster-result-topic'>
        {{#each data.urls}}
          <div
              style="margin-bottom: 4px"
              url='{{href}}'
              type=''
              extra=''
              class=""
              >
                <span class='cliqz-pattern-entry-title'>{{ title }}</span> <span class='cliqz-pattern-entry-link'> - {{ link }}</span>
          </div>
        {{/each}}
      </div>
    </div>
  </div>
</div>
