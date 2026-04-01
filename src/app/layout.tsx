import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono, Noto_Sans_SC } from 'next/font/google';

import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
});

const notoSansSc = Noto_Sans_SC({
  subsets: ['latin'],
  variable: '--font-noto-sans-sc',
  weight: ['400', '500', '600', '700'],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'ELSCBSSXT 跨境电商成本测算系统',
  description: '用于跨境电商业务的成本测算、权限控制与经营数据管理。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${dmSans.variable} ${notoSansSc.variable} ${jetBrainsMono.variable} h-full antialiased`}
      lang="zh-CN"
    >
      <body className="flex min-h-full flex-col bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
