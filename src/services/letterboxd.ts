import type { DiaryEntry } from '../types'

// High-quality fallback entries in case of network CORS / offline development
export const fallbackDiaryEntries: DiaryEntry[] = [
  {
    id: "lb-review-1552412496",
    title: "Love Insurance Kompany",
    year: "2026",
    rating: 2.0,
    ratingStars: "★★",
    review: "Black Mirror episode made into a 2hr 40min film",
    posterUrl: "https://a.ltrbxd.com/resized/film-poster/1/0/9/3/9/9/5/1093995-love-insurance-kompany-0-600-0-900-crop.jpg?v=6aa96f82a3",
    letterboxdUrl: "https://letterboxd.com/pj_18/film/love-insurance-kompany/",
    watchedDate: "Oct 24, 2026",
    isRewatch: false,
  },
  {
    id: "lb-review-1551088681",
    title: "Clayface",
    year: "2026",
    rating: 4.0,
    ratingStars: "★★★★",
    review: "This is great for a 30M budget",
    posterUrl: "https://a.ltrbxd.com/resized/film-poster/1/2/8/4/6/3/6/1284636-clayface-0-600-0-900-crop.jpg?v=eb305849d5",
    letterboxdUrl: "https://letterboxd.com/pj_18/film/clayface/",
    watchedDate: "Oct 24, 2026",
    isRewatch: false,
  },
  {
    id: "lb-watch-1550715696",
    title: "Whalefall",
    year: "2026",
    rating: 3.0,
    ratingStars: "★★★",
    posterUrl: "https://a.ltrbxd.com/resized/film-poster/1/1/3/9/8/3/4/1139834-whalefall-0-600-0-900-crop.jpg?v=e0ec86ea62",
    letterboxdUrl: "https://letterboxd.com/pj_18/film/whalefall/",
    watchedDate: "Oct 19, 2026",
    isRewatch: false,
  },
  {
    id: "lb-watch-1549733184",
    title: "Jailer 2",
    year: "2026",
    rating: 3.0,
    ratingStars: "★★★",
    review: "Thalaivar screen presence 🫡",
    posterUrl: "https://a.ltrbxd.com/resized/film-poster/1/1/1/7/6/5/3/1117653-jailer-2-2026-0-600-0-900-crop.jpg?v=a29f5a504f",
    letterboxdUrl: "https://letterboxd.com/pj_18/film/jailer-2-2026/1/",
    watchedDate: "Oct 22, 2026",
    isRewatch: true,
  },
  {
    id: "lb-review-1547116416",
    title: "Couple Friendly",
    year: "2026",
    rating: 3.5,
    ratingStars: "★★★½",
    review: "Unexpectedly good. Best Telugu movie of 2026 for me but it’s directed by Tamilan",
    posterUrl: "https://a.ltrbxd.com/resized/film-poster/1/3/1/8/2/4/3/1318243-couple-friendly-0-600-0-900-crop.jpg?v=6d3d08f8d1",
    letterboxdUrl: "https://letterboxd.com/pj_18/film/couple-friendly/",
    watchedDate: "Oct 20, 2026",
    isRewatch: false,
  },
]

// Extract star rating string (e.g. ★★★★½) from title or text
function extractRating(title: string): { cleanTitle: string; stars?: string; ratingNumber?: number } {
  const starMatch = title.match(/-\s*([★½]+)$/)
  if (starMatch) {
    const stars = starMatch[1]
    const fullStars = (stars.match(/★/g) || []).length
    const hasHalf = stars.includes('½') ? 0.5 : 0
    const ratingNumber = fullStars + hasHalf
    const cleanTitle = title.replace(/\s*-\s*[★½]+$/, '').trim()
    return { cleanTitle, stars, ratingNumber }
  }
  return { cleanTitle: title }
}

// Extract poster image src from HTML description
function extractPosterAndReview(htmlContent: string): { posterUrl?: string; reviewText?: string } {
  let posterUrl: string | undefined
  let reviewText: string | undefined

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlContent, 'text/html')
    const img = doc.querySelector('img')
    if (img && img.src) {
      posterUrl = img.src
    }

    // Paragraphs after poster usually contain the review
    const paragraphs = Array.from(doc.querySelectorAll('p'))
    const nonImgParagraphs = paragraphs.filter(p => !p.querySelector('img'))
    if (nonImgParagraphs.length > 0) {
      const combined = nonImgParagraphs.map(p => p.textContent?.trim()).filter(Boolean).join('\n\n')
      // If it's just the default "Watched on ..." line with no actual user review, ignore it
      if (!/^Watched on\s+[A-Za-z]+/i.test(combined)) {
        reviewText = combined
      }
    }
  } catch {
    // Fallback regex
    const imgMatch = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (imgMatch) {
      posterUrl = imgMatch[1]
    }
  }

  return { posterUrl, reviewText }
}

