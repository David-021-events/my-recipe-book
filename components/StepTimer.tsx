'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  totalSeconds: number
}

type Status = 'idle' | 'running' | 'ringing'

function playBeep(ctx: AudioContext) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = 880
  gain.gain.setValueAtTime(0.5, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.5)
}

function fmt(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function StepTimer({ totalSeconds }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [remaining, setRemaining] = useState(totalSeconds)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Countdown tick
  useEffect(() => {
    if (status !== 'running') return
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setStatus('ringing')
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [status])

  // Repeating alarm while ringing
  useEffect(() => {
    if (status !== 'ringing') return
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') void ctx.resume()
    playBeep(ctx)
    const id = setInterval(() => playBeep(ctx), 1500)
    return () => clearInterval(id)
  }, [status])

  function reset() {
    setStatus('idle')
    setRemaining(totalSeconds)
  }

  if (status === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setStatus('running')}
        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 font-sans text-xs font-medium text-brand-600 hover:bg-brand-100 transition-colors"
      >
        <span aria-hidden="true">▶</span>
        <span>{fmt(remaining)}</span>
      </button>
    )
  }

  if (status === 'running') {
    return (
      <div className="mt-2 inline-flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500 font-sans text-xs font-medium text-white">
          <span aria-hidden="true" className="animate-pulse">⏱</span>
          <span>{fmt(remaining)}</span>
        </div>
        <button
          type="button"
          onClick={reset}
          aria-label="Cancel timer"
          className="font-sans text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          ✕
        </button>
      </div>
    )
  }

  // ringing — alarm playing, must be manually dismissed
  return (
    <button
      type="button"
      onClick={reset}
      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 font-sans text-xs font-medium text-white hover:bg-red-600 transition-colors animate-pulse"
    >
      <span aria-hidden="true">🔔</span>
      <span>Time&apos;s up — Dismiss</span>
    </button>
  )
}
