import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="text-7xl mb-4 select-none">🧠</div>
        <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">
          Guess My Rating
        </h1>
        <p className="text-gray-400 text-lg mb-14">
          How well do you know each other?
        </p>

        <div className="w-full flex flex-col gap-4">
          <Link
            href="/host"
            className="w-full h-16 bg-indigo-600 text-white font-bold text-xl rounded-2xl flex items-center justify-center shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Create a game 🎮
          </Link>
          <Link
            href="/join"
            className="w-full h-16 bg-white text-indigo-600 font-bold text-xl rounded-2xl flex items-center justify-center border-2 border-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all"
          >
            Join a game
          </Link>
        </div>

        <p className="text-gray-300 text-sm mt-12">
          2 players · Mobile-first · No account needed
        </p>
      </div>
    </div>
  )
}
