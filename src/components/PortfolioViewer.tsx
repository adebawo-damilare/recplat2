/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from "motion/react";
import { X, ExternalLink, ShieldCheck, Mail, Globe } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PortfolioViewerProps {
  content?: string | null;
  url?: string | null;
  onClose: () => void;
  candidateName: string;
  candidateEmail: string;
}

export default function PortfolioViewer({ content, url, onClose, candidateName, candidateEmail }: PortfolioViewerProps) {
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-neutral-900/95 backdrop-blur-md"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-neutral-800 rounded-full transition-colors group"
            >
              <X className="w-6 h-6 text-neutral-400 group-hover:text-white" />
            </button>
            <div className="h-6 w-px bg-neutral-800 hidden sm:block" />
            <div>
              <h3 className="text-white font-bold text-sm hidden sm:block">{candidateName}'s Portfolio</h3>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span className="text-neutral-400 text-[10px] uppercase tracking-widest font-bold">In-App Verified Content</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 font-mono text-[10px]">
             {url && (
               <a 
                href={url.startsWith('http') ? url : `https://${url}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-neutral-800 rounded-lg text-neutral-400 border border-neutral-700 hover:text-white hover:border-neutral-600 transition-all max-w-sm truncate"
              >
                <Globe className="w-3 h-3" />
                {url}
              </a>
             )}
             <a 
              href={`mailto:${candidateEmail}`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20"
            >
              <Mail className="w-4 h-4" /> 
              <span className="hidden sm:inline">Contact Candidate</span>
            </a>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-y-auto bg-white m-4 sm:m-6 rounded-2xl shadow-2xl border border-neutral-800">
          <div className="max-w-4xl mx-auto p-8 sm:p-12 lg:p-20">
            {content ? (
              <div className="prose prose-neutral prose-lg max-w-none 
                prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-neutral-900
                prose-h1:text-4xl sm:prose-h1:text-6xl prose-h1:mb-12
                prose-p:text-neutral-600 prose-p:leading-relaxed prose-p:text-lg
                prose-li:text-neutral-600 prose-li:text-lg
                prose-strong:text-neutral-900 prose-strong:font-bold
                prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-neutral-900 prose-pre:text-neutral-100 prose-pre:rounded-2xl
                prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:italic prose-blockquote:text-neutral-500
                prose-img:rounded-2xl prose-img:shadow-lg">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                  <ExternalLink className="w-10 h-10 text-neutral-300" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-2">No In-App Portfolio</h3>
                <p className="text-neutral-500 max-w-md mb-8">
                  This candidate hasn't set up an in-app portfolio yet. You can try visiting their external link if available.
                </p>
                {url && (
                  <a 
                    href={url.startsWith('http') ? url : `https://${url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-4 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 transition-all"
                  >
                    Visit External Portfolio
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Banner */}
        <div className="px-8 py-2 text-center">
            <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider">
              Secure Portfolio Viewer • Built for In-App Candidate Experience
            </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
