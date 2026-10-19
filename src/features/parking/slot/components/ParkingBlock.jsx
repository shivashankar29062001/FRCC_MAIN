import { useRef, useEffect, useMemo } from 'react';
import { Car, CarFront, ChevronUp, ChevronDown, Check } from 'lucide-react';
import './ParkingBlock.css';

const BLOCK_COLORS = {
  A: {
    headerBg: '#EAF3FF',
    headerBorder: '#BFDBFE',
    iconColor: '#1E40AF',
  },
  B: {
    headerBg: '#F0ECFF',
    headerBorder: '#DDD6FE',
    iconColor: '#5B21B6',
  },
  C: {
    headerBg: '#FFF5D9',
    headerBorder: '#FDE68A',
    iconColor: '#B45309',
  },
};

export default function ParkingBlock({
  blockName,
  blockPrefix,
  slots,
  selectedSlot,
  onSelectSlot,
  disabled = false
}) {
  const containerRef = useRef(null);
  const scrollTrackRef = useRef(null);
  const scrollThumbRef = useRef(null);
  const scrollUpRef = useRef(null);
  const scrollDownRef = useRef(null);

  const blockSlots = slots.filter(s => s.id.startsWith(blockPrefix));
  
  // Calculate available count dynamically from slot statuses
  const availableCount = useMemo(() => 
    blockSlots.filter(s => s.status === 'available').length, 
    [blockSlots]
  );

  const blockColors = BLOCK_COLORS[blockPrefix] || BLOCK_COLORS.A;

  const handleSlotClick = (slotId) => {
    if (disabled) return;
    const targetSlot = slots.find(s => s.id === slotId);
    if (!targetSlot || targetSlot.status === 'booked') return;

    if (selectedSlot === slotId) {
      onSelectSlot(null);
    } else {
      onSelectSlot(slotId);
    }
  };

  // Scroll functions
  const scrollUp = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ top: -100, behavior: 'smooth' });
    }
  };

  const scrollDown = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ top: 100, behavior: 'smooth' });
    }
  };

  // Update scroll thumb position based on scroll
  const updateScrollThumb = () => {
    if (!containerRef.current || !scrollThumbRef.current || !scrollTrackRef.current) return;
    
    const container = containerRef.current;
    const track = scrollTrackRef.current;
    const thumb = scrollThumbRef.current;
    
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const scrollTop = container.scrollTop;
    
    if (scrollHeight <= clientHeight) {
      thumb.style.height = '100%';
      thumb.style.top = '0';
      return;
    }
    
    const trackHeight = track.clientHeight;
    const thumbHeight = Math.max(40, (clientHeight / scrollHeight) * trackHeight);
    const maxThumbTop = trackHeight - thumbHeight;
    const thumbTop = (scrollTop / (scrollHeight - clientHeight)) * maxThumbTop;
    
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.top = `${thumbTop}px`;
  };

  // Handle scroll events
  const handleScroll = () => {
    updateScrollThumb();
    updateArrowVisibility();
  };

  // Update arrow visibility based on scroll position
  const updateArrowVisibility = () => {
    if (!containerRef.current || !scrollUpRef.current || !scrollDownRef.current) return;
    
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    scrollUpRef.current.style.opacity = scrollTop > 5 ? '1' : '0.4';
    scrollUpRef.current.style.pointerEvents = scrollTop > 5 ? 'auto' : 'none';
    
    scrollDownRef.current.style.opacity = (scrollTop + clientHeight) < (scrollHeight - 5) ? '1' : '0.4';
    scrollDownRef.current.style.pointerEvents = (scrollTop + clientHeight) < (scrollHeight - 5) ? 'auto' : 'none';
  };

  // Drag scroll thumb
  const handleThumbMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startY = e.clientY;
    const startTop = parseFloat(scrollThumbRef.current.style.top) || 0;
    
    const handleMouseMove = (moveEvent) => {
      if (!containerRef.current || !scrollTrackRef.current || !scrollThumbRef.current) return;
      
      const track = scrollTrackRef.current;
      const thumb = scrollThumbRef.current;
      const container = containerRef.current;
      
      const deltaY = moveEvent.clientY - startY;
      const trackRect = track.getBoundingClientRect();
      const thumbHeight = thumb.offsetHeight;
      const maxTop = trackRect.height - thumbHeight;
      
      let newTop = Math.max(0, Math.min(maxTop, startTop + deltaY));
      const scrollRatio = newTop / maxTop;
      container.scrollTop = scrollRatio * (container.scrollHeight - container.clientHeight);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Click on track to scroll
  const handleTrackClick = (e) => {
    if (e.target === scrollThumbRef.current) return;
    
    if (!containerRef.current || !scrollTrackRef.current || !scrollThumbRef.current) return;
    
    const track = scrollTrackRef.current;
    const thumb = scrollThumbRef.current;
    const container = containerRef.current;
    
    const trackRect = track.getBoundingClientRect();
    const thumbHeight = thumb.offsetHeight;
    const clickY = e.clientY - trackRect.top;
    const thumbCenter = thumbHeight / 2;
    const maxTop = trackRect.height - thumbHeight;
    
    let newTop = Math.max(0, Math.min(maxTop, clickY - thumbCenter));
    const scrollRatio = newTop / maxTop;
    container.scrollTop = scrollRatio * (container.scrollHeight - container.clientHeight);
  };

  // Initialize scroll thumb on mount and update when slots change
  useEffect(() => {
    updateScrollThumb();
    updateArrowVisibility();
    
    // Also update on window resize
    window.addEventListener('resize', updateScrollThumb);
    return () => window.removeEventListener('resize', updateScrollThumb);
  }, [blockSlots.length, availableCount]);

  return (
    <div 
      className="parking-block-card" 
      id={`parking-block-${blockPrefix}`}
      style={{ 
        '--header-bg': blockColors.headerBg,
        '--header-border': blockColors.headerBorder,
        '--icon-color': blockColors.iconColor,
      }}
    >
      <div className="parking-block-header">
        <Car size={18} className="block-header-icon" />
        <div className="block-header-content">
          <h3 className="block-header-title">{blockName}</h3>
          <span className="block-availability">{availableCount} available / 50</span>
        </div>
      </div>
      <div className="parking-block-body-wrapper">
        <div
          className="parking-block-body"
          ref={containerRef}
          role="radiogroup"
          aria-label={`${blockName} parking slots`}
          onScroll={handleScroll}
        >
          <div className="parking-slot-grid-5col">
            {blockSlots.map((slot) => {
              const isBooked = slot.status === 'booked';
              const isSelected = selectedSlot === slot.id;

              let slotClass = 'slot-btn-available';
              if (isBooked) slotClass = 'slot-btn-booked';
              else if (isSelected) slotClass = 'slot-btn-selected';

              return (
                <button
                  key={slot.id}
                  type="button"
                  id={`slot-${slot.id}`}
                  className={`slot-grid-btn ${slotClass}`}
                  disabled={isBooked || disabled}
                  aria-disabled={isBooked || disabled}
                  aria-checked={isSelected}
                  role="radio"
                  onClick={() => handleSlotClick(slot.id)}
                  title={
                    isBooked
                      ? `Slot ${slot.id} is Booked`
                      : isSelected
                      ? `Slot ${slot.id} is Selected`
                      : `Select Slot ${slot.id}`
                  }
                >
                  {isBooked ? (
                    <span className="slot-booked-content" aria-hidden="true">
                      <CarFront size={22} className="slot-booked-icon" />
                      <span className="slot-booked-label">{slot.id}</span>
                    </span>
                  ) : (
                    <>
                      <span className="slot-label">{slot.id}</span>
                      {isSelected && (
                        <span className="slot-checkmark" aria-hidden="true">
                          <Check size={14} />
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {/* Custom Scrollbar with Arrow Controls */}
        <div className="custom-scrollbar" aria-hidden="true">
          <button
            ref={scrollUpRef}
            className="scroll-arrow scroll-arrow-up"
            onClick={scrollUp}
            aria-label="Scroll up"
            type="button"
          >
            <ChevronUp size={14} />
          </button>
          <div
            ref={scrollTrackRef}
            className="scroll-track"
            onClick={handleTrackClick}
          >
            <div
              ref={scrollThumbRef}
              className="scroll-thumb"
              onMouseDown={handleThumbMouseDown}
            />
          </div>
          <button
            ref={scrollDownRef}
            className="scroll-arrow scroll-arrow-down"
            onClick={scrollDown}
            aria-label="Scroll down"
            type="button"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}