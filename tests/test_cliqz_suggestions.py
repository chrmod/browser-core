# -*- coding: utf-8 -*-
from pytest import fixture


def test_git_suggestion(urlbar):
    res = urlbar('git')
    assert len(res['suggestions']) > 5
    assert len('git') < len(res['autocompletion']['query'])


def test_face_suggestion(urlbar):
    res = urlbar('face')
    assert len(res['suggestions']) > 1


def test_twitter_suggestion(urlbar):
    res = urlbar('twit')

    assert len(res['suggestions']) > 1
    assert res['suggestions'][0]['url'] == 'https://twitter.com'

    assert res['autocompletion']['query'] == 'twitter.com/'
    assert res['autocompletion']['selection_start'] == len('twit')
    assert res['autocompletion']['selection_end'] == len('twitter.com/')



@fixture
def urlbar(mozcmd):
    import json
    from time import sleep

    mozcmd('var c = document.getElementById("urlbar-container");')
    mozcmd('var input = c.childNodes[0].mInputField;')

    def _urlbar(query, reset_value=True):
        sleep(1.)

        mozcmd('input.focus();')

        if reset_value:
            mozcmd('input.setUserInput("");')

        mozcmd('input.setUserInput("{}");'.format(query))
        sleep(1.)
        mozcmd('''
            function suggestionAttrs(el) {
                return {
                    image: el.getAttribute('image'),
                    url: el.getAttribute('url'),
                    title: el.getAttribute('title'),
                    type: el.getAttribute('type'),
                    text: el.getAttribute('text'),
                    class: el.getAttribute('class'),
                    source: el.getAttribute('source'),
                    collapsed: el.getAttribute('collapsed')
                };
            };

            var popup = document.getElementById('PopupAutoCompleteRichResult');
            var suggestions = popup.richlistbox.childNodes;
            suggestions = Array.prototype.map.call(suggestions, suggestionAttrs);

            var suggestion_res = JSON.stringify([suggestions, [input.value, input.selectionStart, input.selectionEnd]])
        ''')

        suggestion_res = mozcmd('suggestion_res').strip()[1:-1];
        suggestions, autocompletion = json.loads(suggestion_res)

        autocompletion, selection_start, selection_end = autocompletion

        return {
            'query': query,
            'suggestions': suggestions,
            'autocompletion': {
                'query': autocompletion,
                'selection_start': selection_start,
                'selection_end': selection_end
            }
        }

    return _urlbar


@fixture
def mozcmd(request):
    from telnetlib import Telnet

    conn = Telnet('127.0.0.1', 4242)
    conn.read_until(match='repl>', timeout=2)

    def _mozcmd(cmd, debug=False):
        if debug:
            print('repl>%s' % cmd.encode())

        conn.write(b'%s\n' % cmd.encode())
        out = conn.read_until(match='repl>', timeout=2)
        out = out.lstrip()
        out = out[:-len(' \nrepl>')]

        if debug:
            print out

        return out

    request.addfinalizer(conn.close)

    return _mozcmd
