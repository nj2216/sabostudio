/**
 * Burger Cook mini-task.
 * Player must stack burger ingredients in the correct order by clicking them.
 */

import { useState, useEffect, useCallback } from 'react';

const INGREDIENTS = [
  { id: 'bottom-bun', emoji: '🍞', label: 'Bottom Bun' },
  { id: 'patty', emoji: '🥩', label: 'Patty' },
  { id: 'cheese', emoji: '🧀', label: 'Cheese' },
  { id: 'lettuce', emoji: '🥬', label: 'Lettuce' },
  { id: 'tomato', emoji: '🍅', label: 'Tomato' },
  { id: 'top-bun', emoji: '🍔', label: 'Top Bun' },
];

export default function BurgerCook({ onProgress, onComplete, progress }) {
  const [stack, setStack] = useState([]);
  const [targetOrder, setTargetOrder] = useState([]);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (progress === 0) {
      setStack([]);
      // Randomize which ingredients are needed (always include buns)
      const middle = INGREDIENTS.slice(1, -1).sort(() => Math.random() - 0.5).slice(0, 3);
      setTargetOrder([INGREDIENTS[0], ...middle, INGREDIENTS[INGREDIENTS.length - 1]]);
    }
  }, [progress]);

  const handleAddIngredient = useCallback(
    (ingredient) => {
      const nextIndex = stack.length;
      if (nextIndex >= targetOrder.length) return;

      if (ingredient.id === targetOrder[nextIndex].id) {
        const newStack = [...stack, ingredient];
        setStack(newStack);

        const newProgress = Math.round((newStack.length / targetOrder.length) * 100);
        onProgress(newProgress);

        if (newStack.length >= targetOrder.length) {
          onComplete();
        }
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }
    },
    [stack, targetOrder, onProgress, onComplete]
  );

  return (
    <div className={`flex flex-col items-center gap-4 ${shake ? 'animate-shake' : ''}`}>
      <div className="text-center mb-2">
        <h3 className="text-xl font-bold text-orange-400">🍔 Cook the Burger!</h3>
        <p className="text-gray-400 text-sm">Stack ingredients in the right order</p>
        <p className="text-xs text-gray-500 mt-1">
          Next: {targetOrder[stack.length]?.emoji} {targetOrder[stack.length]?.label}
        </p>
      </div>

      {/* Burger stack visualization */}
      <div className="w-48 min-h-[120px] bg-gray-800 rounded-xl border border-orange-900 p-3 flex flex-col-reverse items-center gap-1">
        {stack.length === 0 && (
          <p className="text-gray-600 text-xs">Empty plate...</p>
        )}
        {stack.map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            className="text-2xl animate-bounce-in"
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Ingredient buttons */}
      <div className="grid grid-cols-3 gap-2 w-64">
        {INGREDIENTS.map((ing) => (
          <button
            key={ing.id}
            onClick={() => handleAddIngredient(ing)}
            className="flex flex-col items-center gap-1 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 transition-colors"
          >
            <span className="text-xl">{ing.emoji}</span>
            <span className="text-[10px] text-gray-400">{ing.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
