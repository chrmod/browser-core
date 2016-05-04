<!-- topsites.tpl -->

{{#if list}}

  <div class="main" style="margin-bottom: 20px;">
    <table>
      <tr>
        {{#each list}}
            <td align="center" valign="top">
                <div class="blockTopsite" url="{{mainDomain}}" {{#unless ../isEditMode}} style="display: none;" {{/unless}}>X</div>
                <div class="topSitesLink" url="{{baseDomain}}">
                    <div class="topsites__item"
                     style="{{style}}"
                     show-status=""
                     extra="{{extra}}"
                     >{{ text }}
                    </div>
                </div>
              </div>
            {{else}}
              <div class="topsites__item" style="background-color:#eee"></div>
            {{/if}}
          </td>
      {{/each}}
     </tr>
    </table>

    <div id="doneEditTopsites" {{#unless isEditMode}} style="display: none;" {{/unless}}>{{local 'mobile_freshtab_edit_done'}}</div>
  </ul>
</div>
{{/if}}
{{#if isEmpty}}
  {{#unless isEditMode}}
    <div class="noTopsites">{{local 'mobile_freshtab_no_topsites'}}</div>
  {{/unless}}
{{/if}}
<!-- end topsites.tpl -->
