const fs = require('fs');

let h = fs.readFileSync('src/features/hotel/HotelPage.jsx', 'utf8');
const isCrlf = h.includes('\r\n');
const norm = h.replace(/\r\n/g, '\n');

// 1. Add showAllRooms and effectiveSteps
const target1 = `  // Step 3 Filtered Rooms
  const filteredStep3Rooms = useMemo(() => {
    if (categoryFilter === 'all') return displayRooms;
    return displayRooms.filter((r) => {
      const cat = (r.category || '').toLowerCase();
      const name = (r.name || '').toLowerCase();
      if (categoryFilter === 'suite') {
        return cat.includes('suite') || name.includes('suite');
      }
      if (categoryFilter === 'normal') {
        return !cat.includes('suite') && !name.includes('suite');
      }
      return true;
    });
  }, [displayRooms, categoryFilter]);`;

const replace1 = `  const itemParam = searchParams.get('item') || searchParams.get('room');
  const hasPreselectedRoom = Boolean(itemParam || draft.selectedRoomId);
  const [showAllRooms, setShowAllRooms] = useState(() => !itemParam);

  const effectiveSteps = useMemo(() => {
    if (itemParam) {
      return ['Dates', 'Guests', 'Room Details', 'Guest Details', 'Review & Pay', 'Confirmation'];
    }
    return STEPS;
  }, [itemParam]);

  // Step 3 Filtered Rooms - if user already selected a room from the Stay section, only show that room by default
  const filteredStep3Rooms = useMemo(() => {
    if (hasPreselectedRoom && !showAllRooms && selectedRoom) {
      return [selectedRoom];
    }
    if (categoryFilter === 'all') return displayRooms;
    return displayRooms.filter((r) => {
      const cat = (r.category || '').toLowerCase();
      const name = (r.name || '').toLowerCase();
      if (categoryFilter === 'suite') {
        return cat.includes('suite') || name.includes('suite');
      }
      if (categoryFilter === 'normal') {
        return !cat.includes('suite') && !name.includes('suite');
      }
      return true;
    });
  }, [displayRooms, categoryFilter, hasPreselectedRoom, showAllRooms, selectedRoom]);`;

// 2. FlowShell steps={STEPS} -> steps={effectiveSteps}
const target2 = `      steps={STEPS}`;
const replace2 = `      steps={effectiveSteps}`;

// 3. Step 2 next button label
const target3 = `                Next: Choose Room <ArrowRightIcon className="h-4 w-4" />`;
const replace3 = `                {hasPreselectedRoom && !showAllRooms ? 'Next: Room Details' : 'Next: Choose Room'} <ArrowRightIcon className="h-4 w-4" />`;

// 4. Step 3 heading and category filter
const target4 = `          <Card>
            <p className="eyebrow">Step 3 · Choose Room</p>
            <h2 className="h-sub mt-1">Available rooms for your stay</h2>
            <p className="mt-1 text-sm text-slate-600">
              Showing availability for {formatDMY(draft.checkin)} to {formatDMY(draft.checkout)} ({nights} {nights === 1 ? 'night' : 'nights'}) · {draft.roomsCount} {Number(draft.roomsCount) > 1 ? 'rooms' : 'room'}.
            </p>

            {/* Category tabs */}
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              {[
                { id: 'all', label: 'All' },
                { id: 'normal', label: 'Normal rooms' },
                { id: 'suite', label: 'Suites' },
              ].map((f) => {
                const active = categoryFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCategoryFilter(f.id)}
                    className={\`rounded-xl px-4 py-2 border transition \${
                      active
                        ? 'border-navy-900 bg-navy-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }\`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>`;

const replace4 = `          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="eyebrow">
                  {hasPreselectedRoom && !showAllRooms ? 'Step 3 · Room Details' : 'Step 3 · Choose Room'}
                </p>
                <h2 className="h-sub mt-1">
                  {hasPreselectedRoom && !showAllRooms ? 'Your selected room' : 'Available rooms for your stay'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Showing availability for {formatDMY(draft.checkin)} to {formatDMY(draft.checkout)} ({nights} {nights === 1 ? 'night' : 'nights'}) · {draft.roomsCount} {Number(draft.roomsCount) > 1 ? 'rooms' : 'room'}.
                </p>
              </div>
              {hasPreselectedRoom && (
                <button
                  type="button"
                  onClick={() => setShowAllRooms((prev) => !prev)}
                  className="text-xs font-semibold text-navy-900 underline hover:text-gold-600 self-start sm:self-auto cursor-pointer"
                >
                  {showAllRooms ? 'Show only selected room' : 'Change room'}
                </button>
              )}
            </div>

            {/* Category tabs - only show when browsing all rooms */}
            {(showAllRooms || !hasPreselectedRoom) && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'normal', label: 'Normal rooms' },
                  { id: 'suite', label: 'Suites' },
                ].map((f) => {
                  const active = categoryFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setCategoryFilter(f.id)}
                      className={\`rounded-xl px-4 py-2 border transition \${
                        active
                          ? 'border-navy-900 bg-navy-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }\`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            )}`;

// 5. Grid wrapper for Step 3 rooms
const target5 = `              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">`;
const replace5 = `              <div className={\`mt-6 \${hasPreselectedRoom && !showAllRooms ? 'max-w-xl' : 'grid grid-cols-1 gap-4 sm:grid-cols-2'}\`}>`;

let updated = norm
  .replace(target1, replace1)
  .replace(target2, replace2)
  .replace(target3, replace3)
  .replace(target4, replace4)
  .replace(target5, replace5);

const result = isCrlf ? updated.replace(/\n/g, '\r\n') : updated;
fs.writeFileSync('src/features/hotel/HotelPage.jsx', result, 'utf8');
console.log('Updated HotelPage.jsx successfully');

