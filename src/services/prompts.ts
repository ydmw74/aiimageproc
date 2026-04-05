export const SYSTEM_PROMPT = `You are an AI image editing assistant. You will receive an image and instructions on how to edit it.

Your task is to:
1. Analyze the image and understand what needs to be changed
2. Follow the user's instructions precisely
3. If a mask is provided, only edit the marked areas
4. Maintain natural-looking results
5. Preserve the overall style and quality of the original image

Respond with a description of the changes you made or would make.`;

export const FILTER_PROMPTS = {
  brightness: (value: number) => {
    if (value > 0) {
      return `Increase the brightness by ${value}%. Make the image brighter while maintaining natural colors and avoiding overexposure.`;
    } else if (value < 0) {
      return `Decrease the brightness by ${Math.abs(value)}%. Make the image darker while preserving details in shadows.`;
    }
    return '';
  },
  
  contrast: (value: number) => {
    if (value > 0) {
      return `Increase the contrast by ${value}%. Make the darks darker and lights lighter while maintaining detail.`;
    } else if (value < 0) {
      return `Decrease the contrast by ${Math.abs(value)}%. Soften the image contrast while maintaining clarity.`;
    }
    return '';
  },
  
  saturation: (value: number) => {
    if (value > 0) {
      return `Increase the color saturation by ${value}%. Make colors more vibrant while keeping them natural-looking.`;
    } else if (value < 0) {
      return `Decrease the color saturation by ${Math.abs(value)}%. Mute the colors while maintaining some color presence.`;
    }
    return '';
  },
};

export const PRESET_PROMPTS: Record<string, string> = {
  'remove-object': 'Remove the selected object seamlessly. Fill the area with appropriate background content that matches the surroundings. Make it look like the object was never there.',
  
  'change-background': 'Replace the background with a neutral gray or white background. Keep the main subject intact and create clean edges around it.',
  
  'enhance-colors': 'Enhance the colors to make them more vibrant and appealing. Improve color balance and make the image pop while maintaining a natural look.',
  
  'bw-convert': 'Convert this image to black and white. Create a high-contrast monochrome version with good tonal range. Emphasize textures and shapes.',
  
  'sharpen': 'Sharpen the image to enhance details and clarity. Apply moderate sharpening to make edges crisper without introducing artifacts.',
  
  'denoise': 'Reduce noise and grain in the image while preserving important details. Smooth out the image without making it look overly processed.',
  
  'hdr-effect': 'Apply an HDR-like effect to balance highlights and shadows. Bring out details in both bright and dark areas for a more dynamic range.',
  
  'vintage-filter': 'Apply a vintage film look with warm tones, slight fade, and subtle grain. Give it a nostalgic, retro aesthetic.',
};

export function generatePromptFromFilters(
  brightness: number,
  contrast: number,
  saturation: number
): string {
  const parts: string[] = [];
  
  const brightnessPrompt = FILTER_PROMPTS.brightness(brightness);
  if (brightnessPrompt) parts.push(brightnessPrompt);
  
  const contrastPrompt = FILTER_PROMPTS.contrast(contrast);
  if (contrastPrompt) parts.push(contrastPrompt);
  
  const saturationPrompt = FILTER_PROMPTS.saturation(saturation);
  if (saturationPrompt) parts.push(saturationPrompt);
  
  if (parts.length === 0) {
    return 'Apply subtle improvements to enhance the overall image quality.';
  }
  
  return parts.join(' ');
}

export function getMaskedPrompt(prompt: string, hasMask: boolean): string {
  if (!hasMask) {
    return prompt;
  }
  
  return `[MASK PROVIDED] Only edit the marked/masked areas. Keep all other parts of the image unchanged.\n\n${prompt}`;
}
