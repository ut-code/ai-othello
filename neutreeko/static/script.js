const BLACK = 1,
  WHITE = -1;
const AVAILABLE = 1,
  UNAVAILABLE = 0;
const START = 0,
  FINISH = 1;
let data = [];
let options = [];
let selectedDisk = [];
let turn;
let isFinished; //終了したかどうか

let ai_color;

const board = document.getElementById("board");
const whichIsHuman = document.getElementById("which-is-human");
const turnPart = document.getElementById("turn-part");

const modal = document.getElementById("modal");

const startDialog = document.getElementById("start-dialog");
const startButton = document.getElementById("start-button");

const finishDialog = document.getElementById("finish-dialog");
const result = document.getElementById("result");
const restartButton = document.getElementById("restart-button");

const stone = document.getElementById('circle');
stone.classList.add("hide");

let cells = 5;

let yourTurnAnime;
let aiTurnAnime;
createTurnAnime();


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

function init() {
  data = [];
  options = [];
  selectedDisk = [];
  turn = BLACK;
  isFinished = false;

  // AIが先手か否か決定
  if (Math.random() > 0.5) {
    ai_color = WHITE;
    whichIsHuman.textContent = "あなたは赤(先手)です";
    whichIsHuman.classList.remove("human-white");
    whichIsHuman.classList.add("human-black");
    board.classList.remove("reverse"); //反転を解除
  } else {
    ai_color = BLACK;
    whichIsHuman.textContent = "あなたは青(後手)です";
    whichIsHuman.classList.remove("human-black");
    whichIsHuman.classList.add("human-white");
  }

  //盤面を作成
  board.innerHTML = "";
  for (let i = 0; i < cells; i++) {
    const tr = document.createElement("tr");
    data[i] = Array(cells).fill(0);
    options[i] = Array(cells).fill(UNAVAILABLE);
    for (let j = 0; j < cells; j++) {
      const td = document.createElement("td");
      const disk = document.createElement("div");
      tr.appendChild(td); 
      td.appendChild(disk);
      td.className = "cell";
      disk.className = "disk";

      td.onclick = tdClicked;
    }
    board.appendChild(tr);
  }
  addDisk(1, 0, WHITE);
  addDisk(3, 0, WHITE);
  addDisk(2, 1, BLACK);

  addDisk(2, 3, WHITE);
  addDisk(1, 4, BLACK);
  addDisk(3, 4, BLACK);

  showTurn();

  render();
  openModal(START);
}

init();

// 描画
function render() {
  for (let x = 0; x < cells; x++) {
    for (let y = 0; y < cells; y++) {
      if (options[y][x] == UNAVAILABLE) {
        board.rows[y].cells[x].classList.remove("options");
        board.rows[y].cells[x].classList.add("green");
        if (data[y][x] == BLACK) {
          board.rows[y].cells[x].firstChild.classList.remove("white");
          board.rows[y].cells[x].firstChild.classList.add("black");
        } else if (data[y][x] == WHITE) {
          board.rows[y].cells[x].firstChild.classList.remove("black");
          board.rows[y].cells[x].firstChild.classList.add("white");
        } else {
          board.rows[y].cells[x].firstChild.classList.remove("white");
          board.rows[y].cells[x].firstChild.classList.remove("black");
        }
      } else {
        board.rows[y].cells[x].classList.remove("green");
        board.rows[y].cells[x].classList.add("options");
      }
      if (
        JSON.stringify([selectedDisk[0], selectedDisk[1]]) !=
        JSON.stringify([x, y])
      ) {
        board.rows[y].cells[x].firstChild.classList.remove("selected");
      } else {
        board.rows[y].cells[x].firstChild.classList.add("selected");
      }
    }
  }
}

//手番を表示
function showTurn() {
  yourTurnAnime.cancel();
  aiTurnAnime.cancel();
  if (turn == ai_color) {
    turnPart.textContent = "AIの番です";
    aiTurnAnime.play();
  } else {
    turnPart.textContent = "あなたの番です";
    yourTurnAnime.play();
  }
}

// (x, y) にcolor色のコマを追加
function addDisk(x, y, color) {
  data[y][x] = color;
}

// (x, y)からコマを削除
function removeDisk(x, y) {
  data[y][x] = 0;
}

