// /pages/sudoku-setup.js

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function SudokuSetup() {
    const router = useRouter();
    const ws = useRef(null);

    const [nickname, setNickname] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
    const [isMultiOptionsVisible, setMultiOptionsVisible] = useState(false);
    const [wsStatus, setWsStatus] = useState('connecting'); // connecting, open, closed

    useEffect(() => {
        const playerNickname = sessionStorage.getItem("playerNickname");
        if (!playerNickname) {
            router.push('/');
            return;
        }
        setNickname(playerNickname);

        const connect = () => {
            ws.current = new WebSocket("wss://websocket-game-server-silent-brook-7828.fly.dev");
            ws.current.onopen = () => setWsStatus('open');
            ws.current.onclose = () => setWsStatus('closed');
            ws.current.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data.replace(/^echo:\s*/, ""));
                    if (msg.type === "start_game") {
                        sessionStorage.setItem("sudokuPuzzle", JSON.stringify(msg.puzzle));
                        sessionStorage.setItem("sudokuSolution", JSON.stringify(msg.solution));
                        router.push(`/game?type=sudoku&mode=multi&difficulty=${selectedDifficulty}&roomCode=${msg.roomCode}`);
                    } else if (msg.type === "room_created") {
                        alert(`방 생성 완료! 코드: ${msg.roomCode}. 친구를 기다려주세요.`);
                    } else if (msg.type === "error") {
                        alert(`오류: ${msg.message}`);
                    }
                } catch (e) {
                    console.warn("메시지 파싱 실패:", event.data);
                }
            };
        };

        connect();

        return () => ws.current?.close();
    }, [router]);

    const handleSinglePlay = () => {
        router.push(`/game?type=sudoku&mode=single&difficulty=${selectedDifficulty}`);
    };

    const sendWsMessage = (payload) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(payload));
        } else {
            alert("서버에 연결되지 않았습니다. 잠시 후 다시 시도해주세요.");
        }
    };

    const handleCreateRoom = () => {
        sendWsMessage({ type: "create_room", game: "sudoku", nickname, difficulty: selectedDifficulty });
    };

    const handleJoinRoom = () => {
        const code = prompt("참가할 방 코드를 입력하세요 (예: ABCD):")?.toUpperCase();
        if (code && code.length === 4) {
            sendWsMessage({ type: "join_room", game: "sudoku", roomCode: code, nickname });
        } else {
            alert("올바른 4자리 방 코드를 입력하세요.");
        }
    };

    return (
        <div className="baseball-setup-body">
            <Head><title>스도쿠 설정</title></Head>
            <header className="setup-header">
                <div className="setup-header-container">
                    <div className="setup-logo"><Link href="/" className="logo-link"><h1>🎮 햄붱이의 게임</h1></Link></div>
                    <div className="setup-user-info"><div className="user-profile-mini"><div className="user-avatar-mini">👤</div><span>{nickname}</span></div></div>
                </div>
            </header>
            <main className="setup-main">
                <div className="setup-container">
                    <div className="game-intro-section">
                        <div className="game-intro-header">
                            <div className="game-icon-large">🧩</div>
                            <div className="game-intro-content">
                                <h1 className="game-title">스도쿠 설정</h1>
                                <p className="game-description">논리와 추론으로 9x9 그리드를 숫자로 채워보세요.</p>
                            </div>
                        </div>
                    </div>
                    <div className="setup-section">
                        <div className="setting-card">
                            <div className="setting-header"><h3 className="setting-title">🔥 난이도 설정</h3><p className="setting-subtitle">자신의 실력에 맞는 난이도를 선택하세요.</p></div>
                            <div className="digits-options difficulty-options">
                                {['easy', 'medium', 'hard'].map(diff => (
                                    <label key={diff} className={`digit-option ${selectedDifficulty === diff ? 'active' : ''}`} onClick={() => setSelectedDifficulty(diff)}>
                                        <input type="radio" name="difficulty" value={diff} checked={selectedDifficulty === diff} readOnly />
                                        <div className="digit-card"><div className="difficulty-label">{diff === 'easy' ? '쉬움' : diff === 'medium' ? '보통' : '어려움'}</div></div>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="setting-card">
                            <div className="setting-header"><h3 className="setting-title">🎯 게임 모드 선택</h3><p className="setting-subtitle">원하는 게임 방식을 선택하세요.</p></div>
                            <div className="mode-options">
                                <div className="mode-card"><div className="mode-icon">🤖</div><h4 className="mode-title">혼자하기</h4><p className="mode-description">클래식 스도쿠 퍼즐을 풀어보세요.</p><button className="mode-button" onClick={handleSinglePlay}>시작하기</button></div>
                                <div className="mode-card"><div className="mode-icon">👥</div><h4 className="mode-title">같이하기</h4><p className="mode-description">친구와 누가 더 빨리 푸는지 대결해보세요.</p><button className="mode-button" onClick={() => setMultiOptionsVisible(true)} disabled={isMultiOptionsVisible}>방 설정</button></div>
                            </div>
                        </div>
                        {isMultiOptionsVisible && (
                            <div className="setting-card">
                                <div className="setting-header"><h3 className="setting-title">📡 멀티플레이 방 설정</h3><p className="setting-subtitle">친구와 함께 플레이하려면 방을 생성하거나 참가하세요.</p></div>
                                <div className="multi-options">
                                    <button onClick={handleCreateRoom} className="mode-button" disabled={wsStatus !== 'open'}>방 만들기</button>
                                    <button onClick={handleJoinRoom} className="mode-button" disabled={wsStatus !== 'open'}>방 참가하기</button>
                                </div>
                                {wsStatus !== 'open' && <p style={{textAlign: 'center', color: 'white', marginTop: '1rem'}}>서버에 연결 중입니다...</p>}
                            </div>
                        )}
                    </div>
                </div>
                <div className="setup-footer"><Link href="/" className="back-button"><span>←</span> 홈으로 돌아가기</Link></div>
            </main>
        </div>
    );
}
