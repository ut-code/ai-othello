const BLACK = 1,
  WHITE = -1;
let data = [];
let turn = true;
let ai_color;
const board = document.getElementById("board");
const whichIsHuman = document.getElementById("which-is-human");
const h2 = document.querySelector("h2");
const counter = document.getElementById("counter");
const modal = document.getElementById("modal");
document.querySelectorAll(".select").forEach((value) => {
  value.addEventListener("click", start);
});

if (Math.random() > 0.5) {
  ai_color = WHITE;
  whichIsHuman.textContent = "あなたは黒(先手)です";
  whichIsHuman.classList.remove("human-white");
  whichIsHuman.classList.add("human-black");
  board.classList.remove("reverse"); //反転を解除
} else
{
  ai_color = BLACK;
  whichIsHuman.textContent = "あなたは白(後手)です";
  whichIsHuman.classList.remove("human-black");
  whichIsHuman.classList.add("human-white");
  board.classList.add("reverse"); //AIが黒（＝プレイヤーが白）のとき、手前側が白になるよう反転
}

let cells = 6; // マスの数

function start(e) {
  cells = 6;
  board.innerHTML = "";
  init();
  modal.classList.add("hide");
  if (ai_color == BLACK) {
    ai_action();
  }
}

// 初期化
function init() {
  for (let i = 0; i < cells; i++) {
    const tr = document.createElement("tr");
    data[i] = Array(cells).fill(0);
    for (let j = 0; j < cells; j++) {
      const td = document.createElement("td");
      const disk = document.createElement("div");
      tr.appendChild(td);
      td.appendChild(disk);
      td.className = "cell";
      td.onclick = clicked;
    }
    board.appendChild(tr);
  }
  putDisc(2, 2, WHITE);
  putDisc(3, 3, WHITE);
  putDisc(2, 3, BLACK);
  putDisc(3, 2, BLACK);
  showTurn();
}

init();

// 石を描画
function putDisc(x, y, color) {
  board.rows[y].cells[x].firstChild.className =
    color === BLACK ? "black" : "white";
  board.rows[y].cells[x].animate(
    { opacity: [0.4, 1] },
    { duration: 700, fill: "forwards" }
  );
  data[y][x] = color;
}

// 手番などの表示
function showTurn() {
  h2.textContent = turn ? "黒の番です" : "白の番です";
  let numWhite = 0,
    numBlack = 0,
    numEmpty = 0;
  for (let x = 0; x < cells; x++) {
    for (let y = 0; y < cells; y++) {
      if (data[x][y] === WHITE) {
        numWhite++;
      }
      if (data[x][y] === BLACK) {
        numBlack++;
      }
      if (data[x][y] === 0) {
        numEmpty++;
      }
    }
  }
  document.getElementById("numBlack").textContent = numBlack;
  document.getElementById("numWhite").textContent = numWhite;

  let blackDisk = checkReverse(BLACK);
  let whiteDisk = checkReverse(WHITE);

  if (numWhite + numBlack === cells * cells || (!blackDisk && !whiteDisk)) {
    if (numBlack > numWhite) {
      document.getElementById("numBlack").textContent = numBlack + numEmpty;
      h2.textContent = "黒の勝ち!!";
      restartBtn();
      showAnime();
    } else if (numBlack < numWhite) {
      document.getElementById("numWhite").textContent = numWhite + numEmpty;
      h2.textContent = "白の勝ち!!";
      restartBtn();
      showAnime();
    } else {
      h2.textContent = "引き分け";
      restartBtn();
      showAnime();
    }
    return;
  }
  if (!blackDisk && turn) {
    h2.textContent = "黒スキップ";
    showAnime();
    turn = !turn;
    setTimeout(showTurn, 2000);
    if (turn == ai_turn) {
      setTimeout(ai_action(), 2000);
    }
    return;
  }
  if (!whiteDisk && !turn) {
    h2.textContent = "白スキップ";
    showAnime();
    turn = !turn;
    setTimeout(showTurn, 2000);
    if (turn == ai_turn) {
      setTimeout(ai_action(), 2000);
    }
    return;
  }
}

