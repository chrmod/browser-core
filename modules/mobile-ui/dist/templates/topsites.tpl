<!-- topsites.tpl -->

{{#if this}}

  <div class="main" style="margin-bottom: 20px;">
    <table>
      <tr>
        {{#each this}}
            <td align="center" valign="top">
                <div
                 onclick="osAPI.openLink('{{baseDomain}}')"
                 style="{{style}}"
                 show-status=""
                 extra="{{extra}}"
                 url="{{baseDomain}}"
                 >{{ text }}
                </div>
                <a class="topSitesLink" data-index="{{@index}}"
                  onclick="osAPI.openLink('{{baseDomain}}')">
                    {{ mainDomain }}
                </a>
            </td>
        {{/each}}
       </tr>
      </table>
    </ul>
  </div>
{{/if}}
<!-- end topsites.tpl -->
