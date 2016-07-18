<!--<div id="cliqz-results">-->
<div class="{{ data.livetickerSizeClass }} cqz-liveticker cqz-ez-holder cqz-ez-generic">
        <div class="cqz-zone-holder">
            <div class="cqz-ez-title" selectable='' extra="title">
                <a href="{{../url}}" extra="title"> {{ data.title }}  </a>
            </div>
            <div class="cqz-result-url overflow" extra="url">
                {{ emphasis urlDetails.friendly_url text 2 true }}
            </div>

            <div class="cqz-liveticker-table">
                <span class="cqz-vertical-title">{{ data.spielTag }}</span>
                <ul>
                    {{#each data.matches }}
                        <li>
                            <span class="cqz-game-date">{{ this.date }}</span>
                            <table>
                                {{#each this.matches }}
                                    <tr class="{{ this.class }}" href="{{ this.live_url }}">
                                        <td class="cqz-game-time">
                                            {{ this.gameTimeHour }}
                                        </td>
                                        <td>
                                            {{ this.GUESS }}
                                        </td>
                                        <td class="cqz-score">
                                            {{ this.scored }}
                                        </td>
                                        <td>
                                            {{ this.HOST }}
                                        </td>
                                    </tr>
                                {{/each}}
                            </table>
                        </li>
                    {{/each}}
                </ul>
            </div>
        </div>
    {{>logo}}
</div>

<div class="poweredby">
    <div url="http://www.kicker.de/?gomobile=1">{{local 'KickerSponsor'}}</div>
</div>

<!--</div>-->
