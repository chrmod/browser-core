{{#with data}}
<div id='music_btn_region'>
    <div class="music-btns-container">

        {{#if music.lyrics}}
        <div class="music-btns-wrapper">
            <span class="music-label">{{music.text.lyrics_label}}</span>
            <ul class="music-btns">
            {{#each music.lyrics}}
                <li class="music-btn"
                        url="{{ url }}"
                        extra="{{ domain }}" arrow="false" arrow-if-visible="true"
                >
                    <span class="music-btn-text" style="background-color: {{ generate_background_color url }}">{{ domain }}</span>
                </li>
            {{/each}}
            </ul>
        </div>
        {{/if}}

        {{#if music.streaming}}
        <div class="music-btns-wrapper">
            <span class="music-label">{{music.text.streaming_label}}</span>
            <ul class="music-btns">
            {{#each music.streaming}}
                <li class="music-btn"
                        url="{{ url }}"
                        extra="{{ domain }}" arrow="false" arrow-if-visible="true"
                >
                    {{#if img}}
                        <img class="music-btn-img" src="{{ img }}" alt="{{ domain }}" onerror="this.style.display='none';"/>
                    {{else}}
                        <span class="music-btn-text" style="background-color: {{ generate_background_color url }}">{{ domain }}</span>
                    {{/if}}
                </li>
            {{/each}}
            </ul>
        </div>
        {{/if}}

    </div>
</div>
{{/with}}
