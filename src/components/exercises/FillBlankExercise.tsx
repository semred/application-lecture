import React, { useState, useEffect } from 'react';
import { FillBlankExercise as FillBlankType } from '../../types/book';
import { speech } from '../../utils/speech';
import { CheckCircle2, RotateCcw, Volume2 } from 'lucide-react';

interface Props {
  exercise: FillBlankType;
}

export const FillBlankExerciseComponent: React.FC<Props> = ({ exercise }) => {
  // Parse slots from text (replace ___ with indices)
  const segments = exercise.texte.split('___');
  const numSlots = segments.length - 1;

  // State: word assigned to each slot: Array<string | null>
  const [placedWords, setPlacedWords] = useState<(string | null)[]>([]);
  // Shuffled word bank with unique instance IDs
  const [bankChips, setBankChips] = useState<{ id: string; word: string; isUsed: boolean }[]>([]);
  // Currently selected bank word id
  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);
  // Status of slots: 'idle' | 'correct' | 'incorrect'
  const [slotStatus, setSlotStatus] = useState<('idle' | 'correct' | 'incorrect')[]>([]);
  // Shake index for error animation
  const [shakingSlotIndex, setShakingSlotIndex] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Initialize or reset when exercise changes
  useEffect(() => {
    resetExercise();
  }, [exercise]);

  const resetExercise = () => {
    setPlacedWords(new Array(numSlots).fill(null));
    setSlotStatus(new Array(numSlots).fill('idle'));
    setSelectedChipId(null);
    setShakingSlotIndex(null);
    setIsCompleted(false);

    // Prepare bank: combine answers and distractors, shuffle thoroughly
    const pool = [...exercise.reponses, ...(exercise.leurres || [])];
    const chips = pool
      .map((w, index) => ({ id: `chip-${index}-${w}-${Math.random().toString(36).slice(2, 6)}`, word: w, isUsed: false }))
      .sort(() => Math.random() - 0.5);

    setBankChips(chips);
  };

  const handleSelectChip = (chipId: string) => {
    const chip = bankChips.find(c => c.id === chipId);
    if (!chip || chip.isUsed) return;

    speech.playClickSound();
    speech.speakWord(chip.word);

    if (selectedChipId === chipId) {
      // Toggle off if already selected
      setSelectedChipId(null);
      return;
    }

    setSelectedChipId(chipId);

    // Auto-fill the first available empty slot if convenient
    const firstEmptyIndex = placedWords.findIndex(w => w === null);
    if (firstEmptyIndex !== -1) {
      placeWordInSlot(chip, firstEmptyIndex);
    }
  };

  const placeWordInSlot = (chip: { id: string; word: string }, slotIndex: number) => {
    const expectedWord = exercise.reponses[slotIndex]?.trim();
    const candidateWord = chip.word.trim();

    // Check if matching
    if (candidateWord === expectedWord) {
      // Correct!
      speech.playSuccessSound();
      const nextPlaced = [...placedWords];
      nextPlaced[slotIndex] = candidateWord;
      setPlacedWords(nextPlaced);

      const nextStatus = [...slotStatus];
      nextStatus[slotIndex] = 'correct';
      setSlotStatus(nextStatus);

      // Mark chip as used
      setBankChips(prev => prev.map(c => c.id === chip.id ? { ...c, isUsed: true } : c));
      setSelectedChipId(null);

      // Check if all slots are filled correctly
      const willBeFilled = nextPlaced.every(w => w !== null);
      if (willBeFilled) {
        setIsCompleted(true);
        setTimeout(() => {
          speech.speakText('مُمْتَازْ! أَحْسَنْتَ صُنْعاً');
        }, 300);
      }
    } else {
      // Incorrect attempt
      speech.playErrorSound();
      setShakingSlotIndex(slotIndex);
      setTimeout(() => setShakingSlotIndex(null), 500);
    }
  };

  const handleSlotClick = (slotIndex: number) => {
    // If a chip is currently selected in the bank, place it
    if (selectedChipId) {
      const chip = bankChips.find(c => c.id === selectedChipId);
      if (chip && !chip.isUsed) {
        placeWordInSlot(chip, slotIndex);
      }
      return;
    }

    // If slot already has a word and user taps it, speak it or return it to bank
    const currentWord = placedWords[slotIndex];
    if (currentWord) {
      speech.speakWord(currentWord);
      // Remove word from slot back to bank
      const nextPlaced = [...placedWords];
      nextPlaced[slotIndex] = null;
      setPlacedWords(nextPlaced);

      const nextStatus = [...slotStatus];
      nextStatus[slotIndex] = 'idle';
      setSlotStatus(nextStatus);

      // Free up one instance in bank
      setBankChips(prev => {
        let freed = false;
        return prev.map(c => {
          if (!freed && c.word === currentWord && c.isUsed) {
            freed = true;
            return { ...c, isUsed: false };
          }
          return c;
        });
      });
      setIsCompleted(false);
    }
  };

  return (
    <div className="bg-emerald-50/60 border-2 border-emerald-600/30 rounded-2xl p-4 sm:p-6 mb-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-emerald-950 text-base sm:text-lg flex items-center gap-2">
          <span>✍️</span>
          <span>{exercise.titre || 'أكمل الفراغات بالكلمة المناسبة:'}</span>
        </h4>
        <button
          onClick={resetExercise}
          className="flex items-center gap-1 text-xs text-emerald-800 bg-white hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition"
          title="إعادة المحاولة"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>إعادة</span>
        </button>
      </div>

      <p className="text-xs sm:text-sm text-slate-600 mb-3">
        إضغط على الكلمة من بنك الكلمات، ثم اضغط على الفراغ المناسب لوضعها:
      </p>

      {/* Sentence with interactive blanks */}
      <div className="bg-white rounded-xl p-4 sm:p-6 border border-emerald-100 shadow-inner mb-5 text-right font-reading leading-loose text-xl sm:text-2xl text-slate-800">
        {segments.map((segment, index) => (
          <React.Fragment key={index}>
            <span>{segment}</span>
            {index < numSlots && (
              <button
                type="button"
                onClick={() => handleSlotClick(index)}
                className={`inline-flex items-center justify-center min-w-[90px] sm:min-w-[120px] h-10 sm:h-12 mx-2 px-3 py-1 rounded-xl align-middle font-bold text-base sm:text-xl transition-all ${
                  placedWords[index]
                    ? 'bg-emerald-100 text-emerald-900 border-2 border-emerald-500 shadow-xs'
                    : selectedChipId
                    ? 'bg-amber-50 text-amber-900 border-2 border-dashed border-amber-500 animate-pulse'
                    : 'bg-slate-100 text-slate-400 border-2 border-dashed border-slate-300 hover:border-emerald-400'
                } ${shakingSlotIndex === index ? 'animate-shake border-red-500 bg-red-50 text-red-700' : ''}`}
                title={placedWords[index] ? 'إضغط للإزالة أو الاستماع' : 'فراغ: إضغط لوضع الكلمة'}
              >
                {placedWords[index] ? (
                  <span className="flex items-center gap-1">
                    {placedWords[index]}
                    <span className="text-[10px] text-emerald-700 opacity-60">✕</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-sans">فراغ ({index + 1})</span>
                )}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Bank of separated and shuffled words */}
      <div className="mb-4">
        <div className="text-xs font-bold text-emerald-900 mb-2 flex items-center justify-between">
          <span>بنك الكلمات (إضغط للاختيار أو السماع):</span>
          <span className="text-slate-500 font-normal">{bankChips.filter(c => !c.isUsed).length} كلمات متبقية</span>
        </div>

        <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start p-3 bg-white/80 rounded-xl border border-emerald-100 min-h-[60px]">
          {bankChips.map(chip => (
            <button
              key={chip.id}
              onClick={() => handleSelectChip(chip.id)}
              disabled={chip.isUsed}
              className={`px-4 py-2 rounded-xl text-base sm:text-lg font-bold transition-all active:scale-95 flex items-center gap-1.5 ${
                chip.isUsed
                  ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed scale-90 opacity-40 line-through'
                  : selectedChipId === chip.id
                  ? 'bg-amber-500 text-white shadow-md ring-3 ring-amber-300 scale-105'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm hover:shadow'
              }`}
            >
              <span>{chip.word}</span>
              {!chip.isUsed && <Volume2 className="w-3.5 h-3.5 opacity-70" />}
            </button>
          ))}
        </div>
      </div>

      {/* Completion message */}
      {isCompleted && (
        <div className="flex items-center justify-center gap-2 p-3 bg-emerald-600 text-white rounded-xl shadow-md animate-fadeIn text-base sm:text-lg font-bold">
          <CheckCircle2 className="w-6 h-6 animate-bounce" />
          <span>🎉 رائع جداً! لقد أكملت الفراغات بشكل صحيح!</span>
        </div>
      )}
    </div>
  );
};
