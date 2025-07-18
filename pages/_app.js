import '../styles/style.css'; // style.css 파일을 전역으로 불러옵니다.

// 이 함수는 모든 페이지 컴포넌트를 감싸는 역할을 합니다.
function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp;