import React from 'react';

interface TooltipButtonProps { 
  title: string; 
  onClick: () => void; 
  icon: React.ElementType; 
  active?: boolean; 
  disabled?: boolean; 
  className?: string;
  tooltipContent?: React.ReactNode;
}

export const TooltipButton = React.forwardRef<HTMLButtonElement, TooltipButtonProps>(({ 
  title, 
  onClick, 
  icon: Icon, 
  active, 
  disabled, 
  className,
  tooltipContent 
}, ref) => (
  <div className="relative group flex items-center justify-center">
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2.5 rounded-xl transition-all duration-200 outline-none flex items-center justify-center
        ${active 
          ? 'bg-primary text-white shadow-lg shadow-primary/25 ring-0' 
          : 'text-slate-400 hover:text-white hover:bg-slate-700/80 active:bg-slate-700'
        } 
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} 
        ${className || ''}
      `}
    >
      <Icon className="w-5 h-5" />
    </button>
    {/* Tooltip */}
    {!disabled && (
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none
        px-3 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg border border-slate-700/50 whitespace-nowrap z-60 shadow-xl
        md:-top-14 md:left-1/2 md:-translate-x-1/2
        max-md:left-full max-md:ml-3 max-md:top-1/2 max-md:-translate-y-1/2
        ">
        <div className="font-semibold mb-0.5">{title}</div>
        {tooltipContent && <div className="text-slate-400 text-[10px] max-w-[150px] whitespace-normal leading-tight">{tooltipContent}</div>}
        
        {/* Arrow for tooltip */}
        <div className="absolute w-2 h-2 bg-slate-900 border-l border-b border-slate-700/50 rotate-45 
            md:-bottom-1 md:left-1/2 md:-translate-x-1/2 md:border-l-0 md:border-t-0 md:border-r md:border-b
            max-md:left-[-5px] max-md:top-1/2 max-md:-translate-y-1/2
        "></div>
        </div>
    )}
  </div>
));

TooltipButton.displayName = 'TooltipButton';