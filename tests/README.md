1. Install [MozRepl plugin](https://addons.mozilla.org/en-US/firefox/addon/mozrepl/)
2. Configure autostart option Tools > MozRepl > Activate on startup
3. Restart FF

```shell
cd navigation-extension/tests

# this will install some python packages required for testings
pip install -r pip-requirements

# Run command and quickly swith to FF (ugly for now, but will fix this later)
py.test test_cliqz_suggestions.py

# Relax and wait - tests are slow to now...
```

Known issues:

- Very slow - will fix this later
- Suggestions depend on your browser's history - we have to find a way to put FF profile's history in some initial state - otherwise tests will be not determenistic - this sucks!
- FF must be started and brought in focus manually - will fix this later
- FF must have a tab opened



### IGNORE THIS TELNET MOZREPL HACKING FOR NOW


```shell
'''
var ctx = []
setTimeout(function() { input.setUserInput("git"); }, 3000);
setTimeout(function() { ctx.push(document.getElementById("PopupAutoCompleteRichResult").richlistbox.childNodes); });

function suggestionAttrs(el, i) {
    return {
        image: el.getAttribute('image'),
        url: el.getAttribute('url'),
        title: el.getAttribute('title'),
        type: el.getAttribute('type'),
        text: el.getAttribute('text'),
        class: el.getAttribute('class'),
        source: el.getAttribute('source'),
        collapsed: el.getAttribute('collapsed')
    }
};

var suggestions = ctx[0]
suggestions = Array.prototype.map.call(ctx[0], suggestionAttrs);
suggestions = JSON.stringify(suggestions);



repl> ctx[0][0].outerHTML
"<richlistitem xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul" image="null" url="https://github.com/bard/mozrepl/wiki/Tutorial" title="Tutorial · bard/mozrepl Wiki · GitHub (top History Domain)" type="favicon" text="git" class="autocomplete-richlistitem" source="history"/>"
"<richlistitem xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul" image="null" url="git tutorial" title="Suchergebnisse für " type="cliqz-suggestions" text="git" class="autocomplete-richlistitem" source="cliqz-suggestions" collapsed="true"/>"
repl> ctx[0][0].getAttribute('title')
"Tutorial · bard/mozrepl Wiki · GitHub (top History Domain)"
repl> ctx[0][0].getAttribute('xxx')


Array.prototype.map.call(ctx[0], function() {return 1;})

'''
```