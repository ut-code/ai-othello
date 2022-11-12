const BLACK = 1,
  WHITE = -1.
DRAW = 0;
let data = [];
let turn = true;
let available = true;
let ai_color;
let winner;
let beforeNumBlack = 2;
let beforeNumWhite = 2;
const board = document.getElementById("board");
const whichIsHuman = document.getElementById("which-is-human");
const turnPart = document.getElementById("turn-part");
const h2 = document.querySelector("h2");
const counter = document.getElementById("counter");
const numBlackPlus = document.getElementById("numBlackPlus");
const numWhitePlus = document.getElementById("numWhitePlus");

const START = 0,
  FINISH = 1;
const modal = document.getElementById("modal");

const startDialog = document.getElementById("start-dialog");
const startButton = document.getElementById("start-button");

const finishDialog = document.getElementById("finish-dialog");
const result = document.getElementById("result");
const restartButton = document.getElementById("restart-button");

let yourTurnAnime;
let aiTurnAnime;
createTurnAnime();

let cells = 6; // マスの数

startButton.onclick = () => {
  closeModal();
  if (ai_color == BLACK) {
    ai_action();
  }
};

restartButton.onclick = () => {
  closeModal();
  setTimeout(() => {
    init();
  }, 500);
};

// 初期化
function init() {
  if (Math.random() > 0.5) {
    ai_color = WHITE;
    whichIsHuman.textContent = "あなたは黒(先手)です";
    whichIsHuman.classList.remove("human-white");
    whichIsHuman.classList.add("human-black");
    board.classList.remove("reverse"); //反転を解除
  } else {
    ai_color = BLACK;
    whichIsHuman.textContent = "あなたは白(後手)です";
    whichIsHuman.classList.remove("human-black");
    whichIsHuman.classList.add("human-white");
    board.classList.add("reverse"); //AIが黒（＝プレイヤーが白）のとき、手前側が白になるよう反転
  }
  beforeNumBlack = 2;
  beforeNumWhite = 2;
  data = [];
  board.innerHTML = "";
  turn = true;
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
  numBlackPlus.classList.add("hide");
  numWhitePlus.classList.add("hide");
  openModal(START);
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

function putFirstDisc(x, y, color) {
  board.rows[y].cells[x].firstChild.className =
    color === BLACK ? "black" : "white";
  if (color == BLACK) {
    board.rows[y].cells[x].animate(
      [{ backgroundColor: 'black' }, { backgroundColor: 'rgb(128, 216, 154)' }],
      { duration: 500, fill: "forwards" }
    );
  } else {
    board.rows[y].cells[x].animate(
      [{ backgroundColor: 'white' }, { backgroundColor: 'rgb(128, 216, 154)' }],
      { duration: 500, fill: "forwards" }
    );
  }
  data[y][x] = color;
}

function renderPlusCounter(blackPlus, whitePlus) {
  if (blackPlus != 0) {
    if (blackPlus < 0) {
      numBlackPlus.classList.remove("blue");
      numBlackPlus.classList.add("red");
      numWhitePlus.classList.add("blue");
      numWhitePlus.classList.remove("red");
      whitePlus = '+' + String(whitePlus);
    } else {
      numBlackPlus.classList.remove("red");
      numBlackPlus.classList.add("blue");
      numWhitePlus.classList.add("red");
      numWhitePlus.classList.remove("blue");
      blackPlus = '+' + String(blackPlus);
    }

    numBlackPlus.textContent = blackPlus;
    numWhitePlus.textContent = whitePlus;
    numBlackPlus.classList.remove("hide");
    numWhitePlus.classList.remove("hide");
    numBlackPlus.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 500,
      fill: "forwards",
    });
    numWhitePlus.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 500,
      fill: "forwards",
    });

    setTimeout(function () {
      numBlackPlus.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 200,
        fill: "forwards",
      });
      numWhitePlus.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 200,
        fill: "forwards",
      });
      available = true;
    }, 1000);
  }
}

