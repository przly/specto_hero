// Ported from src/components/atoms/Spinner/Spinner.tsx; its CSS lives in specto.css.
import type React from 'react';
import cn from './cn';
import type { CSSProperties } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

export interface SpinnerProps {
	modifier?: VariantProps<typeof spinnerStyles>['modifier'];
	isVisible?: boolean | undefined;
	size?: number;
}

type SpinnerParams = SpinnerProps & React.HTMLAttributes<HTMLDivElement>;

const bars = new Array(12).fill(0);

const spinnerStyles = tv({
	// bg-current (was bg-almost-black): bars follow the button's text colour, so they show on secondary too. m-1 removed so the ring is centred.
	base: 'bg-current',
	variants: {
		modifier: {},
	},
});

function Spinner({ className, isVisible = true, size = 18, modifier, style, ...props }: SpinnerParams) {
	if (!isVisible) {
		return null;
	}

	return (
		<div className={cn(['spinner-wrapper', className])} style={{ ...style, '--spinner-size': `${size}px` } as CSSProperties} {...props}>
			<div className="spinner-bars">
				{bars.map((_, i) => (
					<div className={cn(['bar', spinnerStyles({ modifier })])} key={`spinner-bar-${i}`} />
				))}
			</div>
		</div>
	);
}

export default Spinner;
