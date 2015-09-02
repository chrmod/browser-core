<div class="cqz-movie-playing">
    {{local 'now_playing_in_cinema'  }}
</div>
<table class="cinema-showtimes-table">
    <tr>
        <th class="showtimes-date" colspan="0">
            {{local display_date.day_of_week}}, {{display_date.day_of_month}}. {{local display_date.month}}
        </th>
    </tr>
    {{#each movies }}
        <tr class="cinema-row">
            <td class="cinema-name-td">
                <a class="cinema-name cqz-url"
                    {{#if movie.website}} url="{{movie.website}}"
                   show-status='true'
                   href="{{ movie.website }}" {{/if}}
                >
                    {{ movie.name }}
                </a>
            </td>

            {{#each showtimes }}
                <td class="cinema-showtime-td">
                    {{#if booking_link }}
                        <span class="cinema-showtime" show-status='true' url="{{booking_link}}">
                            <a class="cqz-url" href="{{booking_link}}" show-status='true'>{{time}}</a>
                        </span>
                    {{else}}
                        <span class="cinema-showtime">{{time}}</span>
                    {{/if}}

                </td>
            {{/each}}
            {{#for showtimes.length ../table_size 1}}
                <td class="cinema-showtime-td">
                    <span class="cinema-showtime"> </span>
                </td>
            {{/for}}
        </tr>
    {{/each}}
</table>
