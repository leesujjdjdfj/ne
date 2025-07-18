import Head from 'next/head';

const Home = () => {
  return (
    <>
      <Head>
        <title>NE 게임 플랫폼</title>
        <meta name="description" content="Next.js 멀티 게임 플랫폼" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>🎮 NE 게임 플랫폼에 오신 것을 환영합니다</h1>
        <p>여기서 오목, 스도쿠, 숫자야구 게임을 즐길 수 있습니다!</p>

        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li><a href="/omok">👉 오목 게임 시작</a></li>
          <li><a href="/sudoku-setup">👉 스도쿠 시작</a></li>
          <li><a href="/baseball-setup">👉 숫자야구 시작</a></li>
        </ul>
      </main>
    </>
  );
};

export default Home;