// 手番などの表示
function showTurn() {
  let blackPlus;
  let whitePlus;
  yourTurnAnime.cancel();
  aiTurnAnime.cancel();
  var color = turn ? BLACK : WHITE;
  turnPart.textContent = color == ai_color ? "AIの番です" : "あなたの番です";
  if (color == ai_color) {
    aiTurnAnime.play()
  } else {
    yourTurnAnime.play();
  }
  let numWhite = 0,
    numBlack = 0;
  for (let x = 0; x < cells; x++) {
    for (let y = 0; y < cells; y++) {
      if (data[x][y] === WHITE) {
        numWhite++;
      }
      if (data[x][y] === BLACK) {
        numBlack++;
      }
    }
  }
  blackPlus = numBlack - beforeNumBlack
  whitePlus = numWhite - beforeNumWhite;
  beforeNumBlack = numBlack;
  beforeNumWhite = numWhite;

  document.getElementById("numBlack").textContent = numBlack;
  document.getElementById("numWhite").textContent = numWhite;

  renderPlusCounter(blackPlus, whitePlus);

  let blackDisk = checkReverse(BLACK);
  let whiteDisk = checkReverse(WHITE);

  if (numWhite + numBlack === cells * cells || (!blackDisk && !whiteDisk)) {
    if (numBlack > numWhite) {
      winner = BLACK;
      openModal(FINISH);
      document.getElementById("numBlack").textContent = numBlack;
    } else if (numBlack < numWhite) {
      winner = WHITE;
      openModal(FINISH);
      document.getElementById("numWhite").textContent = numWhite;
    } else {
      winner = DRAW;
      openModal(FINISH);
    }
    return;
  }
  if (!blackDisk && turn) {
    turnPart.textContent = color == ai_color ? "AIスキップ" : "あなたスキップ";
    turn = !turn;
    color = WHITE;
    setTimeout(showTurn, 2000);
    if (color == ai_color) {
      setTimeout(ai_action(), 2000);
    }
    return;
  }
  if (!whiteDisk && !turn) {
    turnPart.textContent = color == ai_color ? "AIスキップ" : "あなたスキップ";
    turn = !turn;
    color = BLACK;
    setTimeout(showTurn, 2000);
    if (color == ai_color) {
      setTimeout(ai_action(), 2000);
    }
    return;
  }
}

function next_state(x, y, color) {
  const result = checkPut(x, y, color);
  var maxlen = 0;
  result.forEach(value => {
    if (maxlen < value.length) {
      maxlen = value.length;
    }
  });
  var i = 0;
  var timer = setInterval(function () {
    if (i >= maxlen) {
      clearInterval(timer);
    }
    for (let j = 0; j < result.length; j++) {
      if (i >= result[j].length) {
        continue;
      }
      putDisc(result[j][i][0], result[j][i][1], color);
    }
    i++;
  }, 100);
  if (result.length > 0) {
    putFirstDisc(x, y, color);
    timer;
    setTimeout(function () {
      turn = !turn;
      available = false;
      showTurn();
      if (color != ai_color) {
        setTimeout(ai_action, 500);
      }
    }, 500);
  }
  else {
    if (color == ai_color) {
      alert('predict error');
    } else {
      return;
    }
  }
}

function ai_action() {
  if (!checkReverse(ai_color)) {
    return;
  }
  // console.log("ai_action");
  var color = turn ? BLACK : WHITE;
  var data_to_py = [data, color];
  var json = JSON.stringify(data_to_py);
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
      next_state(px, py, color);
    })
    .fail(function () {
      alert('ajax error');
    });

}

// マスがクリックされた時の処理
function clicked() {
  var color = turn ? BLACK : WHITE;
  const y = this.parentNode.rowIndex;
  const x = this.cellIndex;
  if (color == ai_color || !available) {
    return;
  }
  else {
    // マスに置けるかチェック
    if (data[y][x] !== 0) {
      return;
    }
    next_state(x, y, color);
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
          reverseDisk.push(tmpReverseDisk.concat());
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
        // console.log(result);
        return true;
      }
    }
  }
  return false;
}

function createTurnAnime() {
  yourTurnAnime = turnPart.animate([{ opacity: 1 }, { opacity: 0.1 }], {
    duration: 700,
    direction: "alternate",
    iterations: "Infinity",
  });

  aiTurnAnime = turnPart.animate(
    [
      { transform: "rotateX(0deg)" },
      { transform: "rotateX(0deg)" },
      { transform: "rotateX(360deg)" },
    ],
    {
      duration: 2000,
      easing: "linear",
      iterations: "Infinity",
    }
  );
}

// アニメーション
function openModal(dialogType) {
  if (dialogType == START) {
    startDialog.classList.remove("hide");
  } else {
    if (winner == ai_color) {
      result.textContent = "YOU LOSE...";
    } else if (winner == ai_color * (-1)) {
      result.textContent = "YOU WIN!!";
    } else {
      result.textContent = "DRAW";
    }
    finishDialog.classList.remove("hide");
  }
  modal.classList.remove("hide");
  modal.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 500,
    fill: "forwards",
  });
}

function closeModal() {
  modal.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 500,
    fill: "forwards",
  });
  setTimeout(() => {
    modal.classList.add("hide");
    startDialog.classList.add("hide");
    finishDialog.classList.add("hide");
  }, 500);
}
