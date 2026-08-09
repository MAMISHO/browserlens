export interface AnalyzeImageInput {
  goal: string;
  expectations?: string[];
  imagePath: string;
}

export interface CompareImagesInput {
  goal: string;
  expectations?: string[];
  referenceImagePath: string;
  candidateImagePath: string;
}
