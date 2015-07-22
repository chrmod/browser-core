<div class="showtimes-date">
  <b>{{local display_date.day_of_week}}, {{display_date.day_of_month}}. {{local display_date.month}}</b>
</div>
<table class="cinema-showtimes-table">
  {{#each cinemas}}
    <tr class="cinema-row">
      <td  class="cinema-name-td">
        <a class="cinema-name cqz-url" {{#if cinema.website}} url="{{cinema.website}}" {{/if}} href="{{cinema.website}}">{{cinema.name}}</a>
      </td>
      {{#each showtimes}}
        <td class="cinema-showtime-td" {{#if booking_link }} url="{{booking_link}}" {{/if}}>
          <span class="cinema-showtime">{{time}}</span>
        </td>
      {{/each}}
      {{#for showtimes.length ../table_size 1}}
        <td class="cinema-showtime-td" >
          <span class="cinema-showtime"> </span>
        </td>
      {{/for}}
    </tr>
  {{/each}}
</table>
