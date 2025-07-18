// /pages/baseball-setup.js

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

// 이 컴포넌트는 기존의 baseball-setup.html과 baseball-setup.js의 모든 기능을 담당합니다.
// CSS는 global.css 또는 _app.js를 통해 전역으로 import했다고 가정합니다.

const Notification = ({ message, type, onEnd }) => {
  useEffect(() => {
    const timer = setTimeout(onEnd, 3000);
    return () => clearTimeout(timer);
  }, [onEnd]);

  const baseStyle = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '1rem 1.5rem',
    color: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    zIndex: 10000,
    fontWeight: 500,
    maxWidth: '300px',
    animation: 'slideIn 0.3s ease, slideOut 0.3s ease 2.7s forwards',
  };

  const typeStyles = {
    success: { background: '#27ae60' },
    error: { background: '#e74c3c' },
    info: { background: '#3498db' },
  };

  return <div style={{ ...baseStyle, ...typeStyles[type] }}>{message}</div>;
};


export default function BaseballSetup() {
  const router = useRouter();
  const ws = useRef(null);

  // ===== 상태 관리 (State Management) =====
  // UI의 모든 동적인 부분들을 state로 관리합니다.
  const [pageState, setPageState] = useState('loading'); // loading, setup, set_secret, in_game
  const [nickname, setNickname] = useState('');
  const [selectedDigits, setSelectedDigits] = useState(3);
  const [isMultiOptionsVisible, setMultiOptionsVisible] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  
  // 인게임 상태
  const [mySecretNumber, setMySecretNumber] = useState('');
  const [secretNumberInput, setSecretNumberInput] = useState('');
  const [gameData, setGameData] = useState(null); // 서버로부터 받은 게임 정보
  const [myGuesses, setMyGuesses] = useState([]);
  const [opponentGuesses, setOpponentGuesses] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [isMyTurn, setIsMyTurn] = useState(false);

  // 모달 및 알림 상태
  const [notification, setNotification] = useState(null); // { message, type }
  const [isGameOverModalVisible, setGameOverModalVisible] = useState(false);
  const [gameOverData, setGameOverData] = useState(null);
  const [isSurrenderModalVisible, setSurrenderModalVisible] = useState(false);
  
  // 버튼 비활성화 상태
  const [isConnecting, setIsConnecting] = useState(true);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isSettingNumber, setIsSettingNumber] = useState(false);


  // ===== useEffect: 컴포넌트 초기화 및 웹소켓 연결 =====
  useEffect(() => {
    // 사용자 정보 확인
    const playerNickname = sessionStorage.getItem("playerNickname");
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

    if (!playerNickname || !currentUser) {
      router.push('/');
      return;
    }
    setNickname(playerNickname);

    // --- 웹소켓 연결 ---
    const connectToServer = () => {
      // 1단계에서 수정한 올바른 서버 주소 사용
      ws.current = new WebSocket("wss://websocket-game-server-silent-brook-7828.fly.dev");
      setIsConnecting(true);

      ws.current.onopen = () => {
        console.log("✅ 서버에 연결되었습니다.");
        showNotification("서버에 연결되었습니다.", "success");
        setIsConnecting(false);
        setPageState('setup');
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("📨 수신:", data);
        handleServerMessage(data); // 수신 메시지 처리
      };

      ws.current.onclose = () => {
        console.warn("🔌 연결 종료됨. 재연결 시도 중...");
        if (pageState !== 'in_game') { // 게임 중이 아닐 때만 재연결
            setIsConnecting(true);
            showNotification("서버 연결이 끊겼습니다. 재연결 중...", "error");
            setTimeout(connectToServer, 3000);
        }
      };

      ws.current.onerror = (err) => {
        console.error("❌ WebSocket 오류:", err);
        showNotification("서버 연결에 실패했습니다.", "error");
        setIsConnecting(true);
        ws.current.close();
      };
    };

    connectToServer();

    // 컴포넌트가 언마운트될 때 웹소켓 연결을 정리합니다. (메모리 누수 방지)
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [router]); // router는 거의 변하지 않으므로, 사실상 마운트 시 한 번만 실행됩니다.

  // ===== 웹소켓 메시지 처리 =====
  const handleServerMessage = (data) => {
    switch (data.type) {
      case "game_created":
        setCreatedRoomCode(data.roomCode);
        showNotification("방이 생성되었습니다! 친구를 기다리세요.", "success");
        setIsCreatingRoom(false);
        break;

      case "prompt_secret":
        setPageState('set_secret');
        setSelectedDigits(data.digits || selectedDigits);
        setGameData(prev => ({ ...prev, roomCode: data.roomCode }));
        break;

      case "game_ready":
        setPageState('in_game');
        setGameData({
            myNickname: data.myNickname,
            opponentNickname: data.opponentNickname,
            myScore: data.myScore,
            opponentScore: data.opponentScore,
            roomCode: data.roomCode,
        });
        setIsMyTurn(data.isMyTurn);
        setChatMessages(prev => [...prev, { type: 'system', text: data.message }]);
        break;

      case "update":
        const { by, guess, result } = data;
        const newGuess = { round: (by === 'me' ? myGuesses.length : opponentGuesses.length) + 1, guess, result };
        if (by === 'me') {
            setMyGuesses(prev => [...prev, newGuess]);
        } else {
            setOpponentGuesses(prev => [...prev, newGuess]);
        }
        break;

      case "info":
        setIsMyTurn(data.isMyTurn);
        setChatMessages(prev => [...prev, { type: 'system', text: data.message }]);
        break;

      case "chat_message":
        setChatMessages(prev => [...prev, { type: 'opponent', sender: data.senderNickname, text: data.text }]);
        break;

      case "game_over":
        setGameOverData(data);
        setGameOverModalVisible(true);
        setIsMyTurn(false);
        break;

      case "error":
        showNotification(data.message, "error");
        // 버튼 상태 초기화
        setIsCreatingRoom(false);
        setIsJoiningRoom(false);
        break;
    }
  };

  // ===== 이벤트 핸들러 =====
  const sendWsMessage = (payload) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(payload));
    } else {
      showNotification("서버에 연결되어 있지 않습니다.", "error");
    }
  };

  const handleCreateRoom = () => {
    setIsCreatingRoom(true);
    sendWsMessage({ type: "create_game", gameType: "baseball", nickname, options: { digits: selectedDigits } });
  };

  const handleJoinRoom = () => {
    if (!roomCodeInput || !/^\d{4}$/.test(roomCodeInput)) {
      showNotification("올바른 4자리 방 코드를 입력해주세요.", "error");
      return;
    }
    setIsJoiningRoom(true);
    sendWsMessage({ type: "join_game", roomCode: roomCodeInput, nickname });
  };
  
  const handleSetSecretNumber = () => {
    const number = secretNumberInput.trim();
    if (number.length !== selectedDigits || !/^\d+$/.test(number) || new Set(number).size !== number.length) {
      showNotification(`중복되지 않는 ${selectedDigits}자리 숫자를 입력해주세요.`, "error");
      return;
    }
    setIsSettingNumber(true);
    setMySecretNumber(number);
    sendWsMessage({ type: "set_secret", number, roomCode: gameData.roomCode });
  };
  
  const handleGuessSubmit = () => {
    const guess = guessInput.trim();
    if (!guess || guess.length !== selectedDigits || !/^\d+$/.test(guess) || new Set(guess).size !== guess.length) {
      showNotification(`중복되지 않는 ${selectedDigits}자리 숫자를 입력해주세요.`, "error");
      return;
    }
    sendWsMessage({ type: "guess", guess });
    setGuessInput('');
  };
  
  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;
    sendWsMessage({ type: "chat_message", text: chatInput });
    setChatMessages(prev => [...prev, { type: 'mine', text: chatInput }]);
    setChatInput('');
  };

  const handlePlayAgain = () => {
    sendWsMessage({ type: "play_again" });
    setGameOverModalVisible(false);
    setGameOverData(null);
    setMyGuesses([]);
    setOpponentGuesses([]);
    setChatMessages([]);
    setPageState('set_secret'); // 다시 숫자 설정 화면으로
  };

  const handleSurrender = () => {
      sendWsMessage({ type: "surrender" });
      setSurrenderModalVisible(false);
  }

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(createdRoomCode);
      showNotification("방 코드가 복사되었습니다!", "success");
    } catch (err) {
      showNotification("복사에 실패했습니다.", "error");
    }
  };
  
  const showNotification = (message, type) => {
    setNotification({ message, type });
  };

  // ===== 렌더링 함수 =====
  const renderLoading = () => (
    <div className="setup-container" style={{ textAlign: 'center', color: 'white' }}>
      <h2>서버에 연결 중입니다...</h2>
      <div className="loading-spinner" style={{ margin: '20px auto' }}></div>
    </div>
  );

  const renderSetupFlow = () => (
    <div id="setup-flow-container">
      <div className="game-intro-section">
        <div className="game-intro-header">
          <div className="game-icon-large">⚾</div>
          <div className="game-intro-content">
            <h1 className="game-title">숫자야구 설정</h1>
            <p className="game-description">숫자를 맞추는 심리전 게임! 상대방보다 먼저 정답을 찾아보세요.</p>
          </div>
        </div>
      </div>
      <div className="setup-section">
        <div className="setting-card">
          <div className="setting-header">
            <h3 className="setting-title">🔢 자릿수 설정</h3>
            <p className="setting-subtitle">게임에서 사용할 숫자의 자릿수를 선택하세요</p>
          </div>
          <div className="digits-options">
            {[3, 4, 5].map(d => (
              <label key={d} className={`digit-option ${selectedDigits === d ? 'active' : ''}`} onClick={() => setSelectedDigits(d)}>
                <input type="radio" name="digits" value={d} checked={selectedDigits === d} readOnly />
                <div className="digit-card">
                  <div className="digit-number">{d}</div>
                  <div className="digit-label">자리</div>
                  <div className="digit-desc">{d === 3 ? '쉬움' : d === 4 ? '보통' : '어려움'}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="setting-card">
          <div className="setting-header">
            <h3 className="setting-title">🎯 게임 모드 선택</h3>
            <p className="setting-subtitle">원하는 게임 방식을 선택하세요</p>
          </div>
          <div className="mode-options">
            <div className="mode-card">
              <div className="mode-icon">🤖</div>
              <div className="mode-content">
                <h4 className="mode-title">혼자하기</h4>
                <p className="mode-description">컴퓨터와 대결하며 실력을 키워보세요</p>
              </div>
              <button className="mode-button" onClick={() => router.push(`/game?type=baseball&mode=single&digits=${selectedDigits}`)}>
                <span>시작하기</span><div className="button-arrow">→</div>
              </button>
            </div>
            <div className="mode-card">
              <div className="mode-icon">👥</div>
              <div className="mode-content">
                <h4 className="mode-title">같이하기</h4>
                <p className="mode-description">친구와 함께 실시간으로 대결해보세요</p>
              </div>
              <button className="mode-button" onClick={() => setMultiOptionsVisible(true)} disabled={isMultiOptionsVisible}>
                <span>방 설정</span><div className="button-arrow">→</div>
              </button>
            </div>
          </div>
        </div>
        {isMultiOptionsVisible && !createdRoomCode && (
          <div className="setting-card" id="multi-options-card">
            <div className="setting-header">
              <h3 className="setting-title">🏠 멀티플레이 설정</h3>
              <p className="setting-subtitle">방을 만들거나 기존 방에 참가하세요</p>
            </div>
            <div className="multi-options">
              <div className="multi-option-card">
                <div className="multi-option-icon">🛠️</div>
                <div className="multi-option-content"><h4 className="multi-option-title">방 만들기</h4><p className="multi-option-desc">새로운 방을 만들고 친구를 초대하세요</p></div>
                <button className="multi-option-button" onClick={handleCreateRoom} disabled={isConnecting || isCreatingRoom}>{isCreatingRoom ? '생성 중...' : '방 만들기'}</button>
              </div>
              <div className="multi-option-card">
                <div className="multi-option-icon">🔑</div>
                <div className="multi-option-content"><h4 className="multi-option-title">방 참가하기</h4><p className="multi-option-desc">친구가 공유한 방 코드로 참가하세요</p></div>
                <div className="join-room-input">
                  <input type="text" value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value)} placeholder="방 코드 입력 (예: 1234)" maxLength="4" disabled={isConnecting} />
                  <button className="multi-option-button" onClick={handleJoinRoom} disabled={isConnecting || isJoiningRoom}>{isJoiningRoom ? '참가 중...' : '참가하기'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {createdRoomCode && (
          <div className="setting-card" id="room-created-card">
            <div className="setting-header"><h3 className="setting-title">✅ 방 생성 완료</h3><p className="setting-subtitle">아래 코드를 친구에게 공유하세요</p></div>
            <div className="room-code-display">
              <div className="room-code-container">
                <div className="room-code-label">방 코드</div>
                <div className="room-code-value">{createdRoomCode}</div>
                <button className="copy-button" onClick={copyRoomCode}>📋 복사</button>
              </div>
              <div className="waiting-message"><div className="loading-spinner"></div><span>친구가 참가하기를 기다리는 중...</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderSetSecretScreen = () => (
    <div className="setting-card">
      <div className="setting-header">
        <h3 className="setting-title">🤫 비밀 숫자 정하기</h3>
        <p className="setting-subtitle">{isSettingNumber ? "상대방이 숫자를 정하기를 기다리는 중..." : `상대방이 알아맞힐 ${selectedDigits}자리 비밀 숫자를 정해주세요 (중복 없이).`}</p>
      </div>
      <div className="join-room-input" style={{ flexDirection: 'column', gap: '1rem' }}>
        <input type="text" value={secretNumberInput} onChange={e => setSecretNumberInput(e.target.value)} placeholder="비밀 숫자 입력" maxLength={selectedDigits} disabled={isSettingNumber} />
        <button className="mode-button" style={{ width: '100%' }} onClick={handleSetSecretNumber} disabled={isSettingNumber}>확인</button>
      </div>
    </div>
  );

  const renderInGame = () => (
    <div className="baseball-ui">
      <header className="baseball-header">
        <h1>⚾ 숫자야구</h1>
        <div className="game-info">
          <span>플레이어: {gameData.myNickname} vs {gameData.opponentNickname}</span>
          <span>점수: {gameData.myScore} - {gameData.opponentScore}</span>
        </div>
      </header>
      <main className="baseball-main">
        <div className="baseball-content">
          <div className="guess-panels-container">
            <div className="baseball-panel">
              <h2>내 추측 (비밀번호: {mySecretNumber})</h2>
              <div className="guess-record">
                {myGuesses.map((g, i) => <div key={i} className={`guess-card mine ${g.result.includes(`${selectedDigits}S`) ? 'success' : ''}`}><div className="round">{g.round}회차</div><div className="details">입력: {g.guess} → 결과: {g.result}</div></div>)}
              </div>
            </div>
            <div className="baseball-panel">
              <h2>상대 추측</h2>
              <div className="guess-record">
                {opponentGuesses.map((g, i) => <div key={i} className={`guess-card theirs ${g.result.includes(`${selectedDigits}S`) ? 'success' : ''}`}><div className="round">{g.round}회차</div><div className="details">입력: {g.guess} → 결과: {g.result}</div></div>)}
              </div>
            </div>
          </div>
          <div className="chat-panel-container">
            <div className="baseball-panel">
              <h2>실시간 채팅</h2>
              <div className="chat-box">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`chat-msg ${msg.type === 'mine' ? 'mine-chat' : msg.type === 'opponent' ? 'their-chat' : 'system-chat'}`}>
                    {msg.type === 'opponent' ? `${msg.sender}: ${msg.text}` : msg.text}
                  </div>
                ))}
              </div>
              <div className="chat-input">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleChatSubmit()} placeholder="메시지를 입력하세요" />
                <button onClick={handleChatSubmit}>전송</button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="baseball-game-input">
        <input type="text" value={guessInput} onChange={e => setGuessInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && isMyTurn && handleGuessSubmit()} placeholder="숫자를 입력하세요" disabled={!isMyTurn} maxLength={selectedDigits} />
        <button onClick={handleGuessSubmit} disabled={!isMyTurn}>추측</button>
        <button className="btn-danger" onClick={() => setSurrenderModalVisible(true)}>포기</button>
      </footer>
    </div>
  );

  return (
    <>
      <Head>
        <title>숫자야구 - 햄붱이의 게임</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
        <style>{`
          @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        `}</style>
      </Head>
      <div className="baseball-setup-body">
        <header className="setup-header">
          <div className="setup-header-container">
            <div className="setup-logo">
              <Link href="/" className="logo-link"><h1>🎮 햄붱이의 게임</h1></Link>
            </div>
            <div className="setup-user-info">
              <div className="user-profile-mini">
                <div className="user-avatar-mini">👤</div>
                <span>{nickname}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="setup-main">
          <div className="setup-container">
            {pageState === 'loading' && renderLoading()}
            {pageState === 'setup' && renderSetupFlow()}
            {pageState === 'set_secret' && renderSetSecretScreen()}
            {pageState === 'in_game' && renderInGame()}
            
            {pageState !== 'in_game' && (
              <div className="setup-footer">
                <Link href="/" className="back-button">
                  <span className="back-arrow">←</span>
                  <span>홈으로 돌아가기</span>
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals and Notifications */}
      {notification && <Notification message={notification.message} type={notification.type} onEnd={() => setNotification(null)} />}
      
      {isGameOverModalVisible && gameOverData && (
        <div className="overlay show">
          <div className="result-modal">
            <h1 style={{color: gameOverData.result === 'win' ? '#28a745' : '#dc3545'}}>{gameOverData.result === 'win' ? '🎉 승리!' : '😢 패배'}</h1>
            <p>{gameOverData.message}</p>
            {gameOverData.opponentSecret && <p>상대 정답: <strong>{gameOverData.opponentSecret}</strong></p>}
            <div className="modal-actions">
              <button onClick={handlePlayAgain} className="modal-btn primary">다시하기</button>
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
    </>
  );
}
