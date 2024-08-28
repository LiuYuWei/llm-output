import React, { useState, useEffect, useCallback, useRef } from 'react';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const TETROMINOS = [
  { shape: [[1, 1, 1, 1]], color: 'bg-red-500' },
  { shape: [[1, 1], [1, 1]], color: 'bg-blue-500' },
  { shape: [[1, 1, 1], [0, 1, 0]], color: 'bg-green-500' },
  { shape: [[1, 1, 0], [0, 1, 1]], color: 'bg-yellow-500' },
  { shape: [[0, 1, 1], [1, 1, 0]], color: 'bg-purple-500' },
  { shape: [[1, 1, 1], [1, 0, 0]], color: 'bg-indigo-500' },
  { shape: [[1, 1, 1], [0, 0, 1]], color: 'bg-pink-500' },
];

const createBoard = () => Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));

const TetrisGame = () => {
  const [board, setBoard] = useState(createBoard());
  const [currentPiece, setCurrentPiece] = useState(null);
  const [nextPiece, setNextPiece] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(1); // 初始速度設為 1 格/秒

  const moveIntervalRef = useRef(null);

  const spawnNewPiece = useCallback(() => {
    if (!nextPiece) {
      const newCurrentPiece = TETROMINOS[Math.floor(Math.random() * TETROMINOS.length)];
      const newNextPiece = TETROMINOS[Math.floor(Math.random() * TETROMINOS.length)];
      setCurrentPiece({
        shape: newCurrentPiece.shape,
        color: newCurrentPiece.color,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(newCurrentPiece.shape[0].length / 2),
        y: 0,
      });
      setNextPiece(newNextPiece);
    } else {
      setCurrentPiece({
        shape: nextPiece.shape,
        color: nextPiece.color,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(nextPiece.shape[0].length / 2),
        y: 0,
      });
      const newNextPiece = TETROMINOS[Math.floor(Math.random() * TETROMINOS.length)];
      setNextPiece(newNextPiece);
    }
  }, [nextPiece]);

  const checkCollision = (piece, boardToCheck) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          if (
            piece.y + y >= BOARD_HEIGHT ||
            piece.x + x < 0 ||
            piece.x + x >= BOARD_WIDTH ||
            boardToCheck[piece.y + y][piece.x + x]
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const mergePieceToBoard = useCallback(() => {
    if (!currentPiece) return; // 確保 currentPiece 存在
    const newBoard = board.map(row => [...row]);
    currentPiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          newBoard[y + currentPiece.y][x + currentPiece.x] = currentPiece.color;
        }
      });
    });
    setBoard(newBoard);

    // Check for completed lines
    let linesCleared = 0;
    const updatedBoard = newBoard.filter(row => {
      if (row.every(cell => cell !== 0)) {
        linesCleared++;
        return false;
      }
      return true;
    });

    while (updatedBoard.length < BOARD_HEIGHT) {
      updatedBoard.unshift(Array(BOARD_WIDTH).fill(0));
    }

    setBoard(updatedBoard);
    setScore(prevScore => prevScore + linesCleared);

    spawnNewPiece();
  }, [board, currentPiece, spawnNewPiece]);

  const movePiece = useCallback((dx, dy, rotate = false) => {
    if (gameOver || !currentPiece) return;

    let newPiece = { ...currentPiece, x: currentPiece.x + dx, y: currentPiece.y + dy };

    if (rotate) {
      const rotatedShape = currentPiece.shape[0].map((_, index) =>
        currentPiece.shape.map(row => row[index]).reverse()
      );
      newPiece = { ...newPiece, shape: rotatedShape };
    }

    if (!checkCollision(newPiece, board)) {
      setCurrentPiece(newPiece);
    } else if (dy > 0) {
      mergePieceToBoard();
    }
  }, [currentPiece, board, gameOver, mergePieceToBoard]);

  const hardDrop = useCallback(() => {
    if (gameOver || !currentPiece) return;

    let newY = currentPiece.y;
    while (!checkCollision({ ...currentPiece, y: newY + 1 }, board)) {
      newY++;
    }
    setCurrentPiece(prevPiece => ({ ...prevPiece, y: newY }));
  }, [currentPiece, board, gameOver]);

  const startMoving = useCallback((dx, dy) => {
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    movePiece(dx, dy);
    moveIntervalRef.current = setInterval(() => movePiece(dx, dy), 100);
  }, [movePiece]);

  const stopMoving = useCallback(() => {
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') startMoving(-1, 0);
      if (e.key === 'ArrowRight') startMoving(1, 0);
      if (e.key === 'ArrowDown') startMoving(0, 1);
      if (e.key === 'ArrowUp') movePiece(0, 0, true);
      if (e.key === ' ') {
        e.preventDefault();
        hardDrop();
      }
    };

    const handleKeyUp = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.key)) {
        stopMoving();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [movePiece, hardDrop, startMoving, stopMoving]);

  useEffect(() => {
    if (!currentPiece) {
      spawnNewPiece();
    } else {
      const timer = setInterval(() => {
        movePiece(0, 1);
      }, 1000 / speed); // 根據速度計算間隔時間

      return () => {
        clearInterval(timer);
      };
    }
  }, [currentPiece, movePiece, spawnNewPiece, speed]);

  useEffect(() => {
    if (currentPiece && checkCollision(currentPiece, board)) {
      setGameOver(true);
    }
  }, [currentPiece, board]);

  const renderBoard = () => {
    const boardWithPiece = board.map(row => [...row]);
    if (currentPiece) {
      currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            const boardY = y + currentPiece.y;
            const boardX = x + currentPiece.x;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              boardWithPiece[boardY][boardX] = currentPiece.color;
            }
          }
        });
      });
    }

    return boardWithPiece.map((row, y) => (
      <div key={y} className="flex">
        {row.map((cell, x) => (
          <div
            key={x}
            className={`w-6 h-6 border border-gray-700 ${cell || 'bg-gray-900'}`}
          />
        ))}
      </div>
    ));
  };

  const renderNextPiece = () => {
    if (!nextPiece) return null;

    const grid = Array(4).fill().map(() => Array(4).fill(0));
    const offsetX = Math.floor((4 - nextPiece.shape[0].length) / 2);
    const offsetY = Math.floor((4 - nextPiece.shape.length) / 2);

    nextPiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          grid[y + offsetY][x + offsetX] = 1;
        }
      });
    });

    return (
      <div className="grid grid-cols-4 gap-1 w-24 h-24">
        {grid.flatMap((row, y) => 
          row.map((cell, x) => (
            <div
              key={`${y}-${x}`}
              className={`w-5 h-5 ${cell ? nextPiece.color : 'bg-gray-900'} border border-gray-700`}
            />
          ))
        )}
      </div>
    );
  };

  const resetGame = () => {
    setBoard(createBoard());
    setCurrentPiece(null);
    setNextPiece(null);
    setGameOver(false);
    setScore(0);
    setSpeed(1);
    spawnNewPiece();
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-800 text-white">
      <div className="flex">
        <div className="border-4 border-gray-600 p-1">
          {renderBoard()}
        </div>
        <div className="ml-4 w-48 flex flex-col justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-4">俄羅斯方塊</h1>
            <div className="mb-4 text-xl">分數: {score}</div>
            {gameOver && (
              <div className="mb-4 text-xl font-bold text-red-500">遊戲結束!</div>
            )}
            <button 
              onClick={resetGame}
              className="mb-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              重新開始
            </button>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2" htmlFor="speed">
                速度調整: {speed} 格/秒
              </label>
              <input 
                id="speed"
                type="range" 
                min="1" 
                max="20" 
                step="1" 
                value={speed} 
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="text-sm">
              <p className="font-bold mb-2">操作說明：</p>
              <p>← → : 左右移動</p>
              <p>↑ : 旋轉</p>
              <p>↓ : 加速下落</p>
              <p>空白鍵 : 直接落到最低位置</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="font-bold mb-2">下一個方塊：</p>
            {renderNextPiece()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TetrisGame;
