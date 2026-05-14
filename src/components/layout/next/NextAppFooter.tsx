import Link from "next/link";
import { Briefcase } from "lucide-react";

export default function NextAppFooter() {
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
              Empowering the next generation of professionals and companies through intelligent selection and profile management.
            </p>
          </div>
          <div>
            <h5 className="font-bold text-sm mb-6">Platform</h5>
            <ul className="space-y-3 text-sm text-neutral-500 font-medium">
              <li><Link href="/dashboard/profile" className="hover:text-blue-600 transition-colors">For Candidates</Link></li>
              <li><Link href="/dashboard/applications" className="hover:text-blue-600 transition-colors">My applications</Link></li>
              <li><Link href="/dashboard/company" className="hover:text-blue-600 transition-colors">For Companies</Link></li>
              <li><Link href="/talent" className="hover:text-blue-600 transition-colors">Find Candidates</Link></li>
              <li><Link href="/jobs" className="hover:text-blue-600 transition-colors">Find Jobs</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-sm mb-6">Company</h5>
            <ul className="space-y-3 text-sm text-neutral-500 font-medium">
              <li><Link href="/about" className="hover:text-blue-600 transition-colors">About Us</Link></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">Press</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a></li>
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