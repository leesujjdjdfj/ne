import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface User {
  id: string;
  nickname: string;
  isGuest: boolean;
}

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      const user: User = JSON.parse(savedUser);
      setCurrentUser(user);
      sessionStorage.setItem("playerNickname", user.nickname);
    }
  }, []);

  const handleGameSelection = (gameType: 'omok' | 'sudoku' | 'baseball') => {
    if (!currentUser) {
      alert("먼저 로그인해주세요!");
      return;
    }
    if (gameType === 'omok') {
      router.push('/omok');
    } else {
      router.push(`/${gameType}-setup`);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    sessionStorage.removeItem("playerNickname");
    alert("로그아웃되었습니다.");
  };

  const confirmGuestNickname = () => {
    const nickname = nicknameInput.trim();
    if (nickname.length >= 2 && nickname.length <= 10) {
      const guestUser: User = { id: `guest_${Date.now()}`, nickname, isGuest: true };
      setCurrentUser(guestUser);
      localStorage.setItem("currentUser", JSON.stringify(guestUser));
      sessionStorage.setItem("playerNickname", guestUser.nickname);
      setNicknameInput('');
    } else {
      alert("닉네임은 2~10글자로 입력해주세요.");
    }
  };

  return (
    <>
      <Head>
        <title>햄붱이의 게임</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="/style.css" />
      </Head>
      <div className="header">
        <div className="header-container">
          <div className="logo"><h1>🎮 햄붱이의 게임</h1></div>
          <div className="user-section">
            {currentUser ? (
              <div id="user-section">
                <span id="user-nickname">{currentUser.nickname}</span>
                <button className="btn btn-outline btn-small" onClick={handleLogout}>로그아웃</button>
              </div>
            ) : (
              <div id="guest-section">
                <input
                  type="text"
                  id="guest-nickname-input"
                  placeholder="닉네임 (2~10자)"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                />
                <button onClick={confirmGuestNickname} className="btn btn-primary">게스트 시작</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="main-container">
        <section className="screen active" id="home-screen">
          <div className="hero-section">
            <h2 className="hero-title">햄붱이의 게임에 오신 것을 환영합니다!</h2>
            <p className="hero-subtitle">다양한 미니게임을 친구와 함께 즐겨보세요.</p>
          </div>

          <div className="games-section">
            <h3 className="section-title">플레이할 게임을 선택하세요</h3>
            <div className="game-cards">
              <div className="game-card" onClick={() => handleGameSelection('baseball')}>
                <div className="game-icon">⚾</div>
                <div className="game-content">
                  <h4 className="game-title">숫자야구</h4>
                  <p className="game-description">상대방의 숫자를 추리해보세요</p>
                </div>
              </div>
              <div className="game-card" onClick={() => handleGameSelection('sudoku')}>
                <div className="game-icon">🧩</div>
                <div className="game-content">
                  <h4 className="game-title">스도쿠</h4>
                  <p className="game-description">논리 퍼즐의 정석</p>
                </div>
              </div>
              <div className="game-card" onClick={() => handleGameSelection('omok')}>
                <div className="game-icon">⭕❌</div>
                <div className="game-content">
                  <h4 className="game-title">오목</h4>
                  <p className="game-description">먼저 다섯 개를 만들어보세요</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
