<div class="entity-search-container">
  <!--
  <div class="entity-search-aktuell">
    Aktuell: <span>Ebola</span> <span>Apple Inc.</span> <span>Police</span>
             <span>Tropical cyclones</span> <span>Vladimir Putin</span>
  </div>
  -->
  <div>
    <div id="entity-search-box">
      <img id="entity-search-box-icon" src="chrome://cliqzres/content/skin/entity_zones/g_search.png" />
      <input dont-close="true" type="text" id="entity-search-box-input"
       onkeydown="if(event.keyCode==13)
                  { openUILink('https://www.google.com/search?q=' + this.value);
                    CLIQZ.Core.forceCloseResults = true;
                    CLIQZ.Core.popup.hidePopup();
                    event.preventDefault();}"/>
    </div>
  </div>
  <div>
    <div class="entity-search-container-app" style="background-color: #A2D5E8;"
         url="https://mail.google.com/" type="entity-search-gmail">
      <div><img src="chrome://cliqzres/content/skin/entity_zones/gmail.png" /></div>
      <div class="entity-search-container-app-text" style="background-color: #83C0D5;">Gmail</div>
    </div>
    <div class="entity-search-container-app" style="background-color: #FD655A;"
         url="https://www.google.com/calendar/" type="entity-search-calendar">
      <div><img src="chrome://cliqzres/content/skin/entity_zones/calendar.png" /></div>
      <div class="entity-search-container-app-text" style="background-color: #ED4E3B;">Calendar</div>
    </div>
    <div class="entity-search-container-app" style="background-color: #FEE155"
         url="https://maps.google.de/" type="entity-search-maps">
      <div><img src="chrome://cliqzres/content/skin/entity_zones/maps.png" /></div>
      <div class="entity-search-container-app-text" style="background-color: #FAC30E;">Maps</div>
    </div>
    <div class="entity-search-container-app" style="background-color: #FE9965;"
         url="https://news.google.de/" type="entity-search-news">
      <div><img src="chrome://cliqzres/content/skin/entity_zones/news.png" /></div>
      <div class="entity-search-container-app-text" style="background-color: #F57037;">News</div>
    </div>
    <div class="entity-search-container-app" style="background-color: #94E1BF;"
         url="https://www.youtube.de/" type="entity-search-youtube">
      <div><img src="chrome://cliqzres/content/skin/entity_zones/youtube.png" /></div>
      <div class="entity-search-container-app-text" style="background-color: #6BCC9F;">YouTube</div>
    </div>
  </div>
</div>
