import { ConfigProvider, theme } from 'antd'
import { useTheme } from '../lib/ThemeContext'

// Mirrors the CSS custom properties in src/index.css. antd's theme algorithm
// derives hover/active/disabled shades from these via real color math at
// runtime, which requires actual hex values 
const PALETTES = {
  dark: {
    colorPrimary: '#3B5BDB',
    colorBgContainer: '#0F172A',
    colorBgElevated: '#111827',
    colorBorder: '#1E293B',
    colorText: '#F8FAFC',
    colorTextSecondary: '#94A3B8',
    colorTextPlaceholder: '#94A3B8',
    colorTextDescription: '#94A3B8',
    colorSuccess: '#10B981',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
  },
  light: {
    colorPrimary: '#3B5BDB',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBorder: '#E2E8F0',
    colorText: '#0F172A',
    colorTextSecondary: '#475569',
    colorTextPlaceholder: '#475569',
    colorTextDescription: '#475569',
    colorSuccess: '#10B981',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
  },
}

// Wraps the app with an antd ConfigProvider whose tokens mirror the
// Tailwind theme colors (see tailwind.config.js) so antd components
// blend in with the rest of the UI, in both light and dark mode.
export default function AntThemeProvider({ children }) {
  const { themeMode } = useTheme()
  const palette = PALETTES[themeMode]

  return (
    <ConfigProvider
      theme={{
        algorithm: themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          ...palette,
          borderRadius: 8,
          fontFamily: "'Poppins', system-ui, sans-serif",
          controlHeight: 36,
        },
        components: {
          Select: {
            colorBgContainer: palette.colorBgContainer,
            colorBorder: palette.colorBorder,
            colorText: palette.colorText,
            colorTextPlaceholder: palette.colorTextPlaceholder,
            optionSelectedBg: themeMode === 'dark' ? 'rgba(59, 91, 219, 0.18)' : 'rgba(59, 91, 219, 0.1)',
            optionSelectedColor: palette.colorPrimary,
            optionActiveBg: themeMode === 'dark' ? 'rgba(59, 91, 219, 0.12)' : 'rgba(59, 91, 219, 0.06)',
            colorBgElevated: palette.colorBgElevated,
            controlOutline: themeMode === 'dark' ? 'rgba(59, 91, 219, 0.2)' : 'rgba(59, 91, 219, 0.15)',
            colorPrimaryHover: palette.colorPrimary,
          },
          Checkbox: {
            colorPrimary: palette.colorPrimary,
            colorPrimaryHover: palette.colorPrimary,
            colorBgContainer: palette.colorBgContainer,
            colorBorder: palette.colorBorder,
            colorText: palette.colorText,
            borderRadiusSM: 6,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  )
}