function Sleep(interval){
  let start = new Date();
  while(new Date() - start < interval);
}


// コマを目的地に移動
function transfer(destination) {
  removeDisk(selectedDisk[0], selectedDisk[1]);
  let element = board.rows[selectedDisk[1]].cells[selectedDisk[0]];
  let result = element.getBoundingClientRect();
  stone.style.top = result.top + 6 + "px";
  stone.style.left = result.left + 6 + "px";
  let stonecolor;
  if (selectedDisk[2] == BLACK){
    stonecolor = "#ff1100";
  }else{
    stonecolor = "#0e0eff";
  }

  stone.style.backgroundColor = stonecolor;
  stone.classList.remove("hide");
  render();
  /*let animations = anime({
    targets: '#circle',
    translateX: 50*(destination[0]-selectedDisk[0]),
    translateY: 50*(destination[1]-selectedDisk[1]),
    backgroundColor: stonecolor,
    duration: 5000
  });

  animations.play();
  interval = 5000;
  let start = new Date();
  cnt = 0;
  while(new Date() - start < interval);
  console.log(stone.style.backgroundColor);
  console.log("result" + result.top +" " + result.left);*/
  let StoneAnime = stone.animate(
    [
      { transform: "translate(0px,0px)" },
      { transform: `translate(${50*(destination[0]-selectedDisk[0])}px, ${50*(destination[1]-selectedDisk[1])}px) ` }
    ],
    {
      duration: 500,
      easing: "linear"
    }
  );
  color = selectedDisk[2];
  setTimeout(function(){
    stone.classList.add("hide");
    render();
  },500);
 /* stone.style.backgroundColor = 'red';
  stone.style.position = 'absolute';
  stone.style.top = result.top + 'px';
  stone.style.left = result.left + 'px';*/
  addDisk(destination[0], destination[1], color);
  
  cancelSelection();
  
}

// ユーザーがクリックした際の動作
function tdClicked() {
  if (isFinished || ai_color == turn) return;
  const y = this.parentNode.rowIndex;
  const x = this.cellIndex;

  if (options[y][x] == AVAILABLE) {
    //選択候補をクリックしたとき
    transfer([x, y]);
    judge();
    if (isFinished) {
      openModal(FINISH);
    } else {
      turn *= -1;
      showTurn();
      ai_action();
    }
  } else if (data[y][x] == turn) {
    // 自分の色のコマのあるマスをクリックしたとき
    cancelSelection();
    selectedDisk = [x, y, data[y][x]];
    findOptions(x, y);
    render();
  } else {
    // 選択候補でなく、操作可能なコマもないマスをクリックしたとき
    cancelSelection();
    render();
  }
}

// AIの動作
function ai_action() {
  console.log("ai_action");
  data_to_py = [data, turn];
  var json = JSON.stringify(data_to_py);
  $.ajax({
    type: "POST",
    url: "/predict/",
    data: json,
    contentType: "application/json",
  })
    .done(function (action) {
      var fromY = Math.floor(action[0] / 5);
      var fromX = action[0] % 5;
      selectedDisk[0] = fromX;
      selectedDisk[1] = fromY;
      selectedDisk[2] = turn;
      var toY = Math.floor(action[1] / 5);
      var toX = action[1] % 5;
      transfer([toX, toY]);
      judge();
      if (isFinished) {
        openModal(FINISH);
      } else {
        turn *= -1;
        showTurn();
        // ユーザの操作（クリック）を待つ
      }
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      console.log("jqXHR          : " + jqXHR.status); // HTTPステータスが取得
      console.log("textStatus     : " + textStatus); // タイムアウト、パースエラー
      console.log("errorThrown    : " + errorThrown.message); // 例外情報
      alert("ajax error");
    });
}

// 移動先候補の状態・選択されたコマの状態を解除
function cancelSelection() {
  for (let i = 0; i < cells; i++) {
    options[i] = Array(cells).fill(0);
  }
  selectedDisk = [];
}

