// /pages/baseball-setup.tsx

import { useState, useEffect, useRef, FC } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

// 타입 정의 (오류 수정됨)
type PageState = 'loading' | 'setup' | 'set_secret' | 'in_game';

interface GameData {
  myNickname: string;
  opponentNickname: string;
  myScore: number;
  opponentScore: number;
  roomCode: string;
}

interface Guess {
  round: number;
  guess: string;
  result: string;
  isSuccess: boolean;
}

interface ChatMessage {
  type: 'mine' | 'opponent' | 'system';
  sender?: string;
  text: string;
}

interface GameOverData {
  result: 'win' | 'lose' | 'draw';
  message: string;
  opponentSecret?: string;
  myScore?: number;
  opponentScore?: number;
}

interface NotificationData {
  message: string;
  type: 'success' | 'error' | 'info';
}

const Notification: FC<{ data: NotificationData; onEnd: () => void }> = ({ data, onEnd }) => {
  useEffect(() => {
    const timer = setTimeout(onEnd, 3000);
    return () => clearTimeout(timer);
  }, [onEnd]);

  const style = {
      position: 'fixed' as 'fixed', top: '20px', right: '20px', padding: '1rem 1.5rem',
      color: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 10000, fontWeight: 500, maxWidth: '300px',
      background: data.type === 'success' ? '#27ae60' : data.type === 'error' ? '#e74c3c' : '#3498db',
      animation: 'slideIn 0.3s ease, slideOut 0.3s ease 2.7s forwards'
  };

  return <div style={style}>{data.message}</div>;
};

