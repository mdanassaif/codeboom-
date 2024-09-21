'use client'

import { useState } from 'react'
import axios from 'axios'
import JSZip from 'jszip'

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await axios.post('/api/scrape', { url })
      const { html, css } = response.data
      
  

      const zip = new JSZip()
      const folder = zip.folder('cloneBoom')
    

      folder.file('index.html', html)
      folder.file('style.css', css)

      //   zip file
      const content = await zip.generateAsync({ type: 'blob' })

      // download
      const downloadLink = document.createElement('a')
      downloadLink.href = URL.createObjectURL(content)
      downloadLink.download = 'cloneBoom.zip'
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

    } catch (error) {
      console.error('Failed to scrape:', error)
      setError('Failed to scrape the website. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 p-6">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-lg">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">
          Website Scraper
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter website URL"
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button 
            type="submit" 
            className={`w-full py-3 text-white rounded ${loading ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'} transition duration-200 ease-in-out`}
            disabled={loading}
          >
            {loading ? 'Scraping...' : 'Scrape and Download'}
          </button>
        </form>
        {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
      </div>
    </div>
  )
}
