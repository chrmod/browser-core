import flask

app = flask.Flask(__name__)


@app.route('/')
def home():
    return 'Cliqz-Results Mock Server\n'


@app.route('/api/cliqz-results')
def sucess():
    q = flask.request.args.get('q', '')

    if q.startswith('face'):
        res = []
    elif q.startswith('google'):
        res = []
    else:
        res = []

    return flask.jsonify(res)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)
