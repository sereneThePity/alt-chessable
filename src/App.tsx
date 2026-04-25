import { ChessTrainer } from './components/ChessTrainer'
import { useChessTrainingGame } from './game/useChessTrainingGame'

function App() {
  const game = useChessTrainingGame()

  return (
    <main className="min-h-screen bg-slate-950 px-3 py-3 text-slate-100 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto flex min-h-[calc(100svh-1.5rem)] max-w-[1600px] items-center justify-center sm:min-h-[calc(100svh-2rem)] lg:min-h-[calc(100svh-3rem)]">
        <ChessTrainer {...game} />
      </div>
    </main>
  )
}

export default App
