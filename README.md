# vs-AI-exhibition

第73回駒場祭企画　オ AI展示と勝負

## 環境構築

1. the Nix way

- install Nix
- run `nix develop` at root

2. non-Nix Way

- install python <= 3.10
- run `pip -m venv ./.venv`
- run `pip install -r requirements.txt`
- run `pip install -r othello/requirements.txt`

## 実行

1. othello
  - `cd othello`
  - `python3 predict.py`

## デプロイ方法

```sh
cd othello
fly deploy
```

## デプロイ先

https://othello.utcode.net

--- old

### ニュートリーコのデプロイ

<https://neutreeko.herokuapp.com/>

### 6x6リバーシのデプロイ

<https://reversi-6x6.herokuapp.com/>
