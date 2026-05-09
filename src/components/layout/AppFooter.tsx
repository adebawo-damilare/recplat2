/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Briefcase } from "lucide-react";
import { AppView } from "../../appView";

interface AppFooterProps {
  onNavigate: (view: AppView) => void;
}

export default function AppFooter({ onNavigate }: AppFooterProps) {
  return (
    <footer className="bg-white border-t border-neutral-200 py-12" data-testid="app-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6 text-neutral-900">
              <Briefcase className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-xl tracking-tight">TalentBridge</span>
            </div>
            <p className="text-neutral-500 max-w-sm mb-6 leading-relaxed">
              Empowering the next generation of professionals and companies through intelligent selection and profile
              management.
            </p>
            <div className="flex gap-4">
              {["twitter", "linkedin", "github"].map((social) => (
                <div
                  key={social}
                  className="w-8 h-8 rounded-full bg-neutral-100 cursor-pointer hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center capitalize text-xs"
                >
                  {social.charAt(0)}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h5 className="font-bold text-sm mb-6">Platform</h5>
            <ul className="space-y-3 text-sm text-neutral-500 font-medium">
              <li>
                <button type="button" onClick={() => onNavigate(AppView.MY_PROFILE)} className="hover:text-blue-600 transition-colors">
                  For Candidates
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate(AppView.COMPANY_DASHBOARD)} className="hover:text-blue-600 transition-colors">
                  For Companies
                </button>
              </li>
              <li>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Find Candidates
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Enterprise
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-sm mb-6">Company</h5>
            <ul className="space-y-3 text-sm text-neutral-500 font-medium">
              <li>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Press
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-neutral-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-neutral-400 font-medium font-mono">
          <div>© 2026 TalentBridge Inc. All rights reserved.</div>
          <div>Crafted with precision for the future of work.</div>
        </div>
      </div>
    </footer>
  );
}
