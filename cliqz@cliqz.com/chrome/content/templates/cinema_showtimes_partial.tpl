<table class="cinema-showtimes-table">
    <tr class="cinema-row">
        <th class="showtimes-date" colspan="0">
            {{local display_date.day_of_week}}, {{display_date.day_of_month}}. {{local display_date.month}}
        </th>
    </tr>
    {{#each cinemas}}
        <tr class="cinema-row">
            <td class="cinema-name-td">
                <a class="cinema-name cqz-url"
                    {{#if cinema.website}} url="{{cinema.website}}" show-status='true'
                   href="{{cinema.website}}" {{/if}}>{{cinema.name}}</a>
            </td>
            {{#each showtimes}}
                <td class="cinema-showtime-td">
                    {{#if (logic bookable '!=' 'no') }}
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
