from math import sqrt
import tensorflow as tf
import numpy as np
from flask import Flask, render_template
from flask import request

app = Flask(__name__)

# ====================
# モンテカルロ木探索の作成
# ====================

# パッケージのインポート

# パラメータの準備
PV_EVALUATE_COUNT = 50  # 1推論あたりのシミュレーション回数（本家は1600）
DN_INPUT_SHAPE = (5, 5, 2)

# その他の定数
BLACK = 1
WHITE = -1
# ニュートリーコの作成

# ゲームの状態
class State:
    # 初期化
    def __init__(self, pieces=None, enemy_pieces=None, cnt=0):
        # 石の配置
        if pieces == None:
            self.pieces = [0] * 25
            self.pieces[7] = 1
            self.pieces[21] = 1
            self.pieces[23] = 1
        else:
            self.pieces = pieces
        if enemy_pieces == None:
            self.enemy_pieces = [0] * 25
            self.enemy_pieces[1] = 1
            self.enemy_pieces[3] = 1
            self.enemy_pieces[17] = 1
        else:
            self.enemy_pieces = enemy_pieces
        self.cnt = cnt    # ターン数(100になったら引き分け)

    # 負けかどうか
    def is_lose(self):
        # 相手の駒が3並びかどうか
        def is_comp(y, x, dy, dx):
            for k in range(3):
                if y < 0 or 4 < y or x < 0 or 4 < x or self.enemy_pieces[x+y*5] == 0:
                    return False
                x, y = x+dx, y+dy
            return True

        # 負けかどうか
        for i in range(3):
            for j in range(3):
                if is_comp(i, j, 1, 1) or is_comp(i, j, 0, 1) or is_comp(i, j, 1, 0):
                    return True
        for i in range(3):
            for j in range(3, 5):
                if is_comp(i, j, 1, 0) or is_comp(j, i, 0, 1):
                    return True
        for i in range(3):
            for j in range(2, 5):
                if is_comp(i, j, 1, -1):
                    return True
        return False

    # 引き分けかどうか
    def is_draw(self):
        return self.cnt >= 100

    # ゲーム終了かどうか
    def is_done(self):
        return self.is_lose() or self.is_draw()

    # 次の状態の取得
    def next(self, action):
        position = self.action_to_position(action)
        pieces = self.pieces.copy()
        pieces[position[0]] = 0
        pieces[position[1]] = 1
        return State(self.enemy_pieces, pieces, self.cnt+1)

    def position_to_action(self, y, x, dy, dx):
        return (x+y*5)*9 + (dy+1)*3 + (dx+1)

    def action_to_position(self, action):
        y = (action // 9) // 5
        x = (action // 9) % 5
        dy = (action % 9) // 3 - 1
        dx = (action % 9) % 3 - 1
        tx = x
        ty = y
        while (True):
            if ty+dy >= 0 and 4 >= ty+dy and tx+dx >= 0 and 4 >= tx+dx and self.pieces[tx+dx+(ty+dy)*5] == 0 and self.enemy_pieces[tx+dx+(ty+dy)*5] == 0:
                tx, ty = tx+dx, ty+dy
            else:
                break
        if x != tx or y != ty:
            return [x+y*5, tx+ty*5]

    # 合法手のリストの取得
    def legal_actions(self):
        actions = []
        dir = [[0, 1], [1, 0], [1, 1], [-1, 1]]
        for i in range(25):
            if self.pieces[i] == 1:
                def find_and_append(y, x, dy, dx, actions):
                    if y+dy >= 0 and 4 >= y+dy and x+dx >= 0 and 4 >= x+dx and self.pieces[x+dx+(y+dy)*5] == 0 and self.enemy_pieces[x+dx+(y+dy)*5] == 0:
                        actions.append(self.position_to_action(y, x, dy, dx))
                for d in dir:
                    find_and_append(i // 5, i % 5, d[0], d[1], actions)
                    find_and_append(i // 5, i % 5, -d[0], -d[1], actions)
        return actions

    # 先手かどうか
    def is_first_player(self):
        return self.cnt % 2 == 0

    # 文字列表示
    def __str__(self):
        ox = ('o', 'x') if self.is_first_player() else ('x', 'o')
        str = ''
        for i in range(25):
            if self.pieces[i] == 1:
                str += ox[0]
            elif self.enemy_pieces[i] == 1:
                str += ox[1]
            else:
                str += '-'
            if i % 5 == 4:
                str += '\n'
        return str

# 推論
def predict(model, state):
    # 推論のための入力データのシェイプの変換
    a, b, c = DN_INPUT_SHAPE
    x = np.array([state.pieces, state.enemy_pieces])
    x = x.reshape(c, a, b).transpose(1, 2, 0).reshape(1, a, b, c)

    # 推論
    y = model.predict(x, batch_size=1, verbose=0)

    # 方策の取得
    policies = y[0][0][list(state.legal_actions())]  # 合法手のみ
    policies /= sum(policies) if sum(policies) else 1  # 合計1の確率分布に変換

    # 価値の取得
    value = y[1][0][0]
    return policies, value

# ノードのリストを試行回数のリストに変換
def nodes_to_scores(nodes):
    scores = []
    for c in nodes:
        scores.append(c.n)
    return scores

# モンテカルロ木探索のスコアの取得
def pv_mcts_scores(model, state, temperature):
    # モンテカルロ木探索のノードの定義
    class Node:
        # ノードの初期化
        def __init__(self, state, p):
            self.state = state  # 状態
            self.p = p  # 方策
            self.w = 0  # 累計価値
            self.n = 0  # 試行回数
            self.child_nodes = None  # 子ノード群

        # 局面の価値の計算
        def evaluate(self):
            # ゲーム終了時
            if self.state.is_done():
                # 勝敗結果で価値を取得
                value = -1 if self.state.is_lose() else 0

                # 累計価値と試行回数の更新
                self.w += value
                self.n += 1
                return value

            # 子ノードが存在しない時
            if not self.child_nodes:
                # ニューラルネットワークの推論で方策と価値を取得
                policies, value = predict(model, self.state)

                # 累計価値と試行回数の更新
                self.w += value
                self.n += 1

                # 子ノードの展開
                self.child_nodes = []
                for action, policy in zip(self.state.legal_actions(), policies):
                    self.child_nodes.append(
                        Node(self.state.next(action), policy))
                return value

            # 子ノードが存在する時
            else:
                # アーク評価値が最大の子ノードの評価で価値を取得
                value = -self.next_child_node().evaluate()

                # 累計価値と試行回数の更新
                self.w += value
                self.n += 1
                return value

        # アーク評価値が最大の子ノードを取得
        def next_child_node(self):
            # アーク評価値の計算
            C_PUCT = 1.0
            t = sum(nodes_to_scores(self.child_nodes))
            pucb_values = []
            for child_node in self.child_nodes:
                pucb_values.append((-child_node.w / child_node.n if child_node.n else 0.0) +
                                   C_PUCT * child_node.p * sqrt(t) / (1 + child_node.n))

            # アーク評価値が最大の子ノードを返す
            return self.child_nodes[np.argmax(pucb_values)]

    # 現在の局面のノードの作成
    root_node = Node(state, 0)

    # 複数回の評価の実行
    for _ in range(PV_EVALUATE_COUNT):
        root_node.evaluate()

    # 合法手の確率分布
    scores = nodes_to_scores(root_node.child_nodes)
    if temperature == 0:  # 最大値のみ1
        action = np.argmax(scores)
        scores = np.zeros(len(scores))
        scores[action] = 1
    else:  # ボルツマン分布でバラつき付加
        scores = boltzman(scores, temperature)
    return scores

# モンテカルロ木探索で行動選択
def pv_mcts_action(model, temperature=0):
    def pv_mcts_action(state):
        scores = pv_mcts_scores(model, state, temperature)
        return np.random.choice(state.legal_actions(), p=scores)
    return pv_mcts_action

# ボルツマン分布
def boltzman(xs, temperature):
    xs = [x ** (1 / temperature) for x in xs]
    return [x / sum(xs) for x in xs]


# モデルの読み込み
model = tf.keras.models.load_model('./model/best.h5')
model.compile(loss=['categorical_crossentropy', 'mse'], optimizer='adam')

# 状態の生成
state = State()

# モンテカルロ木探索で行動取得を行う関数の生成
next_action = pv_mcts_action(model, 1.0)

@app.route('/')
def index():
    if request.method == 'GET':
        return render_template('index.html')

@app.route('/predict/', methods=['POST'])
def ai_action():
    if request.method == 'POST':
        print("request accepted")
        board = request.json[0]
        ai_turn = request.json[1]
        pieces = [0] * 25
        enemy_pieces = [0] * 25
        for i in range(5):
            for j in range(5):
                if board[i][j] == ai_turn:
                    pieces[i*5+j] = 1
                elif board[i][j] == -ai_turn:
                    enemy_pieces[i*5+j] = 1
        state = State(pieces, enemy_pieces, 0)
        ai_action = next_action(state)
        ai_action_position = state.action_to_position(ai_action)
        print(ai_action_position)
        return [int(ai_action_position[0]), int(ai_action_position[1])]


# if __name__ == "__main__":
#    app.run(debug=True, port=8888, threaded=True)
