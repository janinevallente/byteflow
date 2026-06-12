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

const tools = [
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

export default function Home({ onSelectTool }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-14">
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 bg-accentBg border border-accentBorder rounded-full px-4 py-1.5 text-xs text-accent font-medium mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          Free · No sign-up · Works offline
        </div>
        <h1 className="text-4xl font-bold mb-4 text-textHeader tracking-tight leading-tight">
          Developer Tools,<br />
          <span className="text-accent">Right in Your Browser</span>
        </h1>
        <p className="text-text max-w-[440px] mx-auto text-[15px] leading-relaxed">
          A growing collection of dev utilities. No installs, no uploads to servers — everything runs locally.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {tools.map(({ id, icon: Icon, label, description, tags }) => (
          <button
            key={id}
            onClick={() => onSelectTool(id)}
            className="bg-backgroundCard border border-borderColor rounded-2xl p-6 text-left cursor-pointer transition-all duration-150 hover:border-accentBorder hover:-translate-y-0.5"
          >
            <div className="text-accent bg-accentBg border border-accentBorder rounded-xl inline-flex p-2.5 mb-4">
              <Icon size={22} />
            </div>
            <h2 className="text-base font-semibold mb-1.5 text-textHeader">{label}</h2>
            <p className="text-[13px] text-text mb-3.5 leading-relaxed">{description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}