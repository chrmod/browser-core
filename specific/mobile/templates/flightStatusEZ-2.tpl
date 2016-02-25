<!-- flightStatusEZ -->
{{debug}}
{{#with logo}}
	<div class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
 {{/with}}
{{#with data}}
    <section class="primary">

        <h1 class="card__title">
           {{flight_name}}
        </h1>

        <div class="card__meta">
            <div class="flightStatusEZ-flightStatus" style="color:{{status_color}}">{{status}}</div>
            {{status_detail}}
        </div>

    </section>

    <section class="card__description">
       <div class="flightStatusEZ-plane-position">
           <img class="flightStatusEZ-plane-position-plane-img" style="left:{{plane_position}}%" data-src="{{plane_icon}}" />
           <div class="flightStatusEZ-plane-position-bar">
               <div class="flightStatusEZ-plane-position-dot" style="left:{{plane_position}}%; background:{{status_color}}"></div>
           </div>
       </div>

        <div class="flightStatusEZ-depart-arrival cf">
             <div class="flightStatusEZ-depart">
              <div class="flightStatusEZ-depart-arrival-name"> {{depart_arrive.0.location_name}} </div>
              <div style="color: {{depart_arrive.0.time_color}}">{{depart_arrive.0.estimate_actual_time}}</div>
              <div> {{depart_arrive.0.estimate_actual_date}} </div>
              <div>{{local 'Terminal'}} {{depart_arrive.0.terminal}}</div>
              <div>{{local 'Gate'}} {{depart_arrive.0.gate}}</div>
             </div>

             <div class="flightStatusEZ-arrival" style="float:right; ">
              <div class="flightStatusEZ-depart-arrival-name"> {{depart_arrive.1.location_name}} </div>
              <div style="color: {{depart_arrive.1.time_color}}">{{depart_arrive.1.estimate_actual_time}}</div>
              <div> {{depart_arrive.1.estimate_actual_date}} </div>
              <div>{{local 'Terminal'}} {{depart_arrive.1.terminal}}</div>
              <div>{{local 'Gate'}} {{depart_arrive.1.gate}}</div>
             </div>
        </div>
    

    <div class="poweredby">
        Mehr auf <a href="http://www.flightstats.com">Flightstats</a>
    </div>
</section>
{{/with}}


