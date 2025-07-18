import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <Head>
        <title>게임 플랫폼</title>
      </Head>
      <main className="p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">🎮 게임 목록</h1>
        <ul className="space-y-2">
          <li><Link className="text-blue-500 underline" href="/game">숫자야구 & 오목</Link></li>
          <li><Link className="text-blue-500 underline" href="/baseball/setup">숫자야구 설정</Link></li>
          <li><Link className="text-blue-500 underline" href="/omok">오목</Link></li>
          <li><Link className="text-blue-500 underline" href="/sudoku/setup">스도쿠 설정</Link></li>
          <li><Link className="text-blue-500 underline" href="/sudoku/game">스도쿠 게임</Link></li>
        </ul>
      </main>
    </>
  )
}