// Format date nicely (e.g. "Oct 24, 2024" or "3 days ago")
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr

    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

/**
 * Fetch last 5 diary entries from Letterboxd RSS
 */
export async function fetchLetterboxdDiary(username: string): Promise<DiaryEntry[]> {
  const cleanUsername = username.trim().toLowerCase().replace(/^@/, '')
  if (!cleanUsername) return fallbackDiaryEntries

  const rssUrl = `https://letterboxd.com/${cleanUsername}/rss/`

  // Strategy 1: allorigins raw XML
  try {
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`)
    if (res.ok) {
      const xmlText = await res.text()
      const parsed = parseRawXml(xmlText)
      if (parsed.length > 0) {
        return parsed.slice(0, 5)
      }
    }
  } catch (err) {
    console.warn('allorigins raw failed:', err)
  }

  // Strategy 2: corsproxy.io direct fetch
  try {
    const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(rssUrl)}`)
    if (res.ok) {
      const xmlText = await res.text()
      const parsed = parseRawXml(xmlText)
      if (parsed.length > 0) {
        return parsed.slice(0, 5)
      }
    }
  } catch (err) {
    console.warn('corsproxy failed:', err)
  }

  // Strategy 3: rss2json API
  try {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`)
    if (res.ok) {
      const data = await res.json()
      if (data.status === 'ok' && Array.isArray(data.items) && data.items.length > 0) {
        return parseRss2JsonItems(data.items).slice(0, 5)
      }
    }
  } catch (err) {
    console.warn('rss2json failed:', err)
  }

  // Fallback to real cached/mock data if feeds are offline
  return fallbackDiaryEntries
}

function parseRss2JsonItems(items: any[]): DiaryEntry[] {
  return items.map((item, index) => {
    const rawTitle = item.title || 'Untitled'
    const { cleanTitle, stars, ratingNumber } = extractRating(rawTitle)
    const { posterUrl, reviewText } = extractPosterAndReview(item.description || item.content || '')

    // Extract year from title if present (e.g. "Film Name, 2024")
    const yearMatch = cleanTitle.match(/,?\s*(\d{4})$/)
    const filmTitle = yearMatch ? cleanTitle.replace(/,?\s*\d{4}$/, '').trim() : cleanTitle
    const filmYear = yearMatch ? yearMatch[1] : undefined

    return {
      id: item.guid || `lb-${index}-${Date.now()}`,
      title: filmTitle,
      year: filmYear,
      rating: ratingNumber,
      ratingStars: stars,
      review: reviewText,
      posterUrl: posterUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80",
      letterboxdUrl: item.link || `https://letterboxd.com`,
      watchedDate: formatDate(item.pubDate),
      isRewatch: item.description?.includes('rewatch') || false,
    }
  })
}

function parseRawXml(xmlText: string): DiaryEntry[] {
  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlText, 'text/xml')
  const items = Array.from(xml.querySelectorAll('item'))

  return items.map((item, index) => {
    const titleEl = item.querySelector('title')
    const rawTitle = titleEl?.textContent || 'Untitled'
    const linkEl = item.querySelector('link')
    const pubDateEl = item.querySelector('pubDate')
    const descEl = item.querySelector('description')
    const watchedDateEl = item.getElementsByTagName('letterboxd:watchedDate')[0]
    const ratingEl = item.getElementsByTagName('letterboxd:memberRating')[0]
    const filmTitleEl = item.getElementsByTagName('letterboxd:filmTitle')[0]
    const filmYearEl = item.getElementsByTagName('letterboxd:filmYear')[0]
    const rewatchEl = item.getElementsByTagName('letterboxd:rewatch')[0]

    const { cleanTitle, stars } = extractRating(rawTitle)
    const { posterUrl, reviewText } = extractPosterAndReview(descEl?.textContent || '')

    const numericRating = ratingEl?.textContent ? parseFloat(ratingEl.textContent) : undefined
    const isRewatch = rewatchEl?.textContent?.toLowerCase() === 'yes'

    return {
      id: `xml-${index}-${Date.now()}`,
      title: filmTitleEl?.textContent || cleanTitle,
      year: filmYearEl?.textContent,
      rating: numericRating,
      ratingStars: stars || (numericRating ? '★'.repeat(Math.floor(numericRating)) + (numericRating % 1 ? '½' : '') : undefined),
      review: reviewText,
      posterUrl: posterUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80",
      letterboxdUrl: linkEl?.textContent || 'https://letterboxd.com',
      watchedDate: formatDate(watchedDateEl?.textContent || pubDateEl?.textContent || ''),
      isRewatch,
    }
  })
}
