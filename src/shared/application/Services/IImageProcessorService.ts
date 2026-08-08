export interface IImageProcessorService {
  imageToOptimizedBase64(imagePath: string): Promise<string>;
  fileToBase64(imagePath: string): Promise<string>;
  comparisonContactSheetBase64(referenceImagePath: string, candidateImagePath: string): Promise<string>;
}
