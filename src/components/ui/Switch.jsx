import React from 'react';

// Injected styles to match the exact "Aesthetic Toggle" physics
// We use a unique class prefix to avoid collisions if multiple instances are mounted,
// though the CSS is scoped by the component usage pattern.
const toggleStyles = `
  .ui-switch-checkbox {
    display: none;
  }

  .ui-switch-slider {
    width: 40px;
    height: 20px;
    background-color: rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    align-items: center;
    border: 2px solid transparent;
    transition: .3s;
    box-shadow: 0 0 10px 0 rgb(0, 0, 0, 0.25) inset;
    cursor: pointer;
  }

  .ui-switch-slider::before {
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    background-color: #fff;
    transform: translateX(-20px);
    border-radius: 20px;
    transition: .3s;
    box-shadow: 0 0 10px 3px rgb(0, 0, 0, 0.25);
  }

  /* Checked State */
  .ui-switch-checkbox:checked ~ .ui-switch-slider::before {
    transform: translateX(20px);
    box-shadow: 0 0 10px 3px rgb(0, 0, 0, 0.25);
  }

  .ui-switch-checkbox:checked ~ .ui-switch-slider {
    background-color: #34C759;
  }

  /* Active/Click State */
  .ui-switch-checkbox:active ~ .ui-switch-slider::before {
    transform: translate(0);
  }
`;

/**
 * A standalone Switch toggle with "Liquid" physics.
 */
const Switch = ({ checked, onChange, id }) => {
    return (
        <div className="relative">
            <style>{toggleStyles}</style>
            <input
                type="checkbox"
                id={id}
                className="ui-switch-checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                readOnly={!onChange} // If no handler, readOnly to suppress warnings
            />
            <div
                className="ui-switch-slider"
                onClick={() => onChange && onChange(!checked)}
            />
        </div>
    );
};

export default Switch;
