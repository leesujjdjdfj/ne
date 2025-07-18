// /pages/index.js

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// 이 컴포넌트는 기존의 홈페이지(index.html)와 home.js의 기능을 모두 담당합니다.
export default function Home() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [activeScreen, setActiveScreen] = useState('home'); // home, rules, board
  
  // 모달 상태 관리
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setRegisterModalOpen] = useState(false);
  const [isNicknameModalOpen, setNicknameModalOpen] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  
  // 닉네임 입력 상태
  const [nicknameInput, setNicknameInput] = useState('');

  // 컴포넌트 마운트 시 사용자 정보 불러오기
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      sessionStorage.setItem("playerNickname", user.nickname);
    }
  }, []);

  // ===== 사용자 관련 함수 =====
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    sessionStorage.removeItem("playerNickname");
    alert("로그아웃되었습니다.");
  };

  const handleGuestLogin = () => {
    setLoginModalOpen(false);
    setNicknameModalOpen(true);
  };

  const confirmGuestNickname = () => {
    const nickname = nicknameInput.trim();
    if (nickname.length >= 2 && nickname.length <= 10) {
      const guestUser = { id: `guest_${Date.now()}`, nickname: nickname, isGuest: true };
      setCurrentUser(guestUser);
      localStorage.setItem("currentUser", JSON.stringify(guestUser));
      sessionStorage.setItem("playerNickname", guestUser.nickname);
      setNicknameModalOpen(false);
      setNicknameInput('');
    } else {
      alert("닉네임은 2~10글자로 입력해주세요.");
    }
  };
  
  // ===== 게임 선택 함수 =====
  const handleGameSelection = (gameType) => {
    if (!currentUser) {
      alert("먼저 로그인해주세요!");
      setLoginModalOpen(true);
      return;
    }
    
    // 게임 설정 페이지로 이동
    if (gameType === 'omok') {
        router.push('/omok');
    } else {
        router.push(`/${gameType}-setup`);
    }
  };

  // ===== UI 렌더링 함수 =====
  const renderModals = () => (
    <>
      {/* 로그인 모달 */}
      {isLoginModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>로그인</h3>
              <button className="modal-close" onClick={() => setLoginModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{textAlign: 'center', marginBottom: '1.5rem', color: '#666'}}>
                서비스를 이용하시려면 로그인해주세요.
              </p>
              <div className="mode-options" style={{gridTemplateColumns: '1fr'}}>
                <div className="mode-card" onClick={handleGuestLogin} style={{cursor: 'pointer'}}>
                  <div className="mode-icon">👤</div>
                  <h4>게스트로 시작하기</h4>
                  <p>간편하게 닉네임만 설정하고 시작합니다.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 닉네임 설정 모달 */}
      {isNicknameModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>게스트 닉네임 설정</h3>
              <button className="modal-close" onClick={() => setNicknameModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body nickname-setup">
              <p>사용하실 닉네임을 입력해주세요.</p>
              <div className="form-group">
                <input 
                  type="text" 
                  id="guest-nickname-input" 
                  placeholder="2~10글자" 
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" style={{width: '100%'}} onClick={confirmGuestNickname}>확인</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <Head>
        <title>햄붱이의 게임</title>
        <meta name="description" content="다양한 웹게임을 즐겨보세요!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div>
        <header className="header">
          <div className="header-container">
            <div className="logo"><h1>🎮 햄붱이의 게임</h1></div>
            <div className="user-section">
              {currentUser ? (
                <div id="user-section">
                  <div className="user-profile">
                    <div className="user-avatar">👤</div>
                    <span id="user-nickname">{currentUser.nickname}</span>
                  </div>
                  <button id="logout-btn" className="btn btn-outline btn-small" onClick={handleLogout}>로그아웃</button>
                </div>
              ) : (
                <div id="guest-section">
                  <button id="login-btn" className="btn btn-primary" onClick={() => setLoginModalOpen(true)}>로그인</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="main-container">
          <section className="screen active" id="home-screen">
            <div className="hero-section">
              <h2 className="hero-title">햄붱이의 게임에 오신 것을 환영합니다!</h2>
              <p className="hero-subtitle">다양한 미니게임을 친구와 함께 즐겨보세요.</p>
            </div>
            <div className="games-section">
              <h3 className="section-title">플레이할 게임을 선택하세요</h3>
              <div className="game-cards">
                <div className="game-card" data-game="baseball" onClick={() => handleGameSelection('baseball')}>
                  <div className="game-icon">⚾</div>
                  <div className="game-content">
                    <h4 className="game-title">숫자야구</h4>
                    <p className="game-description">상대방의 비밀 숫자를 먼저 맞추는 클래식 두뇌 게임입니다.</p>
                  </div>
                </div>
                <div className="game-card" data-game="omok" onClick={() => handleGameSelection('omok')}>
                  <div className="game-icon">⚫⚪</div>
                  <div className="game-content">
                    <h4 className="game-title">오목</h4>
                    <p className="game-description">흑돌과 백돌, 다섯 개의 돌을 나란히 놓아 승리를 쟁취하세요.</p>
                  </div>
                </div>
                <div className="game-card" data-game="sudoku" onClick={() => handleGameSelection('sudoku')}>
                  <div className="game-icon">🧩</div>
                  <div className="game-content">
                    <h4 className="game-title">스도쿠</h4>
                    <p className="game-description">논리적으로 숫자를 채워 9x9 그리드를 완성하는 싱글/멀티 플레이 게임입니다.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
        
        {renderModals()}
      </div>
    </>
  );
}
