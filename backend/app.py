from flask import Flask, jsonify

app = Flask(__name__)

game_state = {
    "board": [],
    "history": []
}

@app.route('/api/state')
def get_state():
    return jsonify(game_state)

if __name__ == '__main__':
    app.run(debug=True)