function ai_action() {
  if (!checkReverse(ai_color)) {
    return;
  }
  console.log("ai_action");
  var color = turn ? BLACK : WHITE;
  var data_to_py = [data, color]
  var json = JSON.stringify(data_to_py)
  $.ajax({
    type: "POST",
    url: "/predict/",
    data: json,
    contentType: "application/json",
  })
    .done(function (choice) {
      var px = choice[0] % cells;
      var py = Math.floor(choice[0] / cells);
      if (data[py][px] !== 0) {
        alert('predict error');
        return;
      }
      const result = checkPut(px, py, color);
      if (result.length > 0) {
        result.forEach((value) => {
          putDisc(value[0], value[1], color);
        });
        turn = !turn;
      }
      else {
        alert('predict error');
      }
      showTurn();
    })
    .fail(function () {
      alert('ajax error')
    });

}

// マスがクリックされた時の処理
function clicked() {
  var color = turn ? BLACK : WHITE;
  const y = this.parentNode.rowIndex;
  const x = this.cellIndex;
  if (color == ai_color) {
    return;
  }
  else {
    // マスに置けるかチェック
    if (data[y][x] !== 0) {
      return;
    }
    const result = checkPut(x, y, color);
    if (result.length > 0) {
      result.forEach((value) => {
        putDisc(value[0], value[1], color);
      });
      turn = !turn;
      color = turn ? BLACK : WHITE
      showTurn();
      ai_action();
    }
    else {
      return;
    }
  }
}

// 置いたマスの周囲8方向をチェック
function checkPut(x, y, color) {
  let dx, dy;
  const opponentColor = color == BLACK ? WHITE : BLACK;
  let tmpReverseDisk = [];
  let reverseDisk = [];
  // 周囲8方向を調べる配列
  const direction = [
    [-1, 0], // 左
    [-1, 1], // 左下
    [0, 1], // 下
    [1, 1], // 右下
    [1, 0], // 右
    [1, -1], // 右上
    [0, -1], // 上
    [-1, -1], // 左上
  ];

  // すでに置いてある
  if (data[y][x] === BLACK || data[y][x] === WHITE) {
    return [];
  }
  // 置いた石の周りに違う色の石があるかチェック
  for (let i = 0; i < direction.length; i++) {
    dx = direction[i][0] + x;
    dy = direction[i][1] + y;
    if (
      dx >= 0 &&
      dy >= 0 &&
      dx <= cells - 1 &&
      dy <= cells - 1 &&
      opponentColor === data[dy][dx]
    ) {
      tmpReverseDisk.push([x, y]);
      tmpReverseDisk.push([dx, dy]);
      // 裏返せるかチェック
      while (true) {
        dx += direction[i][0];
        dy += direction[i][1];
        if (
          dx < 0 ||
          dy < 0 ||
          dx > cells - 1 ||
          dy > cells - 1 ||
          data[dy][dx] === 0
        ) {
          tmpReverseDisk = [];
          break;
        }
        if (opponentColor === data[dy][dx]) {
          tmpReverseDisk.push([dx, dy]);
        }
        if (color === data[dy][dx]) {
          reverseDisk = reverseDisk.concat(tmpReverseDisk);
          tmpReverseDisk = [];
          break;
        }
      }
    }
  }
  return reverseDisk;
}

// 裏返せる場所があるか確認
function checkReverse(color) {
  for (let x = 0; x < cells; x++) {
    for (let y = 0; y < cells; y++) {
      const result = checkPut(x, y, color);
      if (result.length > 0) {
        console.log(result);
        return true;
      }
    }
  }
  return false;
}

// ゲーム終了画面
function restartBtn() {
  const restartBtn = document.getElementById("restartBtn");
  restartBtn.classList.remove("hide");
  restartBtn.animate(
    { opacity: [1, 0.5, 1] },
    { delay: 2000, duration: 3000, iterations: "Infinity" }
  );

  restartBtn.addEventListener("click", () => {
    document.location.reload();
  });
}
function showAnime() {
  h2.animate({ opacity: [0, 1] }, { duration: 500, iterations: 4 });
}