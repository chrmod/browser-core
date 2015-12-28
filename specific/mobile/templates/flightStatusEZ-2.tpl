<!-- flightStatusEZ -->
<div class='cqz-result-h2'>

{{#with data}}
    <div class="meta">
        {{> logo}}
        <h3 class="meta__url">{{status_detail}}</h3>
    </div>

    <div class="main">
        <h1 class="main__headline">{{flight_name}}</h1>
        <div class="flightStatusEZ-flightStatus" style="color:{{status_color}}">{{status}}</div>
    </div>

   <div class="flightStatusEZ-plane-position">
       <img class="flightStatusEZ-plane-position-plane-img" data-src="{{plane_icon}}" />
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

{{/with}}

</div>

<div class="poweredby">
    More details at <a href="http://www.flightstats.com">Flightstats</a>
</div>
