export interface FeedbackData {
    actor: string;
    theme: string;
    email: string;
    name_company?: string; // Опционально, так как blank=True в модели
    name_person: string;
    message: string;
  }