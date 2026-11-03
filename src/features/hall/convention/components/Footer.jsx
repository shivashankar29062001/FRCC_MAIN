import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="bg-navy text-gray-400 py-6 border-t border-navy-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-2">
        <div className="flex items-center justify-center gap-3">
          <Logo variant="footer" size={36} />
          <span className="text-sm font-serif font-bold text-gold tracking-wide">FRCC CONVENTIONS</span>
        </div>
        <p className="text-center text-xs text-gray-300">Film Recreation & Cultural Centre</p>
        <p className="text-center text-xs text-gray-400">© {new Date().getFullYear()} FRCC CONVENTIONS. All rights reserved.</p>
      </div>
    </footer>
  );
}
