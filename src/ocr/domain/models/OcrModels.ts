export interface TextBlock {
  text: string;
  role?: string;
}

export interface ExtractedText {
  text: string;
  blocks: TextBlock[];
}

export interface ExtractedMarkdown {
  markdown: string;
}
