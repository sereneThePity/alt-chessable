import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import stockfishWasmUrl from 'stockfish/bin/stockfish-18-lite-single.wasm?url'
import stockfishWorkerUrl from 'stockfish/bin/stockfish-18-lite-single.js?url'

const DEFAULT_ANALYSIS_DEPTH = 12
const MULTI_PV = 3
const ANALYSIS_DEBOUNCE_MS = 150

export const analysisDepthOptions = [8, 10, 12, 14, 16, 18]

export type AnalysisLine = {
  depth: number
  line: string
  multipv: number
  scoreText: string
}

export type PositionAnalysis = {
  depth: number
  engineStatus: string
  evaluation: string
  isThinking: boolean
  lines: AnalysisLine[]
}

function formatScore(kind: string, rawValue: number, fen: string) {
  const sideToMove = fen.split(' ')[1] ?? 'w'
  const scoreFromWhitesPerspective = sideToMove === 'w' ? rawValue : -rawValue

  if (kind === 'mate') {
    return scoreFromWhitesPerspective > 0
      ? `+#${scoreFromWhitesPerspective}`
      : `#${scoreFromWhitesPerspective}`
  }

  const score = scoreFromWhitesPerspective / 100
  return score > 0 ? `+${score.toFixed(2)}` : `${score.toFixed(2)}`
}

function formatPrincipalVariation(fen: string, moves: string[]) {
  const replay = new Chess(fen)
  const sideToMove = fen.split(' ')[1] ?? 'w'
  let currentTurn = sideToMove
  let moveNumber = Number(fen.split(' ')[5] ?? '1')
  const formattedMoves: string[] = []

  for (const moveText of moves) {
    const from = moveText.slice(0, 2)
    const to = moveText.slice(2, 4)
    const promotion = moveText[4]
    const move = replay.move({
      from,
      promotion: promotion ? promotion : undefined,
      to,
    })

    if (!move) {
      break
    }

    const prefix = currentTurn === 'w' ? `${moveNumber}.` : `${moveNumber}...`
    formattedMoves.push(`${prefix} ${move.san}`)

    if (currentTurn === 'b') {
      moveNumber += 1
    }

    currentTurn = currentTurn === 'w' ? 'b' : 'w'
  }

  return formattedMoves.join(' ')
}

function parseInfoLine(message: string, fen: string) {
  const tokens = message.trim().split(/\s+/)
  const depthIndex = tokens.indexOf('depth')
  const multipvIndex = tokens.indexOf('multipv')
  const scoreIndex = tokens.indexOf('score')
  const pvIndex = tokens.indexOf('pv')

  if (depthIndex === -1 || scoreIndex === -1 || pvIndex === -1) {
    return null
  }

  const depth = Number(tokens[depthIndex + 1])
  const multipv = Number(tokens[multipvIndex + 1] ?? '1')
  const scoreKind = tokens[scoreIndex + 1]
  const rawValue = Number(tokens[scoreIndex + 2])
  const pvMoves = tokens.slice(pvIndex + 1)

  if (!Number.isFinite(depth) || !Number.isFinite(multipv) || !scoreKind) {
    return null
  }

  return {
    depth,
    line: formatPrincipalVariation(fen, pvMoves),
    multipv,
    scoreText: formatScore(scoreKind, rawValue, fen),
  } satisfies AnalysisLine
}

function sortLines(lines: AnalysisLine[]) {
  return [...lines].sort((left, right) => left.multipv - right.multipv)
}

export function usePositionAnalysis(
  fen: string,
  depth = DEFAULT_ANALYSIS_DEPTH,
): PositionAnalysis {
  const workerRef = useRef<Worker | null>(null)
  const readyRef = useRef(false)
  const fenRef = useRef(fen)
  const depthRef = useRef(depth)
  const searchTimeoutRef = useRef<number | null>(null)

  const [engineStatus, setEngineStatus] = useState('Starting Stockfish...')
  const [evaluation, setEvaluation] = useState('...')
  const [isThinking, setIsThinking] = useState(true)
  const [lines, setLines] = useState<AnalysisLine[]>([])

  const sendCommand = useCallback((command: string) => {
    workerRef.current?.postMessage(command)
  }, [])

  const startAnalysis = useCallback(
    (nextFen: string, nextDepth: number) => {
      fenRef.current = nextFen
      depthRef.current = nextDepth

      if (searchTimeoutRef.current !== null) {
        window.clearTimeout(searchTimeoutRef.current)
      }

      setLines([])
      setEvaluation('...')

      if (!readyRef.current) {
        setEngineStatus('Loading engine')
        setIsThinking(true)
        return
      }

      setEngineStatus(`Depth ${nextDepth}`)
      setIsThinking(true)

      searchTimeoutRef.current = window.setTimeout(() => {
        sendCommand('stop')
        sendCommand(`setoption name MultiPV value ${MULTI_PV}`)
        sendCommand(`position fen ${nextFen}`)
        sendCommand(`go depth ${nextDepth}`)
      }, ANALYSIS_DEBOUNCE_MS)
    },
    [sendCommand],
  )

  useEffect(() => {
    const worker = new Worker(
      `${stockfishWorkerUrl}#${encodeURIComponent(stockfishWasmUrl)}`,
    )

    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<string>) => {
      const message = event.data

      if (message === 'uciok') {
        setEngineStatus('Preparing engine')
        sendCommand(`setoption name MultiPV value ${MULTI_PV}`)
        sendCommand('isready')
        return
      }

      if (message === 'readyok') {
        readyRef.current = true
        setEngineStatus(`Depth ${depthRef.current}`)
        startAnalysis(fenRef.current, depthRef.current)
        return
      }

      if (message.startsWith('info ')) {
        const parsed = parseInfoLine(message, fenRef.current)

        if (!parsed || parsed.line.length === 0) {
          return
        }

        setLines((currentLines) => {
          const nextLines = currentLines.filter(
            (line) => line.multipv !== parsed.multipv,
          )
          nextLines.push(parsed)
          return sortLines(nextLines)
        })

        if (parsed.multipv === 1) {
          setEvaluation(parsed.scoreText)
        }

        setEngineStatus(`Depth ${parsed.depth}`)
        setIsThinking(true)
        return
      }

      if (message.startsWith('bestmove ')) {
        setEngineStatus(`Depth ${depthRef.current}`)
        setIsThinking(false)
      }
    }

    worker.postMessage('uci')

    return () => {
      if (searchTimeoutRef.current !== null) {
        window.clearTimeout(searchTimeoutRef.current)
      }

      worker.postMessage('quit')
      worker.terminate()
      workerRef.current = null
    }
  }, [sendCommand, startAnalysis])

  useEffect(() => {
    const analysisStartTimeout = window.setTimeout(() => {
      startAnalysis(fen, depth)
    }, 0)

    return () => {
      window.clearTimeout(analysisStartTimeout)
    }
  }, [depth, fen, startAnalysis])

  return {
    depth,
    engineStatus,
    evaluation,
    isThinking,
    lines,
  }
}
