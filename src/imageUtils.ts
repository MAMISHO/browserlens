import { readFile } from "node:fs/promises";
import sharp from "sharp";

export async function imageToOptimizedBase64(imagePath: string): Promise<string> {
  const image = sharp(imagePath, { failOn: "none" });
  const metadata = await image.metadata();

  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;
  const largestSide = Math.max(width, height);
  const resize =
    largestSide > 1024
      ? width >= height
        ? { width: 1024 }
        : { height: 1024 }
      : {};

  const buffer = await image
    .resize(resize)
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  return buffer.toString("base64");
}

export async function fileToBase64(imagePath: string): Promise<string> {
  return (await readFile(imagePath)).toString("base64");
}

export async function comparisonContactSheetBase64(
  referenceImagePath: string,
  candidateImagePath: string
): Promise<string> {
  const panelWidth = 376;
  const panelHeight = 724;
  const gap = 16;
  const width = panelWidth * 2 + gap;
  const height = panelHeight;

  const reference = await sharp(referenceImagePath, { failOn: "none" })
    .resize({
      width: panelWidth,
      height: panelHeight,
      fit: "inside",
      withoutEnlargement: true
    })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();

  const candidate = await sharp(candidateImagePath, { failOn: "none" })
    .resize({
      width: panelWidth,
      height: panelHeight,
      fit: "inside",
      withoutEnlargement: true
    })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();

  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#ffffff"
    }
  })
    .composite([
      { input: reference, left: 0, top: 0 },
      { input: candidate, left: panelWidth + gap, top: 0 }
    ])
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();

  return buffer.toString("base64");
}
