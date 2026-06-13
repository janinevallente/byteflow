import { ConfigProvider, theme } from 'antd'

// Wraps the app with an antd ConfigProvider whose tokens mirror the
// Tailwind theme colors (see tailwind.config.js) so antd components
// blend in with the rest of the dark UI.
export default function AntThemeProvider({ children }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#9459d0',
          colorBgContainer: '#0f1015',
          colorBgElevated: '#16171d',
          colorBorder: '#2e303a',
          colorText: '#f3f4f6',
          colorTextSecondary: '#9ca3af',
          colorTextPlaceholder: '#9ca3af',
          colorTextDescription: '#9ca3af',
          borderRadius: 8,
          fontFamily: "'Poppins', system-ui, sans-serif",
          controlHeight: 36,
        },
        components: {
          Select: {
            colorBgContainer: '#0f1015',
            colorBorder: '#2e303a',
            colorText: '#f3f4f6',
            colorTextPlaceholder: '#9ca3af',
            optionSelectedBg: 'rgba(148, 89, 208, 0.15)',
            optionSelectedColor: '#9459d0',
            optionActiveBg: 'rgba(148, 89, 208, 0.1)',
            colorBgElevated: '#16171d',
            controlOutline: 'rgba(148, 89, 208, 0.2)',
            colorPrimaryHover: '#9459d0',
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  )
}