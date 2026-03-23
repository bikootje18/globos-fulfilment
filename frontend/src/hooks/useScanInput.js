import { useEffect, useRef, useCallback } from 'react'

/**
 * Captures barcode scanner input globally.
 * The Bluetooth pistol grip scanner types the barcode as keyboard input
 * and ends with Enter. This hook keeps a hidden input focused at all times
 * so the operator never needs to tap the screen between scans.
 */
export function useScanInput(onScan, enabled = true) {
  const inputRef = useRef(null)
  const bufferRef = useRef('')
  const timerRef = useRef(null)

  const handleKeyDown = useCallback((e) => {
    if (!enabled) return

    if (e.key === 'Enter') {
      const barcode = bufferRef.current.trim()
      bufferRef.current = ''
      if (barcode.length > 0) onScan(barcode)
      return
    }

    // Scanners type very fast — buffer characters
    clearTimeout(timerRef.current)
    bufferRef.current += e.key

    // Reset buffer if no new character arrives within 100ms
    // (protects against partial reads)
    timerRef.current = setTimeout(() => {
      bufferRef.current = ''
    }, 100)
  }, [onScan, enabled])

  // Re-focus hidden input whenever the user taps elsewhere
  useEffect(() => {
    const refocus = () => {
      if (enabled && inputRef.current) inputRef.current.focus()
    }
    document.addEventListener('click', refocus)
    return () => document.removeEventListener('click', refocus)
  }, [enabled])

  useEffect(() => {
    if (enabled && inputRef.current) inputRef.current.focus()
  }, [enabled])

  return { inputRef, handleKeyDown }
}