// (x, y)から到達可能な移動先を全て見つける
function findOptions(x, y) {
  for (let i of [-1, 0, 1]) {
    for (let j of [-1, 0, 1]) {
      const result = findOption(x, y, i, j);
      if (JSON.stringify(result) != JSON.stringify([x, y])) {
        // 開始地点と選択肢が異なる座標の場合、移動が可能な選択肢として追加
        options[result[1]][result[0]] = AVAILABLE;
      }
    }
  }
}

// (x0, y0)からある一方向(dx, dy)についての到達可能な移動先を一つ見つける
// 到達可能な移動先がない場合、元の場所(x0, y0)の座標を返す
function findOption(x0, y0, dx, dy) {
  if (dx == 0 && dy == 0) {
    // dx=0, dy=0のとき、移動方向が定義できないため移動先の選択肢はなし
    return [x0, y0];
  }
  let x = x0;
  let y = y0;
  while (true) {
    if (!isReachable(x + dx, y + dy)) {
      // 到達不可になる一つ前の段階の座標を返す
      return [x, y];
    } else {
      x += dx;
      y += dy;
    }
  }
}

// (x, y)が空いていてかつ範囲内にあるマスかを判断
function isReachable(x, y) {
  if (y >= cells || x >= cells || y <= -1 || x <= -1) {
    // 盤の範囲外の場合、到達不可
    return false;
  } else if (data[y][x] != 0) {
    // すでにコマがある場合、到達不可
    return false;
  } else {
    // それ以外の場合、到達可能
    return true;
  }
}

// 勝敗を判断
function judge() {
  /*const blacks = document.querySelectorAll(".black");
  const whites = document.querySelectorAll(".white");

  if (isBingo(blacks)) {
    winner = BLACK;
    isFinished = true;
    return;
  } else if (isBingo(whites)) {
    winner = WHITE;
    isFinished = true;
    return;
  }*/
  let dir = [[1,-1],[1,0],[1,1],[0,1]];
  let dy, dx;
  for(let i = 0;i < 5;i++){
    for(let j = 0;j < 5;j++){
      if(data[i][j] == turn){
        for (let k = 0; k < 4; k++) {
          dy = dir[k][0];
          dx = dir[k][1];
          if (i+2*dy < 0 || 4 < i+2*dy || j+2*dx < 0 || 4 < j+2*dx || data[i+dy][j+dx] != turn || data[i+2*dy][j+2*dx] != turn){
            continue;
          } else {
            winner = turn;
            isFinished = true;
            return;
          }
        }
      }
    }
  }
  isFinished = false;
  return;
}
  // 縦 or 横 or 斜め に3つそろっているところがあるか判断
/*  function isBingo(disks) {
    let xResult = [];
    let yResult = [];
    for (let disk of disks) {
      xResult.push(disk.parentNode.cellIndex);
      yResult.push(disk.parentNode.parentNode.rowIndex);
    }

    if (xResult[0] == xResult[1] && xResult[0] == xResult[2]) {
      if (
        Math.abs(yResult[2] - yResult[1]) == 1 &&
        Math.abs(yResult[1] - yResult[0]) == 1
      ) {
        return true;
      } else {
        return false;
      }
    } else if (yResult[0] == yResult[1] && yResult[0] == yResult[2]) {
      if (
        Math.abs(xResult[2] - xResult[1]) == 1 &&
        Math.abs(xResult[1] - xResult[0]) == 1
      ) {
        return true;
      } else {
        return false;
      }
    } else if (xResult[2] - xResult[1] != 0 && xResult[1] - xResult[0] != 0) {
      if (
        (yResult[2] - yResult[1]) / (xResult[2] - xResult[1]) ==
        (yResult[1] - yResult[0]) / (xResult[1] - xResult[0])
      ) {
        if (
          Math.abs(xResult[2] - xResult[1]) == 1 &&
          Math.abs(xResult[1] - xResult[0]) == 1 &&
          Math.abs(yResult[2] - yResult[1]) == 1 &&
          Math.abs(yResult[1] - yResult[0]) == 1
        ) {
          return true;
        }
      }
    } else {
      return false;
    }
  }
}*/

// アニメーション
function openModal(dialogType) {
  if (dialogType == START) {
    startDialog.classList.remove("hide");
  } else {
    if (winner == ai_color) {
      result.textContent = "YOU LOSE...";
    } else {
      result.textContent = "YOU WIN!!";
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

