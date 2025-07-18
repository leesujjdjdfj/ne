// /pages/sudoku-setup.tsx

import { useState, useEffect, useRef, FC } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

type Difficulty = 'easy' | 'medium' | 'hard';
type WsStatus = 'connecting' | 'open' | 'closed';

const SudokuSetup: FC = () => {
    const router = useRouter();
    const ws = useRef<WebSocket | null>(null);

    const [nickname, setNickname] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('easy');
    const [isMultiOptionsVisible, setMultiOptionsVisible] = useState(false);
    const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');

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
    }, [router, selectedDifficulty]);

    const handleSinglePlay = () => {
        router.push(`/game?type=sudoku&mode=single&difficulty=${selectedDifficulty}`);
    };

    const sendWsMessage = (payload: object) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(payload));
        } else {
            alert("서버에 연결되지 않았습니다.");
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
                    {/* UI 렌더링 로직 (이전 JS 컴포넌트와 동일) */}
                </div>
            </main>
        </div>
    );
};

export default SudokuSetup;
