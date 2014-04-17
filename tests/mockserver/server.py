import json

from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route('/')
def home():
    if request.method == 'GET':
        return 'Cliqz-Results Mock Server\n'
    else:
        #logging system call
        return jsonify(success=True)


@app.route('/api/cliqz-results')
def cliqz_results():
    q = request.values.get('q', '')

    if q.startswith('face'):
        res = {
            "result": [
                {
                    "snippet": {
                        "q": "face",
                        "snippet": "Willkommen bei Facebook",
                        "title": "Willkommen bei Facebook",
                        "url": "https://www.facebook.com/"
                    },
                    "url": "https://www.facebook.com/"
                }
            ]
        }
    elif q.startswith('google'):
        res = []
    else:
        res = []

    return jsonify(res)


@app.route('/complete/search')
def suggestions():
    q = request.values.get('q', '')
    return json.dumps([q,['one', 'three', 'two']])


if __name__ == '__main__':
    import sys
    import os.path
    from OpenSSL import SSL

    def rel_loc(file_name):
        current_dir = os.path.dirname(__file__)
        return os.path.join(current_dir, file_name)

    context = SSL.Context(SSL.SSLv23_METHOD)
    context.use_privatekey_file(rel_loc('google.key'))
    context.use_certificate_file(rel_loc('google.cert'))

    port = int(sys.argv[1])

    if port == 80:
        app.run(host='0.0.0.0', port=80, debug=True)

    if port == 443:
        app.run(host='0.0.0.0', port=443, debug=True, ssl_context=context)
