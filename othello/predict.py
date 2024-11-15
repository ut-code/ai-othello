import tensorflow as tf
import numpy as np
from math import sqrt
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

model = tf.keras.models.load_model('./model/best.h5')

# パラメータの準備
PV_EVALUATE_COUNT = 50 # 1推論あたりのシミュレーション回数（本家は1600）
DN_INPUT_SHAPE = (6, 6, 2)

# 6*6のオセロ
class State:
    # 初期化
    def __init__(self, pieces=None, enemy_pieces=None, turn=-1):
        # 石の配置
        if pieces == None:
            self.pieces = [0] * 36
            self.pieces[15] = 1
            self.pieces[20] = 1
        else:
            self.pieces = pieces
        if enemy_pieces == None:
            self.enemy_pieces = [0] * 36
            self.enemy_pieces[14] = 1
            self.enemy_pieces[21] = 1
        else:
            self.enemy_pieces = enemy_pieces
        self.turn = turn  # -1なら先手、1なら後手

    def count(self):
        # 双方の石の数
        cnt1 = 0
        cnt2 = 0
        for i in self.pieces:
            if i == 1:
                cnt1 += 1
        for i in self.enemy_pieces:
            if i == 1:
                cnt2 += 1
        return [cnt1, cnt2]

    def is_lose(self):
        cnt = self.count()
        if self.is_done():
            return cnt[0] < cnt[1]
        return False

    def is_draw(self):
        cnt = self.count()
        if self.is_done():
            return cnt[0] == cnt[1]
        return False

    def is_done(self):
        return self.legal_actions()[0] == -1 and State(self.enemy_pieces, self.pieces, self.turn*(-1)).legal_actions()[0] == -1

    def legal_actions(self):
        actions = []
        dir = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1],
               [-1, 0], [-1, -1], [1, -1]]  # [dy, dx]
        for i in range(36):
            found = False  # ひっくり返せるか
            if self.pieces[i] == 0 and self.enemy_pieces[i] == 0:
                y = i // 6
                x = i % 6
                for d in dir:
                    dy = d[0]
                    dx = d[1]
                    # d方向に敵の石を発見
                    if 0 <= y+dy and y+dy <= 5 and 0 <= x+dx and x+dx <= 5 and self.enemy_pieces[(y+dy)*6+x+dx] == 1:
                        ty = y + dy
                        tx = x + dx
                        while True:
                            # d方向の先に味方の石がない
                            if 0 > ty+dy or ty+dy > 5 or 0 > tx+dx or tx+dx > 5 or (self.pieces[(ty+dy)*6+tx+dx] == 0 and self.enemy_pieces[(ty+dy)*6+tx+dx] == 0):
                                break
                            elif self.enemy_pieces[(ty+dy)*6+tx+dx] == 1:
                                ty += dy
                                tx += dx
                            else:  # d方向に味方の石を発見
                                actions.append(i)
                                found = True
                                break
                    if found:
                        break
        if len(actions) == 0:
            actions.append(-1)
        return actions

    def is_first_player(self):
        return self.turn == -1

    def next(self, action):
        if action == -1:
            return State(self.enemy_pieces, self.pieces, self.turn*(-1))
        y = action // 6
        x = action % 6
        next_pieces = self.pieces.copy()
        next_enemy_pieces = self.enemy_pieces.copy()
        next_pieces[action] = 1
        dir = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1],
               [-1, 0], [-1, -1], [1, -1]]  # [dy, dx]
        for d in dir:
            dy = d[0]
            dx = d[1]
            # d方向に敵の石を発見
            if 0 <= y+dy and y+dy <= 5 and 0 <= x+dx and x+dx <= 5 and self.enemy_pieces[(y+dy)*6+x+dx] == 1:
                ty = y + dy
                tx = x + dx
                cnt = 1  # 何個ひっくり返すか
                while True:
                    # d方向の先に味方の石がない
                    if 0 > ty+dy or ty+dy > 5 or 0 > tx+dx or tx+dx > 5 or (self.pieces[(ty+dy)*6+tx+dx] == 0 and self.enemy_pieces[(ty+dy)*6+tx+dx] == 0):
                        break
                    elif self.enemy_pieces[(ty+dy)*6+tx+dx] == 1:
                        ty += dy
                        tx += dx
                        cnt += 1
                    else:  # d方向に味方の石を発見
                        for i in range(cnt):
                            next_enemy_pieces[ty*6+tx] = 0
                            next_pieces[ty*6+tx] = 1
                            ty -= dy
                            tx -= dx
                        break
        return State(next_enemy_pieces, next_pieces, self.turn*(-1))

    def __str__(self):
        ox = ('o', 'x') if self.is_first_player() else ('x', 'o')
        str = ''
        for i in range(36):
            if self.pieces[i] == 1:
                str += ox[0]
            elif self.enemy_pieces[i] == 1:
                str += ox[1]
            else:
                str += '-'
            if i % 6 == 5:
                str += '\n'
        return str