const BaseballSetup: FC = () => {
  const router = useRouter();
  const ws = useRef<WebSocket | null>(null);

  const [pageState, setPageState] = useState<PageState>('loading');
  const [nickname, setNickname] = useState('');
  const [selectedDigits, setSelectedDigits] = useState(3);
  const [isMultiOptionsVisible, setMultiOptionsVisible] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  
  const [mySecretNumber, setMySecretNumber] = useState('');
  const [secretNumberInput, setSecretNumberInput] = useState('');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [myGuesses, setMyGuesses] = useState<Guess[]>([]);
  const [opponentGuesses, setOpponentGuesses] = useState<Guess[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [isMyTurn, setIsMyTurn] = useState(false);

  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [isGameOverModalVisible, setGameOverModalVisible] = useState(false);
  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);
  const [isSurrenderModalVisible, setSurrenderModalVisible] = useState(false);
  
  const [isConnecting, setIsConnecting] = useState(true);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isSettingNumber, setIsSettingNumber] = useState(false);

  useEffect(() => {
    const playerNickname = sessionStorage.getItem("playerNickname");
    if (!playerNickname) {
      router.push('/');
      return;
    }
    setNickname(playerNickname);

    const connectToServer = () => {
      // 이미 연결이 있거나 연결 중이면 중복 실행 방지
      if (ws.current && ws.current.readyState < 2) return;

      ws.current = new WebSocket("wss://websocket-game-server-silent-brook-7828.fly.dev");
      setIsConnecting(true);

      ws.current.onopen = () => {
        console.log("✅ 숫자야구 서버 연결 성공");
        showNotification({ message: "서버에 연결되었습니다.", type: "success" });
        setIsConnecting(false);
        setPageState('setup');
      };

      ws.current.onmessage = (event) => handleServerMessage(JSON.parse(event.data));
      
      ws.current.onclose = () => {
        console.log("🔌 숫자야구 서버 연결 종료");
        // 게임 중이 아닐 때만 재연결 시도
        if (pageState !== 'in_game') {
            setIsConnecting(true);
            showNotification({ message: "서버 연결이 끊겼습니다. 3초 후 재연결합니다.", type: "error" });
            setTimeout(connectToServer, 3000);
        }
      };
      
      ws.current.onerror = () => {
        showNotification({ message: "서버 연결에 실패했습니다.", type: "error" });
        setIsConnecting(true);
      };
    };

    connectToServer();

    return () => {
        if(ws.current) {
            ws.current.onclose = null; // 재연결 로직 제거
            ws.current.close();
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // 의존성 배열에서 pageState 제거

  const handleServerMessage = (data: any) => {
    console.log("📨 수신:", data);
    switch (data.type) {
      case "game_created":
        setCreatedRoomCode(data.roomCode);
        showNotification({ message: "방이 생성되었습니다! 친구를 기다리세요.", type: "success" });
        setIsCreatingRoom(false);
        break;
      case "prompt_secret":
        setPageState('set_secret');
        setSelectedDigits(data.digits || selectedDigits);
        setGameData(prev => ({ ...(prev as GameData), roomCode: data.roomCode }));
        break;
      case "game_ready":
        setPageState('in_game');
        setGameData(data);
        setIsMyTurn(data.isMyTurn);
        addChatMessage({ type: 'system', text: data.message });
        break;
      case "update":
        const isSuccess = data.result.includes(`${selectedDigits}S`);
        const newGuess = { round: (data.by === 'me' ? myGuesses.length : opponentGuesses.length) + 1, guess: data.guess, result: data.result, isSuccess };
        if (data.by === 'me') setMyGuesses(prev => [...prev, newGuess]);
        else setOpponentGuesses(prev => [...prev, newGuess]);
        break;
      case "info":
        setIsMyTurn(data.isMyTurn);
        addChatMessage({ type: 'system', text: data.message });
        break;
      case "chat_message":
        addChatMessage({ type: 'opponent', sender: data.senderNickname, text: data.text });
        break;
      case "game_over":
        setGameOverData(data);
        if(data.myScore !== undefined && data.opponentScore !== undefined && gameData) {
            setGameData({...gameData, myScore: data.myScore, opponentScore: data.opponentScore});
        }
        setGameOverModalVisible(true);
        setIsMyTurn(false);
        break;
      case "error":
        showNotification({ message: data.message, type: "error" });
        setIsCreatingRoom(false);
        setIsJoiningRoom(false);
        break;
    }
  };
  
  const sendWsMessage = (payload: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(payload));
    } else {
      showNotification({ message: "서버에 연결되어 있지 않습니다.", type: "error" });
    }
  };

  const addChatMessage = (message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  };
  
  const showNotification = (data: NotificationData) => {
    setNotification(data);
  };
  
  const handleCreateRoom = () => {
    setIsCreatingRoom(true);
    sendWsMessage({ type: "create_game", gameType: "baseball", nickname, options: { digits: selectedDigits } });
  };

  const handleJoinRoom = () => {
    if (!roomCodeInput || !/^\d{4}$/.test(roomCodeInput)) {
      showNotification({ message: "올바른 4자리 방 코드를 입력해주세요.", type: "error" });
      return;
    }
    setIsJoiningRoom(true);
    sendWsMessage({ type: "join_game", roomCode: roomCodeInput, nickname });
  };
  
  const handleSetSecretNumber = () => {
    const number = secretNumberInput.trim();
    if (number.length !== selectedDigits || !/^\d+$/.test(number) || new Set(number).size !== number.length) {
      showNotification({ message: `중복되지 않는 ${selectedDigits}자리 숫자를 입력해주세요.`, type: "error" });
      return;
    }
    setIsSettingNumber(true);
    setMySecretNumber(number);
    sendWsMessage({ type: "set_secret", number: number, roomCode: gameData?.roomCode });
  };
  
  const handleGuessSubmit = () => {
    const guess = guessInput.trim();
    if (!guess || guess.length !== selectedDigits || !/^\d+$/.test(guess) || new Set(guess).size !== guess.length) {
      showNotification({ message: `중복되지 않는 ${selectedDigits}자리 숫자를 입력해주세요.`, type: "error" });
      return;
    }
    sendWsMessage({ type: "guess", guess: guess });
    setGuessInput('');
  };
  
  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;
    sendWsMessage({ type: "chat_message", text: chatInput });
    addChatMessage({ type: 'mine', text: chatInput });
    setChatInput('');
  };

  const handlePlayAgain = () => {
    sendWsMessage({ type: "play_again" });
    setGameOverModalVisible(false);
    setGameOverData(null);
    setMyGuesses([]);
    setOpponentGuesses([]);
    setChatMessages([]);
    setPageState('set_secret');
    setIsSettingNumber(false);
    setSecretNumberInput('');
  };

  const handleSurrender = () => {
      sendWsMessage({ type: "surrender" });
      setSurrenderModalVisible(false);
  }

  const copyRoomCode = async () => {
    if (!createdRoomCode) return;
    try {
      await navigator.clipboard.writeText(createdRoomCode);
      showNotification({ message: "방 코드가 복사되었습니다!", type: "success" });
    } catch (err) {
      showNotification({ message: "복사에 실패했습니다.", type: "error" });
    }
  };

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
                  <input type="text" value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value)} placeholder="방 코드 입력 (예: 1234)" maxLength={4} disabled={isConnecting} />
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
          <span>플레이어: {gameData?.myNickname} vs {gameData?.opponentNickname}</span>
          <span>점수: {gameData?.myScore} - {gameData?.opponentScore}</span>
        </div>
      </header>
      <main className="baseball-main">
        <div className="baseball-content">
          <div className="guess-panels-container">
            <div className="baseball-panel">
              <h2>내 추측 (비밀번호: {mySecretNumber})</h2>
              <div className="guess-record">
                {myGuesses.map((g, i) => <div key={i} className={`guess-card mine ${g.isSuccess ? 'success' : ''}`}><div className="round">{g.round}회차</div><div className="details">입력: {g.guess} → 결과: {g.result}</div></div>)}
              </div>
            </div>
            <div className="baseball-panel">
              <h2>상대 추측</h2>
              <div className="guess-record">
                {opponentGuesses.map((g, i) => <div key={i} className={`guess-card theirs ${g.isSuccess ? 'success' : ''}`}><div className="round">{g.round}회차</div><div className="details">입력: {g.guess} → 결과: {g.result}</div></div>)}
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
        <title>숫자야구 설정</title>
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
            {pageState === 'loading' && <div style={{ textAlign: 'center', color: 'white' }}><h2>서버에 연결 중입니다...</h2><div className="loading-spinner" style={{ margin: '20px auto' }}></div></div>}
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

      {notification && <Notification data={notification} onEnd={() => setNotification(null)} />}
      
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
};

export default BaseballSetup;
