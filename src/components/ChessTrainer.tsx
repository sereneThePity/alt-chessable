import { Chessboard } from 'react-chessboard'
import type { ChessboardOptions } from 'react-chessboard'
import type { PositionAnalysis } from '../game/usePositionAnalysis'
import { PositionAnalysisPanel } from './PositionAnalysisPanel'

type ChessTrainerProps = {
  analysis: PositionAnalysis
  analysisDepth: number
  analysisDepthOptions: number[]
  boardKey: number
  canGoBack: boolean
  canGoForward: boolean
  feedback: string
  onAnalysisDepthChange: (depth: number) => void
  onGoBack: () => void
  onGoForward: () => void
  onPieceDrop: NonNullable<ChessboardOptions['onPieceDrop']>
  onReset: () => void
  onSquareClick: NonNullable<ChessboardOptions['onSquareClick']>
  position: string
  squareStyles: NonNullable<ChessboardOptions['squareStyles']>
  status: string
}

export function ChessTrainer({
  analysis,
  analysisDepth,
  analysisDepthOptions,
  boardKey,
  canGoBack,
  canGoForward,
  feedback,
  onAnalysisDepthChange,
  onGoBack,
  onGoForward,
  onPieceDrop,
  onReset,
  onSquareClick,
  position,
  squareStyles,
  status,
}: ChessTrainerProps) {
  return (
    <section className="grid min-h-full w-full gap-6 rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur sm:p-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-8 lg:p-8">
      <div className="flex w-full items-center justify-center">
        <div className="w-full max-w-[min(calc(100svh-18rem),calc(100vw-2rem))] sm:max-w-[min(calc(100svh-16rem),calc(100vw-3rem))] lg:max-w-[min(calc(100svh-7rem),calc(100vw-30rem))]">
          <Chessboard
            key={boardKey}
            options={{
              id: 'training-board',
              position,
              onPieceDrop,
              onSquareClick,
              boardStyle: {
                width: '100%',
                borderRadius: '1rem',
                boxShadow: '0 24px 48px rgba(2, 6, 23, 0.4)',
              },
              lightSquareStyle: { backgroundColor: '#e2e8f0' },
              darkSquareStyle: { backgroundColor: '#475569' },
              dropSquareStyle: {
                boxShadow: 'inset 0 0 0 4px rgba(59, 130, 246, 0.45)',
              },
              squareStyles,
            }}
          />
        </div>
      </div>

      <div className="flex flex-col justify-center gap-6">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Chess Trainer
        </h1>

        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
            Game status
          </p>
          <p className="mt-2 text-lg font-semibold text-white">{status}</p>
          <p className="mt-2 min-h-6 text-sm text-slate-300">{feedback}</p>
        </div>

        <PositionAnalysisPanel
          analysis={analysis}
          analysisDepth={analysisDepth}
          depthOptions={analysisDepthOptions}
          onAnalysisDepthChange={onAnalysisDepthChange}
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onGoBack}
            disabled={!canGoBack}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={onGoForward}
            disabled={!canGoForward}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Go forward
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  )
}
