import React from 'react';

export const FlowTag = ({ isDev = false, className, ...props }) => {
  // Purple shadow for Dev, Cyan (default) for Pro
  const defaultClass = isDev
    ? "h-6 w-auto object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]"
    : "h-6 w-auto object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]";

  return (
    <img
      src={isDev ? "/icons/devtag.png" : "/icons/protag.png"}
      alt={isDev ? "Dev Member" : "Flow Member"}
      className={className || defaultClass}
      draggable="false"
      {...props}
    />
  );
};
