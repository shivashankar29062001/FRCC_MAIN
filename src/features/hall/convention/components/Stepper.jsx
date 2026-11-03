const STEPS = ['Hall', 'Date', 'Details', 'Payment', 'Confirmation'];

export default function Stepper({ current }) {
  return (
    <ol className="flex items-center justify-center gap-1 sm:gap-3 flex-wrap mb-8">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-1 sm:gap-3">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border ${i <= current ? 'bg-navy text-gold border-gold' : 'bg-white text-gray-400 border-gray-300'}`}>{i + 1}</span>
          <span className={`text-xs sm:text-sm ${i <= current ? 'text-navy font-semibold' : 'text-gray-400'}`}>{s}</span>
          {i < STEPS.length - 1 && <span className="w-4 sm:w-8 h-px bg-gray-300" />}
        </li>
      ))}
    </ol>
  );
}
