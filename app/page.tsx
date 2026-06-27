import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <svg width="100%" viewBox="0 0 400 390" className="mb-6" style={{maxWidth:'460px', display:'block'}}>
          <defs>
            <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor:'#0EA5E9'}}/>
              <stop offset="50%" style={{stopColor:'#38BDF8'}}/>
              <stop offset="100%" style={{stopColor:'#0284C7'}}/>
            </linearGradient>
            <linearGradient id="txtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor:'#BAE6FD'}}/>
              <stop offset="100%" style={{stopColor:'#7DD3FC'}}/>
            </linearGradient>
          </defs>
          <path d="M 50 200 Q 200 50 350 200" stroke="url(#arcGrad)" strokeWidth="25" fill="none" strokeLinecap="round"/>
          <path d="M 50 200 Q 200 350 350 200" stroke="url(#arcGrad)" strokeWidth="25" fill="none" strokeLinecap="round"/>
          <g transform="translate(200,80)"><path d="M 0,-20 L 5,-8 L 18,-5 L 9,3 L 12,18 L 0,12 L -12,18 L -9,3 L -18,-5 L -5,-8 Z" fill="#38BDF8"/></g>
          <g transform="translate(80,120)"><path d="M 0,-12 L 3,-5 L 11,-3 L 5,2 L 7,11 L 0,7 L -7,11 L -5,2 L -11,-3 L -3,-5 Z" fill="#38BDF8"/></g>
          <g transform="translate(320,120)"><path d="M 0,-12 L 3,-5 L 11,-3 L 5,2 L 7,11 L 0,7 L -7,11 L -5,2 L -11,-3 L -3,-5 Z" fill="#38BDF8"/></g>
          <g transform="translate(80,280)"><path d="M 0,-12 L 3,-5 L 11,-3 L 5,2 L 7,11 L 0,7 L -7,11 L -5,2 L -11,-3 L -3,-5 Z" fill="#38BDF8"/></g>
          <g transform="translate(320,280)"><path d="M 0,-12 L 3,-5 L 11,-3 L 5,2 L 7,11 L 0,7 L -7,11 L -5,2 L -11,-3 L -3,-5 Z" fill="#38BDF8"/></g>
          <text x="202" y="242" textAnchor="middle" fontSize="140" fontWeight="900" fill="#0C4A6E" opacity="0.4" fontFamily="Arial, sans-serif">GMR</text>
          <text x="200" y="240" textAnchor="middle" fontSize="140" fontWeight="900" fill="url(#txtGrad)" stroke="#0EA5E9" strokeWidth="3" fontFamily="Arial, sans-serif">GMR</text>
          <text x="200" y="330" textAnchor="middle" fontSize="28" fontWeight="800" fill="#f8fafc" fontFamily="Arial, sans-serif">Guess My Rating</text>
          <text x="200" y="360" textAnchor="middle" fontSize="18" fontWeight="500" fill="#94a3b8" fontFamily="Arial, sans-serif">How well do you know each other?</text>
        </svg>

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
