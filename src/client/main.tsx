import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App as AntdApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          // 🌟 温暖友好的色系
          colorPrimary: '#f97316', // 橙色系主色
          colorSuccess: '#10b981', // 翠绿
          colorWarning: '#f59e0b', // 琥珀
          colorError: '#ef4444',   // 玫瑰红
          colorInfo: '#3b82f6',    // 天蓝
          colorTextBase: '#1f2937', // 深灰文字
          
          // 🎯 圆润设计
          borderRadius: 16,
          borderRadiusSM: 8,
          borderRadiusLG: 20,
          
          // 📏 间距和大小
          lineHeight: 1.6,
          lineHeightHeading1: 1.3,
          lineHeightHeading2: 1.4,
          
          // 🎨 阴影 - 柔和温暖
          boxShadowSecondary: '0 4px 16px rgba(249, 115, 22, 0.08)',
          
          // ⌨️ 控件大小
          controlHeight: 44,
          controlHeightLG: 48,
          fontSize: 14,
          fontSizeHeading3: 18,
          fontSizeHeading4: 16,
          
          // 🎪 按钮
          fontWeightStrong: 600,
          paddingContentHorizontal: 24,
          paddingContentVertical: 16,
        },
        components: {
          Button: {
            controlHeight: 44,
            fontWeight: 600,
            paddingInline: 20,
            borderRadius: 12,
            // ✨ 平滑过渡
            controlOutlineWidth: 0,
          },
          Input: {
            borderRadius: 12,
            fontSize: 14,
            controlHeight: 44,
          },
          InputNumber: {
            borderRadius: 12,
            controlHeight: 44,
          },
          Card: {
            borderRadiusLG: 16,
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
            boxShadowSecondary: '0 1px 4px rgba(0, 0, 0, 0.03)',
          },
          Layout: {
            headerBg: '#ffffff',
            bodyBg: '#fafaf9', // 温暖米色背景
            headerHeight: 64,
            headerPadding: '0 24px',
          },
          Form: {
            labelFontSize: 14,
            labelHeight: 32,
            labelColor: '#4b5563',
          },
          Alert: {
            borderRadiusLG: 12,
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          },
          Modal: {
            borderRadiusLG: 16,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12)',
          },
          Avatar: {
            borderRadius: 50,
          },
        },
      }}
    >
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
