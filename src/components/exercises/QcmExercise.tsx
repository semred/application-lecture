import React, { useState } from 'react';
import { QcmExercise as QcmType } from '../../types/book';
import { speech } from '../../utils/speech';
import { CheckCircle2, XCircle, Volume2, HelpCircle } from 'lucide-react';

interface Props {
  exercise: QcmType;
}

export const QcmExerciseComponent: React.FC<Props> = ({ exercise }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const handleSelectOption = (index: number) => {
    setSelectedIndex(index);
    setHasAnswered(true);

    const isCorrect = index === exercise.bonneReponseIndex;
    if (isCorrect) {
      speech.playSuccessSound();
      speech.speakText('إِجَابَةٌ صَحِيحَةٌ! مُمْتَازْ');
    } else {
      speech.playErrorSound();
      speech.speakText('حَاوِلْ مَرَّةً أُخْرَى');
    }
  };

  const handleReadQuestion = () => {
    speech.speakText(exercise.question);
  };

  const handleReadOption = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    speech.speakText(text);
  };

  return (
    <div className="bg-sky-50/70 border-2 border-sky-600/30 rounded-2xl p-4 sm:p-6 mb-6 shadow-sm">
      <div className="flex justify-between items-start gap-3 mb-4">
        <h4 className="font-bold text-sky-950 text-base sm:text-lg flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-sky-700" />
          <span>{exercise.titre || 'سؤال واختيار من متعدد (QCM):'}</span>
        </h4>

        <button
          onClick={handleReadQuestion}
          className="flex items-center gap-1.5 text-xs text-sky-800 bg-white hover:bg-sky-100 px-3 py-1.5 rounded-xl border border-sky-200 shadow-xs transition"
          title="استمع إلى السؤال"
        >
          <Volume2 className="w-4 h-4 text-sky-600" />
          <span>استمع للسؤال</span>
        </button>
      </div>

      {/* Question prompt */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-sky-100 shadow-inner mb-4 text-right">
        <p className="font-reading text-xl sm:text-2xl text-slate-900 leading-relaxed font-bold">
          {exercise.question}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-2.5 mb-4">
        {exercise.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = index === exercise.bonneReponseIndex;

          let btnStyle = 'bg-white hover:bg-sky-50 border-slate-200 text-slate-800';
          if (hasAnswered) {
            if (isCorrect) {
              btnStyle = 'bg-emerald-100 border-emerald-500 text-emerald-950 ring-2 ring-emerald-400';
            } else if (isSelected && !isCorrect) {
              btnStyle = 'bg-red-100 border-red-500 text-red-950 ring-2 ring-red-400';
            }
          }

          return (
            <div
              key={index}
              onClick={() => handleSelectOption(index)}
              className={`p-3.5 sm:p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all active:scale-98 ${btnStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm text-slate-700">
                  {['أ', 'ب', 'ج', 'د'][index] || index + 1}
                </span>
                <span className="font-reading text-lg sm:text-xl font-bold">{option}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleReadOption(e, option)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-sky-700 hover:bg-white"
                  title="استمع للخيار"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                {hasAnswered && isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
                {hasAnswered && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-red-600" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedback & explanation */}
      {hasAnswered && (
        <div className={`p-4 rounded-xl text-sm leading-relaxed ${
          selectedIndex === exercise.bonneReponseIndex ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
        }`}>
          {selectedIndex === exercise.bonneReponseIndex ? (
            <p className="font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>إجابة صحيحة! أحسنت!</span>
            </p>
          ) : (
            <p className="font-bold flex items-center gap-2">
              <XCircle className="w-5 h-5 text-amber-700" />
              <span>إجابة غير صحيحة، راجع السؤال وحاول مجدداً.</span>
            </p>
          )}
          {exercise.explication && <p className="mt-1 text-xs sm:text-sm opacity-90">{exercise.explication}</p>}
        </div>
      )}
    </div>
  );
};
