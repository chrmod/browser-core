<!-- conversations.tpl -->

<div class="main">
    <div class='cqz-result-title overflow' arrow-override=''>
        <h1 class="main__headline">
            <!-- <a extra="title">THE PAST</a> -->
        </h1>
    </div>
    <div class="main__content history">
        {{#each data}}
            {{#if url}}

            <table cellspacing="0" cellpadding="0" class="answer" onclick="osBridge.openLink('{{url}}')"
                   data-timestamp={{ timestamp }} data-index="{{@index}}">
                <tr>
                    <td class="framer">
                        <p>{{title}}</p>
                        <p class="url">{{domain}}</p>
                    </td>
                    <td class="meta">
                        <div>{{conversationsTime timestamp}}</div>
                        <!--<div class="date">{{conversationsDate timestamp}}</div>-->
                    </td>
                </tr>
            </table>

            {{else}}

                {{#if query}}

                <table cellspacing="0" cellpadding="0" class="question" onclick="osBridge.notifyQuery('{{query}}');"
                       data-timestamp={{ timestamp }} data-index="{{@index}}">
                    <tr>
                        <td class="meta">
                            <div>{{conversationsTime timestamp}}</div>
                            <!--<div class="date">{{conversationsDate timestamp}}</div>-->
                        </td>
                        <td class="framer">
                            <p class="query">{{query}}</p>
                        </td>
                    </tr>
                </table>

                {{else}}

                <h2><span>{{../date}}</span></h2>

                {{/if}}

            {{/if}}
        {{/each}}
        
        <div class="nohistoryyet">
			<p>Bisher hast du noch nach nichts gesucht und keine Seiten besucht. </p>
			<p>Sobald du das getan hast werde ich alles für dich bereit halten, falls du wieder zurück willst.</p>
		</div>
        
    </div>
</div>

<div style="clear:both;"></div>
<div id="search" style="display:none">
    <input id="search_input" type="text" placeholder="Filtern nach..." />
</div>

<!-- end conversations.tpl -->
