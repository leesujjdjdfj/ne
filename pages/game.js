// /pages/game.js

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

// ==================================================================
// 스도쿠 생성기 클래스 (Helper)
// ==================================================================
class SudokuGenerator {
  static isValid(board, row, col, num) {
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num || board[i][col] === num) return false;
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[startRow + i][startCol + j] === num) return false;
      }
    }
    return true;
  }

  static solveSudoku(board) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (const num of numbers) {
            if (this.isValid(board, row, col, num)) {
              board[row][col] = num;
              if (this.solveSudoku(board)) return true;
              board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  static generatePuzzle(difficulty) {
    const solution = Array(9).fill(null).map(() => Array(9).fill(0));
    this.solveSudoku(solution);

    const puzzle = solution.map(row => [...row]);
    const emptyCells = { easy: 35, medium: 45, hard: 55 }[difficulty] || 35;
    
    let removed = 0;
    while (removed < emptyCells) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      if (puzzle[row][col] !== 0) {
        puzzle[row][col] = 0;
        removed++;
      }
    }
    return { puzzle, solution };
  }
}


// ==================================================================
// 숫자야구 싱글플레이 컴포넌트
// ==================================================================
const BaseballSinglePlayer = ({ nickname, gameDigits }) => {
  const router = useRouter();
  const maxTurns = gameDigits === 3 ? 15 : gameDigits === 4 ? 25 : 50;

  const [computerSecret, setComputerSecret] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [guessInput, setGuessInput] = useState('');
  const [remainingTurns, setRemainingTurns] = useState(maxTurns);
  const [myScore, setMyScore] = useState(0);
  const [systemMessages, setSystemMessages] = useState([]);
  const [isGameEnded, setGameEnded] = useState(false);
  const [gameOverInfo, setGameOverInfo] = useState(null);
  const [isSurrenderModalVisible, setSurrenderModalVisible] = useState(false);

  const startNewGame = () => {
    const numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    let secret = "";
    for (let i = 0; i < gameDigits; i++) {
      const randomIndex = Math.floor(Math.random() * numbers.length);
      secret += numbers.splice(randomIndex, 1)[0];
    }
    setComputerSecret(secret);
    console.log(`[개발자 모드] 컴퓨터 정답: ${secret}`);
    setGuesses([]);
    setGuessInput('');
    setRemainingTurns(maxTurns);
    setGameEnded(false);
    setGameOverInfo(null);
    setSystemMessages([`컴퓨터가 ${gameDigits}자리 숫자를 정했습니다. 맞춰보세요!`]);
  };

  useEffect(() => {
    startNewGame();
  }, [gameDigits]);

  const addSystemMessage = (message) => setSystemMessages(prev => [...prev, message]);

  const calculateResult = (secret, guess) => {
    let strikes = 0, balls = 0;
    for (let i = 0; i < secret.length; i++) {
      if (secret[i] === guess[i]) strikes++;
      else if (secret.includes(guess[i])) balls++;
    }
    return { strikes, balls };
  };

  const handleGuessSubmit = () => {
    if (isGameEnded) return;
    if (!guessInput || guessInput.length !== gameDigits || !/^\d+$/.test(guessInput) || new Set(guessInput).size !== guessInput.length) {
      addSystemMessage(`중복되지 않는 ${gameDigits}자리 숫자를 입력해주세요.`);
      return;
    }
    const result = calculateResult(computerSecret, guessInput);
    const isSuccess = result.strikes === gameDigits;
    setGuesses(prev => [...prev, { guess: guessInput, result: `${result.strikes}S ${result.balls}B`, isSuccess }]);
    setRemainingTurns(prev => prev - 1);
    
    if (isSuccess) {
      setMyScore(prev => prev + 1);
      addSystemMessage(`🎉 정답! ${guesses.length + 1}번 만에 성공!`);
      endGame(true, `축하합니다! ${guesses.length + 1}번 만에 정답을 맞췄습니다!`);
    } else if (remainingTurns - 1 <= 0) {
      addSystemMessage("기회를 모두 사용했습니다.");
      endGame(false, `아쉽네요. 정답은 ${computerSecret}였습니다.`);
    }
    setGuessInput('');
  };

  const endGame = (isWin, message) => {
    setGameEnded(true);
    setGameOverInfo({ isWin, message });
  };
  
  const handleSurrender = () => {
    setSurrenderModalVisible(false);
    if (!isGameEnded) endGame(false, "게임을 포기했습니다.");
  };

  return (
    <div className="baseball-ui">
      <Head><title>숫자야구 싱글플레이</title></Head>
      <header className="baseball-header">
        <h1>⚾ 숫자야구 싱글</h1>
        <div className="game-info">
          <span>{nickname} vs 컴퓨터</span>
          <span>점수: {myScore} - ∞</span>
          <span className={`remaining-attempts ${remainingTurns <= 3 ? 'danger' : remainingTurns <= 7 ? 'warning' : ''}`}>
            남은 시도: {remainingTurns} / {maxTurns}
          </span>
        </div>
      </header>
      <main className="baseball-main">
        <div className="baseball-content">
          <div className="baseball-panel" style={{flex: 1}}>
            <h2>내 추측 기록</h2>
            <div className="guess-record">
              {guesses.map((g, i) => (
                <div key={i} className={`guess-card mine ${g.isSuccess ? "success" : ""}`}>
                  <div className="round">{i + 1}회차</div>
                  <div className="details">입력: {g.guess} → 결과: {g.result}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="baseball-panel" style={{flex: 1}}>
            <h2>시스템 로그</h2>
            <div className="chat-box">
              {systemMessages.map((msg, i) => <div key={i} className="chat-msg system-chat">{msg}</div>)}
            </div>
          </div>
        </div>
      </main>
      <footer className="baseball-game-input">
        <input type="text" value={guessInput} onChange={e => setGuessInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && !isGameEnded && handleGuessSubmit()} placeholder="숫자를 입력하세요" disabled={isGameEnded} maxLength={gameDigits} />
        <button onClick={handleGuessSubmit} disabled={isGameEnded}>추측</button>
        <button className="btn-danger" onClick={() => setSurrenderModalVisible(true)} disabled={isGameEnded}>포기</button>
      </footer>
      {gameOverInfo && (
        <div className="overlay show">
          <div className="result-modal">
            <h1 style={{color: gameOverInfo.isWin ? '#28a745' : '#dc3545'}}>{gameOverInfo.isWin ? "🎉 승리!" : "😢 패배"}</h1>
            <p>{gameOverInfo.message}</p>
            {!gameOverInfo.isWin && <p>정답: <strong>{computerSecret}</strong></p>}
            <div className="modal-actions">
              <button onClick={startNewGame} className="modal-btn primary">다시하기</button>
              <Link href="/" className="modal-btn secondary">홈으로</Link>
            </div>
          </div>
        </div>
      )}
      {isSurrenderModalVisible && (
        <div className="overlay show">
          <div className="result-modal">
            <h1 style={{ color: '#e74c3c' }}>⚠️ 게임 포기</h1>
            <p>정말로 게임을 포기하시겠습니까?</p>
            <div className="modal-actions">
              <button onClick={handleSurrender} className="modal-btn btn-danger">예, 포기합니다</button>
              <button onClick={() => setSurrenderModalVisible(false)} className="modal-btn secondary">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================================================================
// 스도쿠 플레이어 컴포넌트 (신규 추가)
// ==================================================================
const SudokuPlayer = ({ nickname, difficulty, mode, roomCode: initialRoomCode }) => {
    const router = useRouter();
    const [board, setBoard] = useState([]);
    const [solution, setSolution] = useState([]);
    const [userBoard, setUserBoard] = useState([]);
    const [selectedCell, setSelectedCell] = useState(null); // {row, col}
    const [mistakes, setMistakes] = useState(0);
    const [isGameEnded, setGameEnded] = useState(false);
    const [gameOverInfo, setGameOverInfo] = useState(null);

    // 새 게임 시작
    const startNewGame = () => {
        const { puzzle, solution: newSolution } = SudokuGenerator.generatePuzzle(difficulty);
        setBoard(puzzle);
        setSolution(newSolution);
        setUserBoard(puzzle.map(row => row.map(cell => (cell !== 0 ? cell : 0))));
        setMistakes(0);
        setGameEnded(false);
        setGameOverInfo(null);
        setSelectedCell(null);
    };

    useEffect(() => {
        startNewGame();
    }, [difficulty]);

    // 셀 선택 핸들러
    const handleCellClick = (row, col) => {
        if (isGameEnded || board[row][col] !== 0) return;
        setSelectedCell({ row, col });
    };

    // 숫자 입력 핸들러
    const handleNumpadClick = (num) => {
        if (!selectedCell || isGameEnded) return;

        const { row, col } = selectedCell;
        const newUserBoard = userBoard.map(r => [...r]);
        newUserBoard[row][col] = num;
        setUserBoard(newUserBoard);

        if (num !== solution[row][col]) {
            setMistakes(m => m + 1);
            if (mistakes + 1 >= 3) {
                endGame(false, "실수 횟수 3회를 초과했습니다.");
            }
        }
        checkCompletion(newUserBoard);
    };

    // 게임 완료 체크
    const checkCompletion = (currentBoard) => {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (currentBoard[r][c] !== solution[r][c]) {
                    return; // 아직 미완성
                }
            }
        }
        endGame(true, "축하합니다! 스도쿠를 완성했습니다!");
    };

    const endGame = (isWin, message) => {
        setGameEnded(true);
        setGameOverInfo({ isWin, message });
    };

    return (
        <div className="sudoku-ui">
            <Head><title>스도쿠 ({difficulty})</title></Head>
            <header className="sudoku-header">
                <div className="sudoku-header-top">
                    <h1>Sudoku</h1>
                    <button onClick={() => router.push('/sudoku-setup')} className="new-game-btn">새 게임</button>
                </div>
                <div className="game-info">
                    <div className="info-item">난이도: {difficulty}</div>
                    <div className="info-item">실수: {mistakes} / 3</div>
                    {mode === 'multi' && <div className="info-item">방 코드: {initialRoomCode}</div>}
                </div>
            </header>
            <main className="sudoku-main">
                <div className="sudoku-board-container">
                    {board.length > 0 ? (
                        <div className="sudoku-board">
                            {board.map((row, rIdx) =>
                                row.map((cell, cIdx) => {
                                    const isGiven = cell !== 0;
                                    const userValue = userBoard[rIdx][cIdx];
                                    const isSelected = selectedCell && selectedCell.row === rIdx && selectedCell.col === cIdx;
                                    const isError = userValue !== 0 && userValue !== solution[rIdx][cIdx];
                                    
                                    let cellClass = "sudoku-cell";
                                    if (isGiven) cellClass += " given";
                                    if (isSelected) cellClass += " selected";
                                    if (isError) cellClass += " error";
                                    if ((cIdx + 1) % 3 === 0 && cIdx < 8) cellClass += " border-right-thick";
                                    if ((rIdx + 1) % 3 === 0 && rIdx < 8) cellClass += " border-bottom-thick";

                                    return (
                                        <div key={`${rIdx}-${cIdx}`} className={cellClass} onClick={() => handleCellClick(rIdx, cIdx)}>
                                            {userValue !== 0 ? userValue : ''}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        <div>Loading...</div>
                    )}
                </div>
            </main>
            <footer className="sudoku-footer">
                <div id="numpad" className="numpad">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button key={num} onClick={() => handleNumpadClick(num)}>{num}</button>
                    ))}
                    <button className="erase-btn" onClick={() => handleNumpadClick(0)}>X</button>
                </div>
            </footer>
             {gameOverInfo && (
                <div className="overlay show">
                  <div className="result-modal">
                    <h1>{gameOverInfo.isWin ? "🎉 성공!" : "😢 실패"}</h1>
                    <p>{gameOverInfo.message}</p>
                    <div className="modal-actions">
                      <button onClick={startNewGame} className="modal-btn primary">다시하기</button>
                      <Link href="/sudoku-setup" className="modal-btn secondary">설정으로</Link>
                    </div>
                  </div>
                </div>
            )}
        </div>
    );
};


// ==================================================================
// 메인 게임 페이지 라우터 컴포넌트
// ==================================================================
export default function GamePage() {
  const router = useRouter();
  const { type, mode, digits, difficulty, roomCode } = router.query;
  const [nickname, setNickname] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    const playerNickname = sessionStorage.getItem("playerNickname");
    if (!playerNickname || !type) {
      router.push('/');
      return;
    }
    setNickname(playerNickname);

    if (type === 'baseball' && mode !== 'single') {
        alert("숫자야구 멀티플레이는 새로운 설정 페이지에서 진행됩니다.");
        router.push('/baseball-setup');
        return;
    }
    
    setIsReady(true);

  }, [router.isReady, router.query]);

  if (!isReady || !nickname) {
    return <div>Loading...</div>;
  }
  
  if (type === 'baseball' && mode === 'single') {
    return <BaseballSinglePlayer nickname={nickname} gameDigits={Number(digits) || 3} />;
  }
  
  if (type === 'sudoku') {
    return <SudokuPlayer nickname={nickname} difficulty={difficulty || 'easy'} mode={mode} roomCode={roomCode} />;
  }

  return (
    <div>
        <h1>알 수 없는 게임</h1>
        <p>요청한 게임을 찾을 수 없습니다.</p>
        <Link href="/">홈으로 돌아가기</Link>
    </div>
  );
}
