<div class='cqz-result-h2 cqz-result-padding cqz-noresult-box'>
    {{#with data}}
        <div class="cqz-ez-title custom-after cqz-ez-generic-title" extra="title">
            {{ title }}
        </div>
        <div class="ez-no-result">
            <ul class="cqz-suggestion-list">
                {{#each urls}}
                    <li class="cqz-item"
                        url="{{url}}"
                        extra="{{extra}}"
                    >
                        <div class="cliqz-brand-logo transition"
                             style="{{style}}"
                             show-status=""
                             url="{{url}}"
                        >
                            {{ text }}
                        </div>
                        <span class="item-name">{{nameify name}}</span>
                    </li>
                {{/each}}
            </ul>
            <p>
                <img class="cliqz-logo" src="{{cliqz_logo}}" url="https://cliqz.com" />
            </p>
        </div>
    {{/with}}
</div>