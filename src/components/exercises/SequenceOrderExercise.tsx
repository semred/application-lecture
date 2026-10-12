import React, { useState, useEffect } from 'react';
import { SequenceOrderExercise as SequenceOrderType, SequenceItem } from '../../types/book';
import { speech } from '../../utils/speech';
import { CheckCircle2, RotateCcw, ArrowUp, ArrowDown, ListOrdered } from 'lucide-react';

interface Props {
  exercise: SequenceOrderType;
}

export const SequenceOrderExerciseComponent: React.FC<Props> = ({ exercise }) => {
  const [items, setItems] = useState<SequenceItem[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    reset();
  }, [exercise]);

  const reset = () => {
    // Scramble items
    const shuffled = [...exercise.elements].sort(() => Math.random() - 0.5);
    setItems(shuffled);
    setIsCompleted(false);
    setChecked(false);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    speech.playClickSound();
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const nextItems = [...items];
    const temp = nextItems[index];
    nextItems[index] = nextItems[targetIndex];
    nextItems[targetIndex] = temp;
    setItems(nextItems);
    setChecked(false);
  };

  const verifyOrder = () => {
    // Check if every item is in increasing order according to ordreCorrect
    const isCorrect = items.every((item, idx) => item.ordreCorrect === idx + 1);
    setChecked(true);
    if (isCorrect) {
      speech.playSuccessSound();
      setIsCompleted(true);
      speech.speakText('تَرْتِيبٌ صَحِيحٌ وَرَائِعٌ!');
    } else {
      speech.playErrorSound();
      speech.speakText('حَاوِلْ مَرَّةً أُخْرَى، التَّرْتِيبُ غَيْرُ صَحِيحٍ');
    }
  };

  return (
    <div className="bg-teal-50/70 border-2 border-teal-600/30 rounded-2xl p-4 sm:p-6 mb-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-teal-950 text-base sm:text-lg flex items-center gap-2">
          <ListOrdered className="w-5 h-5 text-teal-700" />
          <span>{exercise.titre || 'رتّب الخطوات أو الصور بالتسلسل الصحيح:'}</span>
        </h4>

        <button
          onClick={reset}
          className="flex items-center gap-1 text-xs text-teal-800 bg-white hover:bg-teal-100 px-2.5 py-1.5 rounded-lg border border-teal-200 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>إعادة</span>
        </button>
      </div>

      <p className="text-xs sm:text-sm text-slate-700 mb-4 font-semibold">
        {exercise.consigne || 'استخدم الأسهم لتحريك البطاقات للأعلى أو للأسفل للحصول على الترتيب الصحيح:'}
      </p>

      {/* List of draggable / reorderable cards */}
      <div className="space-y-3 mb-5">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3.5 bg-white rounded-xl border-2 border-teal-200 shadow-xs hover:border-teal-400 transition"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {index + 1}
              </span>
              {item.image && (
                <img
                  src={item.image}
                  alt={item.texte}
                  className="w-14 h-14 object-contain rounded-lg border border-slate-200 bg-slate-50"
                />
              )}
              <span className="font-reading text-lg sm:text-xl font-bold text-slate-800">{item.texte}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveItem(index, 'up')}
                disabled={index === 0}
                className="p-2 rounded-lg bg-slate-100 hover:bg-teal-100 text-teal-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title="للأعلى"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => moveItem(index, 'down')}
                disabled={index === items.length - 1}
                className="p-2 rounded-lg bg-slate-100 hover:bg-teal-100 text-teal-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title="للأسفل"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          onClick={verifyOrder}
          className="flex-1 py-3 px-4 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-md transition active:scale-98"
        >
          تحقق من الترتيب
        </button>
      </div>

      {checked && (
        <div className={`mt-4 p-3.5 rounded-xl font-bold text-center text-sm sm:text-base ${
          isCompleted ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
        }`}>
          {isCompleted ? '🎉 ترتيب ممتاز ومتناسق!' : '⚠️ الترتيب غير صحيح بعد، أعد ترتيب العناصر واضغط على تحقق.'}
        </div>
      )}
    </div>
  );
};
