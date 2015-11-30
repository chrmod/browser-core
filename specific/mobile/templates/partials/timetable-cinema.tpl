<!-- partials/timetable-cinema -->
<h5 class="cinema-showtimes-headline">{{local display_date.day_of_week}}, {{display_date.day_of_month}}. {{local display_date.month}}</h5>
<table class="cinema-showtimes-table">
    {{#each cinemas}}
        <tr class="cinema-row">
            <td class="cinema-name-td">
                <a class="cinema-name cqz-url"
                 {{#if cinema.website}}
                   url="{{cinema.website}}"
                   show-status='true'
                   href="{{cinema.website}}"
                 {{/if}}
                 extra="movieSC_cinema_name">
                   {{cinema.name}}
                </a> {{distance cinema.distance}}
            </td>
            <td class="cinema-showtime-td">
            {{#each showtimes}}
                
                    {{#if booking_link }}
                        <span class="cinema-showtime" show-status='true' url="{{booking_link}}">
              <a extra="movieSC_show_time" class="cqz-url" href="{{booking_link}}" show-status='true'>{{time}}</a>
            </span>
                    {{else}}
                        <span class="cinema-showtime">{{time}}</span>
                    {{/if}}

                
            {{/each}}
            </td>
            {{#repeat num_empty_columns}}
                <td class="cinema-showtime-td">
                    <span class="cinema-showtime"> </span>
                </td>
            {{/repeat}}
        </tr>
    {{/each}}
</table>
<!-- end partials/timetable-cinema -->