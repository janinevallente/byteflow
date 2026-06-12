import { 
  Eraser,
  Scissors,
  CircleDashed, 
  ImageIcon, 
  Pipette,
  Palette,
  Contrast,
  Blend,
  Sparkles,
  LifeBuoy,
} from 'lucide-react'

export const tools = [
  // Image & Assets Category
  {
    id: 'bg-remover',
    icon: Eraser,
    label: 'Background Remover',
    description: 'Remove backgrounds from images instantly using edge detection. Export as transparent PNG.',
  },
  {
    id: 'image-converter',
    icon: ImageIcon,
    label: 'Image Converter',
    description: 'Convert between PNG, JPEG, WebP, GIF, BMP, TIFF, ICO. Batch processing with resize options.',
  },
  {
    id: 'image-clipper',
    icon: Scissors,
    label: 'Image Clipper',
    description: 'Automatically trim transparent edges from PNG images. Perfect for icons, logos, and illustrations.',
  },
  {
    id: 'circle-cropper',
    icon: CircleDashed,
    label: 'Circle Cropper',
    description: 'Crop any image into a perfect circle. Drag & resize the circle overlay, then export as transparent PNG.',
  },
  
  // Colors Category
  {
    id: 'pixel-picker',
    icon: Pipette,
    label: 'Pixel Picker',
    description: 'Pick colors from any image or directly from your screen. Get HEX, RGB, HSL, and OKLCH values.',
  },
  {
    id: 'color-converter',
    icon: Palette,
    label: 'Color Converter',
    description: 'Convert between HEX, RGB, HSL, LAB, LCH, OKLAB, and OKLCH color formats. Real-time conversion.',
  },
  {
    id: 'color-wheel',
    icon: LifeBuoy,
    label: 'Color Wheel',
    description: 'Pick a base color from an interactive color wheel and explore analogous, complementary, triadic, and other harmonies.',
  },
  {
    id: 'contrast-checker',
    icon: Contrast,
    label: 'Contrast Checker',
    description: 'Check WCAG 2.1 color contrast compliance. Automatically fix colors to meet AA or AAA standards.',
  },
  {
    id: 'gradient-generator',
    icon: Blend,
    label: 'Gradient Generator',
    description: 'Create beautiful CSS gradients with multiple color stops. Export as CSS code or copy to clipboard.',
  },
  {
    id: 'palette-extractor',
    icon: ImageIcon,
    label: 'Palette Extractor',
    description: 'Extract color palettes from any image. Get dominant colors and generate harmonious schemes.',
  },
]