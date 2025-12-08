import Navigation from './Navigation'
import Footer from './Footer'
import AuthButton from './AuthButton'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

