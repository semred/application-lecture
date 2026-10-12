import React, { useState, useEffect } from 'react';
import { WordOrderExercise as WordOrderType } from '../../types/book';
import { speech } from '../../utils/speech';
import { CheckCircle2, RotateCcw, Volume2, ArrowUpDown } from 'lucide-react';

interface Props {
  exercise: WordOrderType;
}

export const WordOrderExerciseComponent: React.FC<Props> = ({ exercise }) => {
  // Correct sentence split into words (ignoring extra whitespace)
  const targetWords = exercise.phraseCorrecte.trim().split(/\s+/).filter(Boolean);

  // Available bank chips with unique ID
  const [bankChips, setBankChips] = useState<{ id: string; word: string; isUsed: boolean }[]>([]);
  // Sequenced words chosen so far
  const [orderedChips, setOrderedChips] = useState<{ id: string; word: string }[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    resetExercise();
  }, [exercise]);

  const resetExercise = () => {
    setOrderedChips([]);
    setIsCompleted(false);
    setHasError(false);

    // Shuffle the words
    const chips = (exercise.motsMelanges && exercise.motsMelanges.length > 0 
      ? exercise.motsMelanges 
      : targetWords)
      .map((w, idx) => ({ id: `word-${idx}-${w}-${Math.random().toString(36).slice(2, 6)}`, word: w, isUsed: false }))
      .sort(() => Math.random() - 0.5);

    setBankChips(chips);
  };

  const handleSelectWord = (chip: { id: string; word: string }) => {
    speech.playClickSound();
    speech.speakWord(chip.word);

    // Mark as used in bank
    setBankChips(prev => prev.map(c => c.id === chip.id ? { ...c, isUsed: true } : c));
    
    // Add to ordered sequence
    const nextOrdered = [...orderedChips, chip];
    setOrderedChips(nextOrdered);

    // If all words are placed, check result
    if (nextOrdered.length === targetWords.length) {
      checkResult(nextOrdered);
    }
  };

  const handleRemoveWord = (index: number) => {
    const removedChip = orderedChips[index];
    if (!removedChip) return;

    speech.playClickSound();

    // Remove from ordered sequence
    const nextOrdered = orderedChips.filter((_, idx) => idx !== index);
    setOrderedChips(nextOrdered);

    // Restore to bank
    setBankChips(prev => prev.map(c => c.id === removedChip.id ? { ...c, isUsed: false } : c));
    setIsCompleted(false);
    setHasError(false);
  };

  const checkResult = (currentOrdered: { id: string; word: string }[]) => {
    const constructedSentence = currentOrdered.map(c => c.word).join(' ').trim();
    const correctSentence = targetWords.join(' ').trim();

    if (constructedSentence === correctSentence) {
      speech.playSuccessSound();
      setIsCompleted(true);
      setHasError(false);
      setTimeout(() => {
        speech.speakText(correctSentence);
      }, 400);
    } else {
      speech.playErrorSound();
      setHasError(true);
      setTimeout(() => setHasError(false), 800);
    }
  };

  return (
    <div className="bg-purple-50/70 border-2 border-purple-600/30 rounded-2xl p-4 sm:p-6 mb-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-purple-950 text-base sm:text-lg flex items-center gap-2">
          <ArrowUpDown className="w-5 h-5 text-purple-700" />
          <span>{exercise.titre || 'رتّب الكلمات لتكوين جملة صحيحة:'}</span>
        </h4>

        <button
          onClick={resetExercise}
          className="flex items-center gap-1 text-xs text-purple-800 bg-white hover:bg-purple-100 px-2.5 py-1.5 rounded-lg border border-purple-200 transition"
          title="إعادة المحاولة"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>إعادة</span>
        </button>
      </div>

      <p className="text-xs sm:text-sm text-slate-600 mb-3">
        إضغط على الكلمات بالترتيب لتكوين الجملة (إضغط على الكلمة المرتبة لإلغائها):
      </p>

      {/* Assembly Zone */}
      <div className={`min-h-[70px] sm:min-h-[85px] bg-white rounded-xl p-4 border-2 shadow-inner mb-5 flex flex-wrap items-center gap-2.5 ${
        hasError ? 'border-red-400 bg-red-50/50 animate-shake' : isCompleted ? 'border-emerald-500 bg-emerald-50/50' : 'border-purple-200'
      }`}>
        {orderedChips.length === 0 ? (
          <span className="text-sm text-slate-400 italic">الجملة تظهر هنا أثناء الضغط على الكلمات...</span>
        ) : (
          orderedChips.map((chip, idx) => (
            <button
              key={`${chip.id}-${idx}`}
              onClick={() => handleRemoveWord(idx)}
              className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-reading text-lg sm:text-xl font-bold shadow-xs flex items-center gap-1.5 transition active:scale-95"
              title="إضغط لإلغاء الكلمة"
            >
              <span>{chip.word}</span>
              <span className="text-[10px] bg-purple-900/60 rounded-full w-4 h-4 flex items-center justify-center">✕</span>
            </button>
          ))
        )}
      </div>

      {/* Bank of Words */}
      <div className="mb-4">
        <div className="text-xs font-bold text-purple-900 mb-2">بنك الكلمات المتفرقة:</div>
        <div className="flex flex-wrap gap-2.5 p-3 bg-white/80 rounded-xl border border-purple-100">
          {bankChips.map(chip => (
            <button
              key={chip.id}
              onClick={() => handleSelectWord(chip)}
              disabled={chip.isUsed}
              className={`px-4 py-2 rounded-xl font-reading text-lg sm:text-xl font-bold transition-all active:scale-95 flex items-center gap-1.5 ${
                chip.isUsed
                  ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed scale-90 opacity-40 line-through'
                  : 'bg-white hover:bg-purple-50 text-purple-900 border-2 border-purple-300 shadow-xs hover:shadow'
              }`}
            >
              <span>{chip.word}</span>
              {!chip.isUsed && <Volume2 className="w-3.5 h-3.5 opacity-60" />}
            </button>
          ))}
        </div>
      </div>

      {/* Completion or Error Banner */}
      {isCompleted && (
        <div className="flex items-center justify-center gap-2 p-3 bg-emerald-600 text-white rounded-xl shadow-md text-base sm:text-lg font-bold">
          <CheckCircle2 className="w-6 h-6 animate-bounce" />
          <span>🎉 أحسنت صنعاً! ترتيب الجملة سليم وممتاز!</span>
        </div>
      )}

      {hasError && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-xl text-center text-sm font-bold">
          ⚠️ الترتيب غير صحيح بعد، راجع الكلمات واضغط على أي كلمة لحذفها وتصحيح الترتيب.
        </div>
      )}
    </div>
  );
};
