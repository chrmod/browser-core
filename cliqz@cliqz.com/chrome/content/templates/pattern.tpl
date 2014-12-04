<div class='cliqz-pattern-title-container'>
<div class='cliqz-pattern-circle' style='background:{{data.color}}; text-shadow: 0px 0px 0 {{data.darkColor}},1px 1px 0 {{data.darkColor}},2px 2px 0 {{data.darkColor}},3px 3px 0 {{data.darkColor}},4px 4px 0 {{data.darkColor}},5px 5px 0 {{data.darkColor}},6px 6px 0 {{data.darkColor}},7px 7px 0 {{data.darkColor}},8px 8px 0 {{data.darkColor}},9px 9px 0 {{data.darkColor}},10px 10px 0 {{data.darkColor}},11px 11px 0 {{data.darkColor}},12px 12px 0 {{data.darkColor}},13px 13px 0 {{data.darkColor}},14px 14px 0 {{data.darkColor}},15px 15px 0 {{data.darkColor}},16px 16px 0 {{data.darkColor}},17px 17px 0 {{data.darkColor}},18px 18px 0 {{data.darkColor}},19px 19px 0 {{data.darkColor}},20px 20px 0 {{data.darkColor}},21px 21px 0 {{data.darkColor}},22px 22px 0 {{data.darkColor}},23px 23px 0 {{data.darkColor}},24px 24px 0 {{data.darkColor}},25px 25px 0 {{data.darkColor}},26px 26px 0 {{data.darkColor}},27px 27px 0 {{data.darkColor}},28px 28px 0 {{data.darkColor}},29px 29px 0 {{data.darkColor}},30px 30px 0 {{data.darkColor}},31px 31px 0 {{data.darkColor}},32px 32px 0 {{data.darkColor}},33px 33px 0 {{data.darkColor}},34px 34px 0 {{data.darkColor}},35px 35px 0 {{data.darkColor}},36px 36px 0 {{data.darkColor}},37px 37px 0 {{data.darkColor}},38px 38px 0 {{data.darkColor}},39px 39px 0 {{data.darkColor}},40px 40px 0 {{data.darkColor}},41px 41px 0 {{data.darkColor}},42px 42px 0 {{data.darkColor}},43px 43px 0 {{data.darkColor}},44px 44px 0 {{data.darkColor}},45px 45px 0 {{data.darkColor}},46px 46px 0 {{data.darkColor}},47px 47px 0 {{data.darkColor}},48px 48px 0 {{data.darkColor}},49px 49px 0 {{data.darkColor}},50px 50px 0 {{data.darkColor}},51px 51px 0 {{data.darkColor}},52px 52px 0 {{data.darkColor}},53px 53px 0 {{data.darkColor}};'>{{data.letters}}</div>
  <div class='cliqz-pattern-title-text-container'><div class='cliqz-pattern-title-text'>{{ data.title}}</div><div class='cliqz-pattern-title-link'>{{data.url}}</div></div>
</div>
<div class='cliqz-pattern' style='padding-left:61px'>
  <div style="width:{{ width }}px; margin-left: 20px">
    <div style="position:relative;overflow:hidden;">
      <!--<div class='cliqz-pattern-logo {{ logo }}' newtab='false'></div>-->
      <div class='cliqz-pattern-entries'>
        <div class='cliqz-pattern-entry-title'>
          {{#each data.urls}}
            <div class='cliqz-pattern-element' url='{{href}}' type='' extra=''><span style='cursor: pointer;'>{{ title }}</span></div>
          {{/each}}
        </div>
        <div class='cliqz-pattern-entry-link'>
          {{#each data.urls}}
            <div class='cliqz-pattern-element'> {{ link }}</div>
          {{/each}}
        </div>
      </div>
    </div>
  </div>
</div>
