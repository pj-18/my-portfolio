import { MobileFramePreview } from './components/MobileFramePreview'
import { ProfileHeader } from './components/ProfileHeader'
import { TopFourFilms } from './components/TopFourFilms'
import { LetterboxdDiary } from './components/LetterboxdDiary'
import { OscarSection } from './components/OscarSection'
import { SocialLinks } from './components/SocialLinks'
import { BottomNav } from './components/BottomNav'

export function App() {
  return (
    <MobileFramePreview>
      <div className="relative">
        {/* Profile Info Header */}
        <ProfileHeader />

        {/* Top 4 Criterion / Letterboxd Favorites */}
        <div id="top4">
          <TopFourFilms />
        </div>

        {/* Live Letterboxd Diary (Last 5 Entries) */}
        <LetterboxdDiary />

        {/* Oscar Season Progress & Predictions Hub */}
        <OscarSection />

        {/* Social Media Links & Footer */}
        <SocialLinks />

        {/* Mobile Floating Bottom Bar */}
        <BottomNav />
      </div>
    </MobileFramePreview>
  )
}

export default App
