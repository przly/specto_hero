import type React from 'react';
import cn from './cn';
import ArrowRight from './icons/ArrowRight.svg?raw';
import Plus from './icons/Plus.svg?raw';
import Search from './icons/search.svg?raw';

// Ported from src/components/atoms/Icon/Icon.tsx. The source maps names to SVGR components through a generated
// IconVariants file that isn't in the repo, so the SVGs the buttons use are inlined as raw markup instead.
export const icons = { ArrowRight, Plus, Search };

export interface IconProps {
	icon: keyof typeof icons;
	svgProps?: React.SVGProps<SVGSVGElement>;
}

type IconParams = IconProps & React.HTMLAttributes<HTMLDivElement>;

const Icon = ({ icon, className, svgProps: _svgProps, ...props }: IconParams) => {
	const svg = icons[icon];

	if (!svg) {
		throw new Error(`Icon "${icon}" not found`);
	}

	return (
		<div
			aria-label={icon}
			className={cn(['icon relative block [&>svg]:size-full', className, icon])}
			role="img"
			{...props}
			dangerouslySetInnerHTML={{ __html: svg.replace(/ width="\d+" height="\d+"/, ' width="100%" height="100%"') }}
		/>
	);
};

export default Icon;
