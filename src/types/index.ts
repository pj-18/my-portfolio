export interface DiaryEntry {
  id: string
  title: string
  year?: string
  rating?: number // e.g. 4.5
  ratingStars?: string // e.g. ★★★★½
  review?: string
  posterUrl: string
  letterboxdUrl: string
  watchedDate: string
  isRewatch?: boolean
}

export interface OscarNominee {
  id: string
  title: string
  category: string
  director?: string
  actors?: string
  posterUrl: string
  isWatched?: boolean
}

export interface OscarCategory {
  id: string
  name: string
  iconName?: string
  nominees: string[] // List of film titles or nominee names
  predictedWinner: string // "Will Win" (Industry favorite / Oscar favorite)
  preferredWinner: string // "Should Win" (Personal favorite)
  userNote?: string // Personal commentary / hot take
}

export interface PortfolioConfig {
  profile: {
    name: string
    handle: string
    tagline: string
    bio: string
    location: string
    avatarUrl: string
    currentlyWatching?: string
    filmStats: {
      filmsWatchedThisYear?: number
      allTimeFilms?: number
      avgRating?: string
    }
  }
  letterboxd: {
    username: string
    profileUrl: string
  }
  socials: {
    instagram: string
    linkedin: string
    letterboxd: string
    github?: string
    email?: string
    twitter?: string
  }
  topFourFilms: {
    title: string
    year: number
    director: string
    posterUrl: string
    letterboxdUrl?: string
  }[]
  oscarSeason: {
    isActive: boolean
    seasonTitle: string
    ceremonyDate: string
    nominees: OscarNominee[]
    categories: OscarCategory[]
  }
}

