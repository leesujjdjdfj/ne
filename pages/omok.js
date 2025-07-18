// /pages/omok.js

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function OmokPage() {
    const router = useRouter();
    const ws = useRef(null);

    // ===== 상태 관리 =====
    const [gameState, setGameState] = useState('setup'); // setup, waiting, game
    const [nickname, setNickname] = useState('');
    const [roomCodeInput, setRoomCodeInput] = useState('');
    const [myColor, setMyColor] = useState(null);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [boardState, setBoardState] = useState(Array(15).fill(null).map(() => Array(15).fill(null)));
    const [players, setPlayers] = useState([]);
    const [selectedCoords, setSelectedCoords] = useState(null);
    const [timer, setTimer] = useState(30);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [gameOverInfo, setGameOverInfo] = useState(null);
    const [isSurrenderModalVisible, setSurrenderModalVisible] = useState(false);

    const timerInterval = useRef(null);

    // ===== 초기화 및 웹소켓 연결 =====
    useEffect(() => {
        const playerNickname = sessionStorage.getItem("playerNickname") || `Guest${Math.floor(Math.random() * 1000)}`;
        setNickname(playerNickname);

        const connectToServer = () => {
            ws.current = new WebSocket("wss://websocket-game-server-silent-brook-7828.fly.dev");

            ws.current.onopen = () => console.log("✅ 오목 서버 연결 성공");
            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("📨 오목 서버 메시지:", data);
                    handleServerMessage(data);
                } catch (error) {
                    console.error("메시지 파싱 오류:", error);
                }
            };
            ws.current.onclose = () => console.log("🔌 오목 서버 연결 종료");
        };

        connectToServer();

        return () => {
            if (ws.current) ws.current.close();
            clearInterval(timerInterval.current);
        };
    }, []);

    // ===== 서버 메시지 핸들러 =====
    const handleServerMessage = (data) => {
        switch (data.type) {
            case 'room_created':
                setGameState('waiting');
                setPlayers([{ nickname, color: null }]);
                break;
            case 'game_start':
                setGameState('game');
                setMyColor(data.myColor);
                setPlayers(data.players);
                setIsMyTurn(data.turn === data.myColor);
                if (data.turn === data.myColor) startTimer(data.timeLimit);
                addChatMessage('두 플레이어가 모두 접속했습니다. 게임을 시작합니다!', 'system');
                break;
            case 'board_update':
                setBoardState(prevBoard => {
                    const newBoard = prevBoard.map(row => [...row]);
                    newBoard[data.y][data.x] = data.color;
                    return newBoard;
                });
                break;
            case 'turn_update':
                setIsMyTurn(data.turn === myColor);
                if (data.turn === myColor) {
                    addChatMessage('당신의 턴입니다.', 'system');
                    startTimer(data.timeLimit);
                } else {
                    addChatMessage('상대방의 턴입니다.', 'system');
                    stopTimer();
                }
                break;
            case 'game_over':
                stopTimer();
                setGameOverInfo({ winner: data.winner, reason: data.reason });
                break;
            case 'chat_message':
                addChatMessage(`${data.sender}: ${data.message}`, 'opponent');
                break;
            case 'error':
                alert(`오류: ${data.message}`);
                setGameState('setup');
                break;
        }
    };
    
    // ===== 게임 로직 및 핸들러 =====
    const sendWsMessage = (payload) => ws.current?.send(JSON.stringify(payload));
    const handleCreateRoom = () => sendWsMessage({ type: 'create_game', gameType: 'omok', nickname });
    const handleJoinRoom = () => {
        if (roomCodeInput.length === 4) {
            sendWsMessage({ type: 'join_game', roomCode: roomCodeInput.toUpperCase(), nickname });
        } else {
            alert('올바른 4자리 방 코드를 입력하세요.');
        }
    };
    
    const handleBoardClick = (x, y) => {
        if (!isMyTurn || boardState[y][x]) return;
        setSelectedCoords({ x, y });
    };

    const handleConfirmMove = () => {
        if (!selectedCoords) return;
        sendWsMessage({ type: 'place_stone', ...selectedCoords });
        setSelectedCoords(null);
    };

    const addChatMessage = (text, type = 'mine') => {
        setChatMessages(prev => [...prev, { text, type }]);
    };

    const sendChatMessage = () => {
        if (!chatInput.trim()) return;
        sendWsMessage({ type: 'chat_message', message: chatInput });
        addChatMessage(`나: ${chatInput}`, 'mine');
        setChatInput('');
    };

    const startTimer = (timeLimit = 30) => {
        clearInterval(timerInterval.current);
        setTimer(timeLimit);
        timerInterval.current = setInterval(() => {
            setTimer(t => {
                if (t <= 1) {
                    clearInterval(timerInterval.current);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
    };
    
    const stopTimer = () => clearInterval(timerInterval.current);
    
    const handlePlayAgain = () => {
        sendWsMessage({ type: 'play_again' });
        setGameOverInfo(null);
        setBoardState(Array(15).fill(null).map(() => Array(15).fill(null)));
        addChatMessage('다시하기를 요청했습니다.', 'system');
    };

    // ===== 렌더링 =====
    const renderSetupScreen = () => (
        <div className="setup-screen">
            <h1>🕹️ 오목 멀티플레이</h1>
            <p>방을 만들거나 친구의 방에 참가하여 게임을 시작하세요.</p>
            <div className="room-actions">
                <button onClick={handleCreateRoom} className="btn">방 만들기</button>
                <div className="join-form">
                    <input type="text" value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value)} placeholder="방 코드 입력" maxLength="4" />
                    <button onClick={handleJoinRoom} className="btn">참가하기</button>
                </div>
            </div>
        </div>
    );

    const renderWaitingScreen = () => (
        <div className="setup-screen">
            <h1>🕹️ 오목 멀티플레이</h1>
            <div id="room-info">
                <p>방이 생성되었습니다! 아래 코드를 친구에게 공유하세요.</p>
                <strong id="room-code-display">{players[0]?.roomCode}</strong>
                <p id="waiting-message" style={{ marginTop: '1rem' }}>상대방이 참가하기를 기다리는 중...</p>
            </div>
        </div>
    );

    const renderGameScreen = () => {
        const p1 = players.find(p => p.color === 'black');
        const p2 = players.find(p => p.color === 'white');
        return (
            <div id="game-screen" className="game-screen">
                <div className="game-main-content">
                    <div id="board-area" className="board-area" style={{ position: 'relative' }}>
                        {boardState.map((row, y) => row.map((color, x) => (
                            color && <div key={`${y}-${x}`} className={`stone ${color}`} style={{ position: 'absolute', top: `calc(${y} / 14 * 100%)`, left: `calc(${x} / 14 * 100%)` }}></div>
                        )))}
                        {selectedCoords && <div className="stone-preview" style={{ position: 'absolute', top: `calc(${selectedCoords.y} / 14 * 100%)`, left: `calc(${selectedCoords.x} / 14 * 100%)`, background: myColor }}></div>}
                    </div>
                    <div className="info-panel">
                        <div className="player-info">
                            <h3>플레이어</h3>
                            <div className={`player-card ${isMyTurn && myColor === 'black' ? 'active' : ''}`}>
                                <span className="player-name"><span className="player-stone black"></span><span>{p1?.nickname}</span></span>
                            </div>
                            <div className={`player-card ${isMyTurn && myColor === 'white' ? 'active' : ''}`}>
                                <span className="player-name"><span className="player-stone white"></span><span>{p2?.nickname}</span></span>
                            </div>
                        </div>
                        <div className="timer-info">
                            <h3>남은 시간</h3>
                            <div id="timer" className={timer <= 5 ? 'danger' : timer <= 10 ? 'warning' : ''}>{timer}</div>
                        </div>
                        <div className="chat-panel">
                            <h3>채팅</h3>
                            <div id="chat-messages">
                                {chatMessages.map((msg, i) => <div key={i} className={`chat-msg ${msg.type}`}>{msg.text}</div>)}
                            </div>
                        </div>
                    </div>
                </div>
                <div id="ingame-actions" className="ingame-actions">
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendChatMessage()} placeholder="메시지 입력..." />
                    <button onClick={sendChatMessage} className="btn">전송</button>
                    <button onClick={handleConfirmMove} className="btn" disabled={!selectedCoords || !isMyTurn}>착수</button>
                    <button onClick={() => setSurrenderModalVisible(true)} className="btn btn-danger">포기</button>
                </div>
            </div>
        );
    };

    return (
        <div className="omok-body">
            <Head><title>오목 멀티플레이</title></Head>
            <div className="game-container">
                {gameState === 'setup' && renderSetupScreen()}
                {gameState === 'waiting' && renderWaitingScreen()}
                {gameState === 'game' && renderGameScreen()}
            </div>
            {gameOverInfo && (
                <div id="game-over-modal" className="modal-overlay">
                    <div className="modal-content">
                        <h2 className={gameOverInfo.winner === nickname ? 'win' : 'lose'}>{gameOverInfo.winner === nickname ? '🎉 승리! 🎉' : '😢 패배 😢'}</h2>
                        <p>{gameOverInfo.reason}</p>
                        <div className="modal-actions">
                            <button onClick={handlePlayAgain} className="btn">다시하기</button>
                            <Link href="/" className="btn">홈으로</Link>
                        </div>
                    </div>
                </div>
            )}
            {isSurrenderModalVisible && (
                 <div id="surrender-modal" className="modal-overlay">
                    <div className="modal-content">
                        <h2 style={{ marginBottom: '1rem' }}>게임 포기</h2>
                        <p>정말로 게임을 포기하시겠습니까?</p>
                        <div className="modal-actions">
                            <button onClick={() => { sendWsMessage({ type: 'surrender' }); setSurrenderModalVisible(false); }} className="btn btn-danger">예, 포기합니다</button>
                            <button onClick={() => setSurrenderModalVisible(false)} className="btn">아니오</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
