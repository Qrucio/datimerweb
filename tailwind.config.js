/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
        fontFamily: {
            sans: ['var(--font-sans)'],
            serif: ['var(--font-serif)'],
            mono: ['var(--font-mono)'],
            'timer-cyber': ['var(--font-timer-cyber)'],
            'timer-pixel': ['var(--font-timer-pixel)'],
            'timer-digital': ['var(--font-timer-digital)'],
            'timer-hand': ['var(--font-timer-hand)'],
            'timer-block': ['var(--font-timer-block)'],
            'timer-elegant': ['var(--font-timer-elegant)'],
            'timer-neon': ['var(--font-timer-neon)'],
            'timer-round': ['var(--font-timer-round)'],
            'timer-display': ['var(--font-timer-display)'],
            'timer-clock': ['var(--font-timer-clock)'],
            'logo': ['var(--font-logo)'],
        },
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
            transitionTimingFunction: {
                'ios': 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
                'smooth': 'cubic-bezier(0.25, 1, 0.5, 1)',
            }
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}