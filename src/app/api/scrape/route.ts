import { NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'
import prettier from 'prettier'

async function fetchCss(url: string): Promise<string> {
  try {
    const response = await axios.get(url)
    return response.data
  } catch (error) {
    console.error(`Failed to fetch CSS from ${url}:`, error)
    return ''
  }
}

export async function POST(req: Request) {
  const { url } = await req.json()

  try {
    const response = await axios.get(url)
    const $ = cheerio.load(response.data)

    // css extract
    let css = ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cssPromises: any[] = []

    $('style').each((_, el) => {
      css += $(el).html() + '\n'
    })

    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href')
      if (href) {
        const fullUrl = new URL(href, url).href
        cssPromises.push(fetchCss(fullUrl))
      }
    })

    const fetchedCssArray = await Promise.all(cssPromises)
    css += fetchedCssArray.join('\n')

    // ....resources
    $('img').each((_, el) => {
      const src = $(el).attr('src')
      if (src && !src.startsWith('http')) {
        $(el).attr('src', new URL(src, url).href)
      }
    })

    // no need of scripts
    $('script').remove()
    $('style').remove()
    $('link[rel="stylesheet"]').remove()

    // Add link to external CSS file
    $('head').append('<link rel="stylesheet" href="style.css">')

    // Get the HTML  no css and Js
    let html = $.html()

    // Format HTML
    html = await prettier.format(html, { parser: 'html' })

    // Format CSS
    css = await prettier.format(css, { parser: 'css' })

    return NextResponse.json({ html, css })
  } catch (error) {
    console.error('Scraping error:', error)
    return NextResponse.json({ error: 'Failed to scrape the website' }, { status: 500 })
  }
}
