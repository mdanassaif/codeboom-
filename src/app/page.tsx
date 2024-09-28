'use client'

import React, { useState } from 'react';
import axios from 'axios';
import JSZip from 'jszip';
import { FaGlobe, FaDownload, FaCog } from 'react-icons/fa';

export default function CloneBoomScraper() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [includeScripts, setIncludeScripts] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await axios.post('/api/scrape', { url, includeScripts });
      const { html, css, cloneBoomCss } = response.data;

      const zip = new JSZip();
      zip.file('index.html', html);
      zip.file('style.css', css);
      zip.file('cloneboom-styles.css', cloneBoomCss);

      const content = await zip.generateAsync({ type: 'blob' });

      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(content);
      downloadLink.download = 'cloneBoom.zip';
      downloadLink.click();

      setSuccess(true);
    } catch (error) {
      console.error('Failed to scrape:', error);
      setError('Failed to scrape the website. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-emerald-800 to-teal-600 p-6">
      <div className="bg-white shadow-2xl rounded-lg p-8 w-full max-w-lg">
        <h1 className="text-4xl font-extrabold text-emerald-800 mb-6 text-center flex items-center justify-center">
          <FaGlobe className="mr-2" />
          CloneBoom
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter website URL"
              className="w-full p-4 border-2 border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-200 ease-in-out"
              required
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <FaGlobe className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeScripts"
              checked={includeScripts}
              onChange={(e) => setIncludeScripts(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="includeScripts" className="text-sm text-gray-600">Include scripts (may affect cloning accuracy)</label>
          </div>
          <button 
            type="submit" 
            className={`w-full py-4 text-white rounded-lg font-semibold text-lg flex items-center justify-center ${loading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'} transition duration-200 ease-in-out transform hover:scale-105`}
            disabled={loading}
          >
            {loading ? (
              <>
                <FaCog className="animate-spin mr-2" />
                Cloning...
              </>
            ) : (
              <>
                <FaDownload className="mr-2" />
                Clone and Download
              </>
            )}
          </button>
        </form>
        {error && (
          <div className="mt-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="mt-6 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded" role="alert">
            <p className="font-bold">Success!</p>
            <p>Your cloned website has been downloaded successfully.</p>
          </div>
        )}
      </div>
    </div>
  );
}