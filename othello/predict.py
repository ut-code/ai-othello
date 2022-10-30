import tensorflow as tf
import numpy as np


from flask import Flask, render_template
from flask import request

app = Flask(__name__)
model = tf.keras.models.load_model('./my_model')


def checkPut(x, y, data):
    color = 1
    opponentColor = -1
    # 周囲8方向を調べる配列
    direction = [
        [-1, 0],  # 左
        [-1, 1],  # 左下
        [0, 1],  # 下
        [1, 1],  # 右下
        [1, 0],  # 右
        [1, -1],  # 右上
        [0, -1],  # 上
        [-1, -1]  # 左上
    ]

    # すでに置いてある
    if data[y][x] != 0:
        return False

    # 置いた石の周りに違う色の石があるかチェック
    for i in range(len(direction)):
        dx = direction[i][0] + x
        dy = direction[i][1] + y
        if dx >= 0 and dy >= 0 and dx <= 8 - 1 and dy <= 8 - 1 and data[dy][dx] == opponentColor:
            # 裏返せるかチェック
            while True:
                dx += direction[i][0]
                dy += direction[i][1]
                if dx < 0 or dy < 0 or dx > 8 - 1 or dy > 8 - 1 or data[dy][dx] == 0:
                    break
                if color == data[dy][dx]:
                    return True

    return False


@app.route('/', methods=['GET'])
def index():
    if request.method == 'GET':
        return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    if request.method == 'POST':
        data = request.json
        # 置いたマスの周囲8方向をチェック
        check_list = []
        for i in range(8):
            for j in range(8):
                if not checkPut(i, j, data):
                    check_list.append([i,j])
        
        data_b = []
        data_w = []
        for row in data:
            row_b = []
            row_w = []
            for i in range(len(row)):
                if row[i] == -1:
                    row_b.append(0)
                    row_w.append(1)
                elif row[i] == 0:
                    row_b.append(0)
                    row_w.append(0)
                if row[i] == 1:
                    row_b.append(1)
                    row_w.append(0)
            data_b.append(row_b)
            data_w.append(row_w)
        board_data = np.array([[data_b, data_w]], dtype=np.int8)
        predicted = model.predict(board_data)
        for c in check_list:
            predicted[0][c[1]*8 + c[0]] = 0
        return [int(np.argmax(predicted))]


if __name__ == "__main__":
    app.run(debug=True, port=8888, threaded=True)
