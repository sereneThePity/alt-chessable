import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  Chess,
  SQUARES,
  type Move,
  type Square,
} from 'chess.js'
import type { ChessboardOptions } from 'react-chessboard'
import {
  analysisDepthOptions,
  usePositionAnalysis,
  type PositionAnalysis,
} from './usePositionAnalysis'

const startingPosition = new Chess().fen()
const squareSet = new Set<string>(SQUARES)

type PlayedMove = {
  from: Square
  to: Square
}

function isSquare(value: string | null): value is Square {
  return value !== null && squareSet.has(value)
}

function getStatus(game: Chess) {
  const activeColor = game.turn() === 'w' ? 'White' : 'Black'

  if (game.isCheckmate()) {
    return `${activeColor} is checkmated.`
  }

  if (game.isDraw()) {
    return 'Game drawn.'
  }

  if (game.isCheck()) {
    return `${activeColor} to move and in check.`
  }

  return `${activeColor} to move.`
}

function getPlayablePiece(game: Chess, square: Square) {
  const piece = game.get(square)

  if (!piece || piece.color !== game.turn()) {
    return null
  }

  return piece
}

function getLegalMoves(game: Chess, square: Square) {
  return game.moves({ square, verbose: true })
}

function buildSquareStyles(
  lastMove: PlayedMove | null,
  selectedSquare: Square | null,
  legalTargets: Square[],
) {
  const squareStyles: Record<string, CSSProperties> = {}

  if (lastMove) {
    const lastMoveStyle = {
      backgroundColor: 'rgba(250, 204, 21, 0.35)',
      boxShadow: 'inset 0 0 0 2px rgba(234, 179, 8, 0.55)',
    } satisfies CSSProperties

    squareStyles[lastMove.from] = lastMoveStyle
    squareStyles[lastMove.to] = lastMoveStyle
  }

  if (selectedSquare) {
    squareStyles[selectedSquare] = {
      ...(squareStyles[selectedSquare] ?? {}),
      boxShadow: 'inset 0 0 0 4px rgba(59, 130, 246, 0.85)',
    }
  }

  for (const target of legalTargets) {
    squareStyles[target] = {
      ...(squareStyles[target] ?? {}),
      boxShadow: 'inset 0 0 0 4px rgba(34, 197, 94, 0.7)',
    }
  }

  return squareStyles
}

export type ChessTrainingGame = {
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
  squareStyles: Record<string, CSSProperties>
  status: string
}

export function useChessTrainingGame(): ChessTrainingGame {
  const [analysisDepth, setAnalysisDepth] = useState(12)
  const [boardKey, setBoardKey] = useState(0)
  const [positions, setPositions] = useState([startingPosition])
  const [playedMoves, setPlayedMoves] = useState<PlayedMove[]>([])
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [legalTargets, setLegalTargets] = useState<Square[]>([])
  const [feedback, setFeedback] = useState(
    'Drag a piece or click a piece to view its legal moves.',
  )

  const position = positions[currentMoveIndex] ?? startingPosition
  const game = useMemo(() => new Chess(position), [position])
  const lastMove = currentMoveIndex > 0 ? playedMoves[currentMoveIndex - 1] ?? null : null
  const squareStyles = useMemo(
    () => buildSquareStyles(lastMove, selectedSquare, legalTargets),
    [lastMove, legalTargets, selectedSquare],
  )
  const analysis = usePositionAnalysis(position, analysisDepth)
  const canGoBack = currentMoveIndex > 0
  const canGoForward = currentMoveIndex < positions.length - 1

  const clearSelection = useCallback(() => {
    setSelectedSquare(null)
    setLegalTargets([])
  }, [])

  const commitMove = useCallback(
    (move: Move) => {
      const newIndex = currentMoveIndex + 1
      setPositions((currentPositions) => {
        const updated = currentPositions.slice(0, newIndex)
        updated.push(move.after)
        return updated
      })
      setPlayedMoves((currentMoves) => {
        const updated = currentMoves.slice(0, newIndex - 1)
        updated.push({ from: move.from, to: move.to })
        return updated
      })
      setCurrentMoveIndex(newIndex)
      clearSelection()
      setFeedback('')
      return true
    },
    [clearSelection, currentMoveIndex],
  )

  const tryMove = useCallback(
    (sourceSquare: Square, targetSquare: Square) => {
      const nextGame = new Chess(position)
      const legalMoves = getLegalMoves(nextGame, sourceSquare)
      const move =
        legalMoves.find(
          (candidate) => candidate.to === targetSquare && candidate.promotion === 'q',
        ) ?? legalMoves.find((candidate) => candidate.to === targetSquare)

      if (!move) {
        setFeedback('Illegal move.')
        return false
      }

      const playedMove = nextGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: move.promotion,
      })

      if (!playedMove) {
        setFeedback('Illegal move.')
        return false
      }

      return commitMove(playedMove)
    },
    [commitMove, position],
  )

  const selectSquare = useCallback(
    (square: Square) => {
      const playablePiece = getPlayablePiece(game, square)

      if (!playablePiece) {
        clearSelection()
        return
      }

      if (selectedSquare === square) {
        clearSelection()
        return
      }

      const nextTargets = getLegalMoves(game, square).map((move) => move.to)
      setSelectedSquare(square)
      setLegalTargets(nextTargets)
    },
    [clearSelection, game, selectedSquare],
  )

  const onPieceDrop = useCallback<NonNullable<ChessboardOptions['onPieceDrop']>>(
    ({ sourceSquare, targetSquare }) => {
      if (!isSquare(sourceSquare) || !isSquare(targetSquare)) {
        setFeedback('Drop the piece on a valid square.')
        return false
      }

      return tryMove(sourceSquare, targetSquare)
    },
    [tryMove],
  )

  const onSquareClick = useCallback<NonNullable<ChessboardOptions['onSquareClick']>>(
    ({ square }) => {
      if (!isSquare(square)) {
        return
      }

      if (selectedSquare && legalTargets.includes(square)) {
        void tryMove(selectedSquare, square)
        return
      }

      selectSquare(square)
    },
    [legalTargets, selectSquare, selectedSquare, tryMove],
  )

  const onGoBack = useCallback(() => {
    if (!canGoBack) {
      return
    }

    setCurrentMoveIndex((current) => current - 1)
    clearSelection()
    setFeedback('Went back one move.')
    setBoardKey((currentKey) => currentKey + 1)
  }, [canGoBack, clearSelection])

  const onGoForward = useCallback(() => {
    if (!canGoForward) {
      return
    }

    setCurrentMoveIndex((current) => current + 1)
    clearSelection()
    setFeedback('Went forward one move.')
    setBoardKey((currentKey) => currentKey + 1)
  }, [canGoForward, clearSelection])

  const onReset = useCallback(() => {
    setPositions([startingPosition])
    setPlayedMoves([])
    setCurrentMoveIndex(0)
    clearSelection()
    setFeedback('Board reset.')
    setBoardKey((currentKey) => currentKey + 1)
  }, [clearSelection])

  const onAnalysisDepthChange = useCallback((depth: number) => {
    setAnalysisDepth(depth)
  }, [])

  // Add keyboard event listener for arrow keys
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && canGoBack) {
        event.preventDefault()
        onGoBack()
      } else if (event.key === 'ArrowRight' && canGoForward) {
        event.preventDefault()
        onGoForward()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [canGoBack, canGoForward, onGoBack, onGoForward])

  return {
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
    status: getStatus(game),
  }
}
