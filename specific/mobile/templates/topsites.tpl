<!-- topsites.tpl -->
{{debug}}
{{#if this}}

  <div class="main" style="margin-bottom: 20px;">
    <table>
      <tr>
        {{#each this}}
            <td align="center" valign="top">
                <div 
                 onclick="osBridge.openLink('{{baseDomain}}')"
                 style="{{style}}"
                 show-status=""
                 extra="{{extra}}"
                 url="{{baseDomain}}"
                 >{{ text }}
                </div>
                <a class="topSitesLink" data-index="{{@index}}" 
                  onclick="osBridge.openLink('{{baseDomain}}')">
                    {{ domain }}
                </a>
            </td>
        {{/each}}
       </tr>
      </table>
    </ul>
  </div>
{{/if}}
<!-- end topsites.tpl -->
