import type { AnalysisLine, PositionAnalysis } from '../game/usePositionAnalysis'

type PositionAnalysisPanelProps = {
  analysis: PositionAnalysis
  analysisDepth: number
  depthOptions: number[]
  onAnalysisDepthChange: (depth: number) => void
}

function AnalysisLineRow({ line }: { line: AnalysisLine }) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm whitespace-nowrap">
      <span className="font-medium text-slate-400">#{line.multipv}</span>
      <span className="font-semibold text-blue-200">{line.scoreText}</span>
      <span className="text-slate-200">{line.line}</span>
    </div>
  )
}

export function PositionAnalysisPanel({
  analysis,
  analysisDepth,
  depthOptions,
  onAnalysisDepthChange,
}: PositionAnalysisPanelProps) {
  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-white">{analysis.evaluation}</span>
        <span className="text-xs text-slate-400">{analysis.engineStatus}</span>
        <label className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          <span>Depth</span>
          <select
            value={analysisDepth}
            onChange={(event) => onAnalysisDepthChange(Number(event.target.value))}
            className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white outline-none focus:border-blue-400"
          >
            {depthOptions.map((depth) => (
              <option key={depth} value={depth}>
                {depth}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        {analysis.lines.length > 0 ? (
          analysis.lines.map((line) => <AnalysisLineRow key={line.multipv} line={line} />)
        ) : (
          <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-400">
            {analysis.isThinking ? 'Analysing...' : 'No line available.'}
          </div>
        )}
      </div>
    </section>
  )
}
