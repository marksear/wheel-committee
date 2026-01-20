import './globals.css'

export const metadata = {
  title: 'Wheel Committee',
  description: 'Systematic premium collection via cash-secured puts and covered calls on quality stocks.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