# 推論
def predict(model, state):
    # who let the mathematicians in?
    # 推論のための入力データのシェイプの変換
    a, b, c = DN_INPUT_SHAPE
    x = np.array([state.pieces, state.enemy_pieces])
    x = x.reshape(c, a, b).transpose(1, 2, 0).reshape(1, a, b, c)
    #print(x)

    # 推論
    y = model.predict(x, batch_size=1, verbose=0)
    #print(y[0][0])

    # 方策の取得
    #for a in (state.legal_actions()):
     #   policies.append(y[0][0][a])
    policies = y[0][0][list(state.legal_actions())] # 合法手のみ
    policies /= sum(policies) if sum(policies) else 1 # 合計1の確率分布に変換

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
            self.state = state # 状態
            self.p = p # 方策
            self.w = 0 # 累計価値
            self.n = 0 # 試行回数
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
                    self.child_nodes.append(Node(self.state.next(action), policy))
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
            #print(self.child_nodes[np.argmax(pucb_values)].state)
            # アーク評価値が最大の子ノードを返す
            return self.child_nodes[np.argmax(pucb_values)]

    # 現在の局面のノードの作成
    root_node = Node(state, 0)

    # 複数回の評価の実行
    for _ in range(PV_EVALUATE_COUNT):
        root_node.evaluate()

    # 合法手の確率分布
    scores = nodes_to_scores(root_node.child_nodes)
    if len(scores) == 0:
        return [-1]
    if temperature == 0: # 最大値のみ1
        action = np.argmax(scores)
        scores = np.zeros(len(scores))
        scores[action] = 1
    else: # ボルツマン分布でバラつき付加
        scores = boltzman(scores, temperature)
    return scores

# モンテカルロ木探索で行動選択
def pv_mcts_action(model, temperature=0):
    def pv_mcts_action(state):
        scores = pv_mcts_scores(model, state, temperature)
        if scores[0] == -1:
            return -1
        return np.random.choice(state.legal_actions(), p=scores)
    return pv_mcts_action

# ボルツマン分布
def boltzman(xs, temperature):
    xs = [x ** (1 / temperature) for x in xs]
    return [x / sum(xs) for x in xs]

# モデルの読み込み
model = tf.keras.models.load_model('./model/best.h5')
model.compile(loss=['categorical_crossentropy', 'mse'], optimizer='adam')

state = State()

next_action = pv_mcts_action(model, 1.0)

app = FastAPI()

app.mount("/", StaticFiles(directory="static",html = True), name="static")

@app.post('/predict/')
def ai_action():
    if request.method == 'POST':
        print("request accepted")
        board = request.json[0]
        ai_turn = request.json[1]
        pieces = [0] * 36
        enemy_pieces = [0] * 36
        for i in range(6):
            for j in range(6):
                if board[i][j] == ai_turn:
                    pieces[i*6+j] = 1
                elif board[i][j] == -ai_turn:
                    enemy_pieces[i*6+j] = 1
        state = State(pieces, enemy_pieces, 0)
        ai_action = next_action(state)
        print(ai_action)
        return [int(ai_action)]
