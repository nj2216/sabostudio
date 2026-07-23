/**
 * Radio Tune mini-task.
 * Player must align a frequency dial to a target frequency using a slider.
 * Must hold the correct frequency for 2 seconds to complete.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const MIN_FREQ = 88.0;
const MAX_FREQ = 108.0;
const TOLERANCE = 0.5;
const HOLD_DURATION = 2000; // 2 seconds to lock in

export default function RadioTune({ onProgress, onComplete, progress }) {
  const [targetFreq, setTargetFreq] = useState(98.5);
  const [currentFreq, setCurrentFreq] = useState(88.0);
  const [holdStart, setHoldStart] = useState(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (progress === 0) {
      const target = Math.round((MIN_FREQ + Math.random() * (MAX_FREQ - MIN_FREQ)) * 10) / 10;
      setTargetFreq(target);
      setCurrentFreq(MIN_FREQ + Math.random() * (MAX_FREQ - MIN_FREQ));
      setHoldStart(null);
      setHoldProgress(0);
    }
  }, [progress]);

  // Track hold progress
  useEffect(() => {
    function animate() {
      if (holdStart) {
        const elapsed = Date.now() - holdStart;
        const prog = Math.min(100, (elapsed / HOLD_DURATION) * 100);
        setHoldProgress(prog);
        onProgress(prog);

        if (elapsed >= HOLD_DURATION) {
          onComplete();
          return;
        }
      }
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [holdStart, onProgress, onComplete]);

  const handleFreqChange = useCallback(
    (e) => {
      const freq = parseFloat(e.target.value);
      setCurrentFreq(freq);

      const isOnTarget = Math.abs(freq - targetFreq) <= TOLERANCE;
      if (isOnTarget && !holdStart) {
        setHoldStart(Date.now());
      } else if (!isOnTarget && holdStart) {
        setHoldStart(null);
        setHoldProgress(0);
        onProgress(0);
      }
    },
    [targetFreq, holdStart, onProgress]
  );

  const isOnTarget = Math.abs(currentFreq - targetFreq) <= TOLERANCE;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center mb-2">
        <h3 className="text-xl font-bold text-cyan-400">📻 Tune the Radio!</h3>
        <p className="text-gray-400 text-sm">Find frequency {targetFreq.toFixed(1)} FM</p>
        <p className="text-xs text-gray-500">Hold steady for 2 seconds to lock in</p>
      </div>

      {/* Radio display */}
      <div className="w-64 bg-gray-800 rounded-xl border border-cyan-900 p-4">
        {/* Frequency display */}
        <div className={`text-center text-3xl font-mono font-bold mb-3 ${isOnTarget ? 'text-green-400' : 'text-white'}`}>
          {currentFreq.toFixed(1)} FM
        </div>

        {/* Static noise indicator */}
        <div className="h-4 bg-gray-700 rounded-full mb-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-200 rounded-full ${isOnTarget ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${Math.max(5, 100 - Math.abs(currentFreq - targetFreq) * 10)}%` }}
          />
        </div>

        {/* Dial/slider */}
        <input
          type="range"
          min={MIN_FREQ}
          max={MAX_FREQ}
          step={0.1}
          value={currentFreq}
          onChange={handleFreqChange}
          className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-gray-600"
        />

        {/* Hold progress */}
        {isOnTarget && (
          <div className="mt-3">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 transition-all duration-100 rounded-full"
                style={{ width: `${holdProgress}%` }}
              />
            </div>
            <p className="text-green-400 text-xs text-center mt-1">🔒 Locking in...</p>
          </div>
        )}
      </div>
    </div>
  );
}
