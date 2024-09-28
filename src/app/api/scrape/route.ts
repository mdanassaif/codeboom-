import { NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'
import prettier from 'prettier'
import postcss from 'postcss'
import cssnano from 'cssnano'
import autoprefixer from 'autoprefixer'


async function fetchResource(url: string): Promise<string> {
  try {
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 10000,
      maxContentLength: 10 * 1024 * 1024  
    })
    return Buffer.from(response.data, 'binary').toString('base64')
  } catch (error) {
    console.error(`Failed to fetch resource from ${url}:`, error)
    return ''
  }
}

async function fetchCss(url: string): Promise<string> {
  try {
    const response = await axios.get(url, { timeout: 10000 })
    return response.data
  } catch (error) {
    console.error(`Failed to fetch CSS from ${url}:`, error)
    return ''
  }
}

async function processCSS(css: string): Promise<string> {
  const result = await postcss([autoprefixer, cssnano]).process(css, { from: undefined })
  return result.css
}

export async function POST(req: Request) {
  const { url, includeScripts }: { url: string; includeScripts: boolean } = await req.json()

  try {
    const response = await axios.get(url, { timeout: 30000 })
    const $ = cheerio.load(response.data)

    let css = ''
    const cssPromises: Promise<string>[] = []
    const assetPromises: Promise<void>[] = []

    // Extract inline styles
    $('style').each((_, el) => {
      css += $(el).html() + '\n'
    })

    // Extract and fetch external stylesheets
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href')
      if (href) {
        const fullUrl = new URL(href, url).href
        cssPromises.push(fetchCss(fullUrl))
      }
    })

    // Handle images and other assets
    $('img, source, video, audio, link[rel="icon"]').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('href')
      if (src) {
        const fullUrl = new URL(src, url).href
        assetPromises.push(
          fetchResource(fullUrl).then(base64 => {
            const attr = el.tagName === 'link' ? 'href' : 'src'
            const mimeType = el.tagName === 'link' ? 'image/x-icon' : 'application/octet-stream'
            $(el).attr(attr, `data:${mimeType};base64,${base64}`)
          })
        )
      }
    })

    await Promise.all([...cssPromises, ...assetPromises])

    const fetchedCssArray = await Promise.all(cssPromises)
    css += fetchedCssArray.join('\n')

    // Process and minify CSS
    css = await processCSS(css)

    if (includeScripts) {
      // Preserve scripts
      $('script').each((_, el) => {
        const src = $(el).attr('src')
        if (src) {
          const fullUrl = new URL(src, url).href
          $(el).attr('src', fullUrl)
        }
      })
    } else {
      // Remove all scripts if not included
      $('script').remove()
    }

    // Remove external stylesheet links
    $('link[rel="stylesheet"]').remove()

    // Wrap content for easier styling
    $('body').wrapInner('<div class="cloneboom-content-wrapper"></div>')

    // Add our custom styles
    $('head').append('<link rel="stylesheet" href="cloneboom-styles.css">')
    $('head').append('<link rel="stylesheet" href="style.css">')

    let html = $.html()

    // Format HTML and CSS
    html = await prettier.format(html, { parser: 'html' })

    // Custom CSS to enhance cloned sites
    const cloneBoomCss = `
     /* cloneboom-styles.css */
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');

:root {
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
  --text-color: #333333;
  --background-color: #f4f4f4;
  --border-color: #e0e0e0;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Roboto', Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--background-color);
}

.cloneboom-content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  line-height: 1.2;
  color: var(--primary-color);
}

h1 { font-size: 2.5em; }
h2 { font-size: 2em; }
h3 { font-size: 1.75em; }
h4 { font-size: 1.5em; }
h5 { font-size: 1.25em; }
h6 { font-size: 1em; }

p {
  margin-bottom: 1em;
}

/* Links */
a {
  color: var(--primary-color);
  text-decoration: none;
  transition: color 0.3s ease;
}

a:hover {
  color: var(--secondary-color);
  text-decoration: underline;
}

/* Images and media */
img, video, iframe {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Tables */
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-bottom: 1em;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

th {
  background-color: var(--primary-color);
  color: white;
  font-weight: bold;
}

tr:last-child td {
  border-bottom: none;
}

/* Forms */
input, textarea, select {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

button {
  display: inline-block;
  padding: 10px 20px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.1s ease;
}

button:hover {
  background-color: var(--secondary-color);
}

button:active {
  transform: translateY(1px);
}

/* Accessibility */
:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* Responsive design */
@media (max-width: 768px) {
  .cloneboom-content-wrapper {
    padding: 15px;
  }

  body {
    font-size: 14px;
  }

  h1 { font-size: 2em; }
  h2 { font-size: 1.75em; }
  h3 { font-size: 1.5em; }
  h4 { font-size: 1.25em; }
  h5 { font-size: 1.1em; }
  h6 { font-size: 1em; }
}

/* Print styles */
@media print {
  .cloneboom-content-wrapper {
    width: 100%;
    margin: 0;
    padding: 0;
  }

  body {
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
    background-color: #fff;
  }

  a {
    text-decoration: underline;
    color: #000;
  }

  @page {
    margin: 2cm;
  }
}
    `

    return NextResponse.json({ html, css, cloneBoomCss })
  } catch (error) {
    console.error('Scraping error:', error)
    return NextResponse.json({ error: 'Failed to scrape the website. Please check the URL and try again.' }, { status: 500 })
  }
}