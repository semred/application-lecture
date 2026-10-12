/**
 * Data structures for Interactive Books & Exercises for Neo-literates
 */

export type ExerciseType = 'fillblank' | 'qcm' | 'image_click' | 'word_order' | 'sequence_order';

export interface BaseExercise {
  id: string;
  type: ExerciseType;
  titre?: string;
}

export interface FillBlankExercise extends BaseExercise {
  type: 'fillblank';
  texte: string; // e.g. "التَّغْذِيَةُ ___ هِيَ الدِّرْعُ ___ لِلْإِنْسَانِ."
  reponses: string[]; // words in order of blanks
  leurres?: string[]; // distractors
  motsMelanges: string[]; // shuffled chips
}

export interface QcmExercise extends BaseExercise {
  type: 'qcm';
  question: string;
  audioPrompt?: string;
  options: string[];
  bonneReponseIndex: number;
  explication?: string;
}

export interface ImageOption {
  id: string;
  url: string;
  label: string;
}

export interface ImageClickExercise extends BaseExercise {
  type: 'image_click';
  instruction: string; // e.g. "إِضْغَطْ عَلَى صُورَةِ الفَاكِهَةِ الصِّحِّيَّةِ"
  images: ImageOption[];
  bonneImageId: string;
}

export interface WordOrderExercise extends BaseExercise {
  type: 'word_order';
  instruction?: string;
  phraseCorrecte: string; // e.g. "تَنَاوَلْ خُضَاراً وَفَوَاكِهَ طَازَجَةً"
  motsMelanges: string[];
}

export interface SequenceItem {
  id: string;
  texte: string;
  image?: string;
  ordreCorrect: number; // 1, 2, 3...
}

export interface SequenceOrderExercise extends BaseExercise {
  type: 'sequence_order';
  consigne: string;
  elements: SequenceItem[];
}

export type Exercise = 
  | FillBlankExercise 
  | QcmExercise 
  | ImageClickExercise 
  | WordOrderExercise 
  | SequenceOrderExercise;

export interface WordTiming {
  texte: string;
  debut: number; // in seconds
  fin: number; // in seconds
}

export interface VocabItem {
  mot: string;
  traduction: string;
  synonymes?: string[];
  exemple?: string;
}

export interface BookPage {
  numero: number;
  titreSection: string;
  image?: string; // URL, data URL or path
  imageFileData?: string; // base64 representation for full export
  texteAffiche: string;
  audioMode: 'tts' | 'mp3';
  audioPage?: string;
  audioFileData?: string; // base64 representation for full export
  mots: WordTiming[];
  vocabulaire: VocabItem[];
  exercices: Exercise[];
  notes?: string;
}

export interface Book {
  id: string;
  titre: string;
  couverture?: string;
  couvertureFileData?: string;
  description: string;
  audioLivre?: string;
  auteur?: string;
  niveau: 'debutant' | 'moyen' | 'avance';
  pages: BookPage[];
  resume: {
    texte: string;
    modeAudio: 'tts' | 'mp3';
    audio?: string;
    audioFileData?: string;
  };
  dateCreation: string;
  dateMAJ?: string;
}

export interface BookCatalogItem {
  id: string;
  titre: string;
  description: string;
  couverture?: string;
  resume?: string;
  niveau: 'debutant' | 'moyen' | 'avance';
  auteur?: string;
  nombrePages: number;
  fichierJSON?: string;
  dateAjout?: string;
}
