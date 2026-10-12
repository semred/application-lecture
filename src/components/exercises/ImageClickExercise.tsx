import React, { useState } from 'react';
import { ImageClickExercise as ImageClickType } from '../../types/book';
import { speech } from '../../utils/speech';
import { CheckCircle2, XCircle, Volume2, Image as ImageIcon } from 'lucide-react';

interface Props {
  exercise: ImageClickType;
}

export const ImageClickExerciseComponent: React.FC<Props> = ({ exercise }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const handleSelectImage = (id: string, label: string) => {
    setSelectedId(id);
    setHasAnswered(true);

    const isCorrect = id === exercise.bonneImageId;
    if (isCorrect) {
      speech.playSuccessSound();
      speech.speakText(`صَحِيحٌ! هَذِهِ هِيَ ${label}`);
    } else {
      speech.playErrorSound();
      speech.speakText(`لَا، هَذِهِ ${label}، حَاوِلْ مَرَّةً أُخْرَى`);
    }
  };

  const handleReadInstruction = () => {
    speech.speakText(exercise.instruction);
  };

  return (
    <div className="bg-amber-50/70 border-2 border-amber-600/30 rounded-2xl p-4 sm:p-6 mb-6 shadow-sm">
      <div className="flex justify-between items-start gap-3 mb-4">
        <h4 className="font-bold text-amber-950 text-base sm:text-lg flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-amber-700" />
          <span>{exercise.titre || 'استمع واختر الصورة المناسبة:'}</span>
        </h4>

        <button
          onClick={handleReadInstruction}
          className="flex items-center gap-1.5 text-xs text-amber-900 bg-white hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-300 shadow-xs transition"
          title="استمع إلى التعليمة"
        >
          <Volume2 className="w-4 h-4 text-amber-700" />
          <span>استمع للتعليمة</span>
        </button>
      </div>

      {/* Instruction banner */}
      <div 
        onClick={handleReadInstruction}
        className="bg-white rounded-xl p-4 border border-amber-200 shadow-inner mb-5 text-center cursor-pointer hover:bg-amber-50/50 transition"
      >
        <p className="font-reading text-xl sm:text-2xl text-slate-900 font-bold">
          {exercise.instruction}
        </p>
        <span className="text-xs text-amber-700 mt-1 inline-block">🔊 إضغط للاستماع للتعليمة</span>
      </div>

      {/* Grid of images */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
        {exercise.images.map((img) => {
          const isSelected = selectedId === img.id;
          const isCorrect = img.id === exercise.bonneImageId;

          let cardBorder = 'border-slate-200 hover:border-amber-400 bg-white';
          if (hasAnswered) {
            if (isCorrect) {
              cardBorder = 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300';
            } else if (isSelected && !isCorrect) {
              cardBorder = 'border-red-500 bg-red-50 ring-4 ring-red-300';
            }
          }

          return (
            <div
              key={img.id}
              onClick={() => handleSelectImage(img.id, img.label)}
              className={`p-3 rounded-2xl border-3 flex flex-col items-center justify-between cursor-pointer transition-all active:scale-95 shadow-sm hover:shadow-md ${cardBorder}`}
            >
              <div className="w-full h-32 sm:h-40 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center mb-2">
                <img
                  src={img.url}
                  alt={img.label}
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    // Fallback placeholder
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div className="w-full flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="font-reading font-bold text-base sm:text-lg text-slate-800">{img.label}</span>
                {hasAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {hasAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Result feedback */}
      {hasAnswered && (
        <div className={`p-3.5 rounded-xl text-center font-bold text-base ${
          selectedId === exercise.bonneImageId ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
        }`}>
          {selectedId === exercise.bonneImageId ? '🎉 رائع جداً! اخترت الصورة الصحيحة!' : '❌ ليست هذه الصورة، حاول مجدداً!'}
        </div>
      )}
    </div>
  );
};
