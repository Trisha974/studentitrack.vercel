import './Navbar.css'

function Navbar({ title = "studentitrack", subtitle = "University of Mindanao Tagum College - Visayan Campus" }) {
  return (
    <nav className="application-header fixed top-0 w-full bg-white/90 backdrop-blur-md shadow-md z-20">
      <div className="header-content-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="header-navigation-content flex justify-between items-center h-16">
          <div className="university-branding-section flex items-center space-x-3">
            <img src="/assets/logos/um logo.png" alt="UM Logo" className="university-logo-image h-12 w-auto" />
            <div>
              <h1 className="application-title text-xl font-bold university-primary-color leading-tight navigation-text">
                {title}
              </h1>
              <p className="university-info-text text-sm navigation-text">{subtitle}</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

