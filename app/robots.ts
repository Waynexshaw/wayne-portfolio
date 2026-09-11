import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://defiwaynex.com'}/sitemap.xml`,
  }
}
