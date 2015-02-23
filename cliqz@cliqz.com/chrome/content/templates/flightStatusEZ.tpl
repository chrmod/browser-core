<div class='cqz-result-h2' style="margin-left: 22px">

{{#with data}}
     <div style="color:#999999; font-size: 18px; padding-top:14px">
         {{flight_name}}
         <span style="color:{{status_color}}; font-size:18px;"> ({{status}})</span>
     </div>

   <div style="background-color: white; height: 30px; padding-top:12px">
       <div style="float:left; font-size: 18px"> {{depart_arrive.0.fsCode}} </div>
       <div style="float:left; height:2px; margin-top: 8px; margin-left: 10px;  width:{{math '405' '*' plane_position}}px; background-color:green"></div>
       <img src="{{plane_icon}}" style="float:left; width: 35px; background:white; margin-top:-9px; margin-left:0px"/>
       <div style="float:left; height:2px; margin-top: 8px; margin-right: 10px; width:{{math '405' '*' plane_position_left}}px; background-color:#999999"> </div>

       <div style="float:left; font-size: 18px"> {{depart_arrive.1.fsCode}} </div>
   </div>

    <div style="padding-top: 2px; background-color: white; color:#999999; clear:left">
         <div style="float: left">
          <div > {{depart_arrive.0.location_name}} </div>
          <div style="padding-top: 4px"> {{depart_arrive.0.estimate_actual_date}} </div>
          <div style="float:left; height:1px; margin-top: 4px; margin-left: 0px; margin-right: 10px; margin-bottom: 5px; width:220px;background-color:#cccccc"></div>
          <div style="margin-top:4px"> Scheduled: {{depart_arrive.0.scheduled_time}}</div>
          <div style="margin-top:4px">
          <span style="margin-right: 10px; font-size:18px; color: black">{{depart_arrive.0.estimate_actual_time}}</span>
          <span style="margin-right: 10px">Terminal: {{depart_arrive.0.terminal}}</span>
          <span style="margin-right: 0px">Gate: {{depart_arrive.0.gate}}</span>
          </div>

         </div>

         <div style="float: left; margin-left: 110px; text-align:left">
                   <div > {{depart_arrive.1.location_name}} </div>
          <div style="padding-top: 4px"> {{depart_arrive.1.estimate_actual_date}} </div>
          <div style="float:left; height:1px; margin-top: 4px; margin-left: 0px; margin-right: 10px; margin-bottom: 5px; width:190px;background-color:#cccccc"></div>
          <div style="margin-top:4px"> Scheduled: {{depart_arrive.1.scheduled_time}}</div>
          <div style="margin-top:4px">
          <span style="margin-right: 10px; font-size:18px; color: black">{{depart_arrive.1.estimate_actual_time}}</span>
          <span style="margin-right: 10px">Terminal: {{depart_arrive.1.terminal}}</span>
          <span style="margin-right: 0px">Gate: {{depart_arrive.1.gate}}</span>
         </div>
         </div>
    </div>

   <div style="clear:left; color:#999999; text-align:center; width:500px; padding-top:10px"> {{flight_duration}}</div>

{{/with}}

</div>
