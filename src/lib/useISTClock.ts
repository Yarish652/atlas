import { useEffect, useState } from 'react'

function formatIST(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    hourCycle: 'h12',
  }).formatToParts(date)

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00'
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'
  const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value ?? ''

  return `${hour}:${minute} ${dayPeriod.toLowerCase()}`
}

/** Live wall-clock time in India Standard Time, ticking over on the minute. */
export function useISTClock(): string {
  const [time, setTime] = useState(() => formatIST(new Date()))

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined

    const now = new Date()
    const msToNextMinute = 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds())

    const timeout = setTimeout(() => {
      setTime(formatIST(new Date()))
      interval = setInterval(() => setTime(formatIST(new Date())), 60_000)
    }, msToNextMinute)

    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [])

  return time
}
