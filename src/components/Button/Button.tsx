// Copied from specto-website src/components/atoms/Button/Button.tsx (develop @ 9756594). Changes: import paths, and a press-down
// scale on `base` (all button transitions are composed in Button.css .t-button.t-resize, so tertiary no longer sets its own);
// 0.5px gradient border (p-[0.5px], was p-px) on every size; default size uses 14px text and 18px × 14px padding; secondary text is gray-100 (was white);
// default size: line-height 100% (leading-none) and min-h 43px (was 45px) so the padding sets the height;
// spinner is 14px (was 18px), the same box as the icons;
// loading keeps the normal (not disabled) styling, uses the icon-only circle, and the spinner takes the text colour;
// default icon-only inner is min-w 42px (was 43px) so with the 0.5px border it is a 43 × 43 circle;
// disabled (Figma 6762:10116): primary gray-400 fill / gray-500 text + 0.5px white/10 border; secondary gray-900 / gray-700 +
// 0.5px white border 10% top → 2% bottom (over the gray-900 fill); no fade;
// disabled click: aria-disabled + data-disabled (no native disabled) so the click can trigger a decaying head-shake; spinner 2× faster (0.6s);
// loading morph: width tweens text ↔ circle (t-resize, width pinned in px) and content ↔ spinner crossfade (t-icon-swap).
import { Slot } from '@radix-ui/react-slot';
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

import Icon, { type IconProps } from './Icon';
import Spinner, { type SpinnerProps } from './Spinner';
import cn from './cn';

export interface ButtonProps {
	modifier?: VariantProps<typeof buttonStyles>['modifier'];
	size?: VariantProps<typeof buttonStyles>['size'];
	leftIcon?: IconProps['icon'];
	leftIconProps?: Partial<IconProps & { className?: string }>;
	rightIcon?: IconProps['icon'];
	rightIconProps?: Partial<IconProps & { className?: string }>;
	isLoading?: boolean;
	/** Screen-reader text added to the button's name while loading (the spinner itself is silent). */
	loadingLabel?: string;
	isDisabled?: boolean;
	asChild?: boolean;
	isParentHover?: boolean;
}

type ButtonParams = ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

const buttonStyles = tv({
	// Press: scale to 0.97 so the button visibly gives under the pointer. Tailwind v4 scale-* sets the `scale` property, so that
	// (not `transform`) is what transitions; scale + opacity only (GPU), strong ease-out so the
	// response starts immediately; reduced-motion keeps the gradient/shadow feedback but drops the scale.
	// The transition list itself (press scale + loading width morph) lives in Button.css under .t-button.t-resize.
	// No tap highlight: mobile browsers flash a grey rectangle (not the pill) on tap, over the press feedback.
	base: 't-button t-resize group relative inline-flex cursor-pointer data-disabled:cursor-default flex-col p-[0.5px] [-webkit-tap-highlight-color:transparent] active:scale-[0.97] motion-reduce:active:scale-100 focus:ring-0',
	variants: {
		modifier: {
			primary: 'bg-btn-primary-main text-gray-950 active:shadow-none data-disabled:bg-gray-400 data-disabled:bg-[linear-gradient(rgb(255_255_255/0.1),rgb(255_255_255/0.1))] data-disabled:text-gray-500',
			// Border: 0.5px white gradient, 20% at the top → 5% at the bottom (was white/20 → rgb(12 12 12)).
			// Hover: the hoverBorder layer stacks on top of this, so it's 12.5% → 2.1% white, which composites to 30% → 7%.
			// Pressed: 5% top → 30% bottom, measured over the gray-950 fill (like a Figma stroke): white 5% on black is rgb(13),
			// which merges into the rgb(12) fill and reads as no line. activeBorder is opaque (it must cover the brighter layers below):
			// rgb(24 24 24) → rgb(85 85 85) = white 5% / 30% over rgb(12 12 12).
			secondary: 'bg-linear-to-b from-white/20 to-white/5 text-gray-100 shadow-none active:shadow-none data-disabled:bg-gray-900 data-disabled:bg-[linear-gradient(rgb(255_255_255/0.1),rgb(255_255_255/0.02))] data-disabled:text-gray-700',
			tertiary:
				'round-border-gradient hover:round-border-green-gradient aria-[current=page]:round-border-green-gradient data-disabled:bg-raincloud hover:text-green aria-[current=page]:text-green text-white shadow-none active:shadow-none',
		},
		size: {
			default: 'min-h-[43px] rounded-[40px] text-sm leading-none',
			medium: 'min-h-11 rounded-4xl text-base',
			small: 'min-h-9 rounded-[40px] text-sm',
		},
		// Loading only: ignores the pointer entirely. Disabled buttons keep pointer events so a click can trigger the shake.
		disabled: {
			true: 'pointer-events-none',
		},
		// Disabled: still clickable (for the shake), but with no hover / press feedback that would suggest it works.
		// Applied as the last compound variant so it overrides the modifier's own hover/active classes.
		inert: {
			true: '',
			false: '',
		},
		iconOnly: {
			true: '',
			false: '',
		},
		parentHover: {
			true: '',
			false: '',
		},
	},
	defaultVariants: {
		modifier: 'primary',
		size: 'default',
		disabled: false,
	},
	slots: {
		// Hover glow (border + gradient layers): in 150ms, out 120ms (the base duration applies when leaving), `ease` for a
		// colour/light change. box-shadow transitions too, so pressing dims the glow instead of snapping it off.
		hoverBorder:
			'pointer-events-none absolute inset-0 rounded-[40px] bg-linear-to-b opacity-0 transition-[opacity,box-shadow] duration-120 ease-[ease] group-hover:opacity-100 group-hover:duration-150',
		activeBorder:
			'pointer-events-none absolute inset-0 rounded-[40px] bg-linear-to-b opacity-0 transition-opacity duration-160 ease-out group-active:opacity-100',
		// t-icon-swap crossfades content ↔ spinner; overflow-hidden clips the content to the pill while the width shrinks.
		// Transition box-shadow only (was transition-all): padding must switch instantly or the rest-width measurement reads it mid-tween.
		inner: 't-icon-swap grid-stack relative h-full flex-auto items-center justify-center gap-2 overflow-hidden rounded-[40px] text-center transition-[box-shadow] duration-80',
		hoverGradient:
			'pointer-events-none absolute inset-0 rounded-[40px] bg-linear-to-b opacity-0 transition-[opacity,box-shadow] duration-120 ease-[ease] group-hover:opacity-100 group-hover:duration-150',
		activeGradient:
			'pointer-events-none absolute inset-0 rounded-[40px] bg-linear-to-b opacity-0 transition-opacity duration-160 ease-out group-active:opacity-100',
		content: 'grid-stack-item relative flex items-center justify-center gap-2 font-medium',
	},
	compoundVariants: [
		{
			modifier: 'primary',
			size: 'default',
			class: {
				inner: 'bg-gray-300 group-data-disabled:bg-gray-400',
				hoverBorder: 'shadow-btn-primary-hover from-white/90 to-white/20 group-active:shadow-none',
				activeBorder: 'from-almost-black/50 to-white',
				hoverGradient: 'to-cloud from-white',
				activeGradient: 'from-gray-400 to-white/90',
			},
		},
		{
			modifier: 'primary',
			size: 'medium',
			class: {
				inner: 'bg-gray-300 group-data-disabled:bg-gray-400',
				hoverBorder: 'shadow-btn-primary-hover from-white/90 to-white/20 group-active:shadow-none',
				activeBorder: 'from-almost-black/50 to-white',
				hoverGradient: 'to-cloud from-white',
				activeGradient: 'from-gray-400 to-white/90',
			},
		},
		{
			modifier: 'primary',
			size: 'small',
			class: {
				inner: 'bg-gray-300 group-data-disabled:bg-gray-400',
				hoverBorder: 'shadow-btn-primary-hover from-white/90 to-white/20 group-active:shadow-none',
				activeBorder: 'from-almost-black/50 to-white',
				hoverGradient: 'to-cloud from-white',
				activeGradient: 'from-gray-400 to-white/90',
			},
		},
		{
			modifier: 'secondary',
			size: 'default',
			class: {
				inner: 'group-active:shadow-btn-active-shadow bg-gray-950 group-data-disabled:bg-gray-900',
				hoverBorder: 'shadow-btn-secondary from-white/[0.125] to-white/[0.021] group-active:opacity-100 group-active:shadow-none',
				activeBorder: 'from-[rgb(24_24_24)] to-[rgb(85_85_85)]',
				hoverGradient: 'from-white/20 to-gray-950',
				activeGradient: 'from-gray-950 to-white/10',
			},
		},
		{
			modifier: 'secondary',
			size: 'medium',
			class: {
				inner: 'group-active:shadow-btn-active-shadow bg-gray-950 group-data-disabled:bg-gray-900',
				hoverBorder: 'shadow-btn-secondary from-white/[0.125] to-white/[0.021] group-active:opacity-100 group-active:shadow-none',
				activeBorder: 'from-[rgb(24_24_24)] to-[rgb(85_85_85)]',
				hoverGradient: 'from-white/20 to-gray-950',
				activeGradient: 'from-gray-950 to-white/10',
			},
		},
		{
			modifier: 'secondary',
			size: 'small',
			class: {
				inner: 'group-active:shadow-btn-active-shadow bg-gray-950 group-data-disabled:bg-gray-900',
				hoverBorder: 'shadow-btn-secondary from-white/[0.125] to-white/[0.021] group-active:opacity-100 group-active:shadow-none',
				activeBorder: 'from-[rgb(24_24_24)] to-[rgb(85_85_85)]',
				hoverGradient: 'from-white/20 to-gray-950',
				activeGradient: 'from-gray-950 to-white/10',
			},
		},
		{
			modifier: 'primary',
			parentHover: true,
			class: {
				hoverBorder: 'shadow-btn-primary-hover opacity-100',
				hoverGradient: 'opacity-100',
			},
		},
		{
			modifier: 'secondary',
			parentHover: true,
			class: {
				hoverBorder: 'shadow-btn-secondary opacity-100',
				hoverGradient: 'opacity-100',
			},
		},
		{
			modifier: 'tertiary',
			class: {
				inner: 'bg-gray-950',
				hoverBorder: 'opacity-0 group-hover:opacity-0',
				activeBorder: 'opacity-0 group-active:opacity-0',
				hoverGradient: 'from-green/5 to-green/5 shadow-[inset_0_-4px_15px_0_rgb(165_255_1/0.15)] group-aria-[current=page]:opacity-100',
				activeGradient: 'from-green/5 to-green/5',
			},
		},
		{
			modifier: 'tertiary',
			parentHover: true,
			class: {
				base: 'round-border-green-gradient text-green',
				hoverGradient: 'opacity-100',
			},
		},
		{
			iconOnly: true,
			size: 'small',
			class: { inner: 'min-w-8.5 p-0' },
		},
		{
			iconOnly: true,
			size: 'medium',
			class: { inner: 'min-w-10.5 p-0' },
		},
		{
			iconOnly: true,
			size: 'default',
			class: { inner: 'min-w-[42px] p-0' },
		},
		{
			iconOnly: false,
			size: 'small',
			class: { inner: 'px-4 py-2' },
		},
		{
			iconOnly: false,
			size: 'medium',
			class: { inner: 'px-3.5 py-2' },
		},
		{
			iconOnly: false,
			size: 'default',
			class: { inner: 'px-[18px] py-[14px]' },
		},
		{
			inert: true,
			class: {
				base: 'active:scale-100',
				inner: 'group-active:shadow-none',
				hoverBorder: 'hidden',
				activeBorder: 'hidden',
				hoverGradient: 'hidden',
				activeGradient: 'hidden',
			},
		},
	],
});

// "Can't do that" feedback for clicking a disabled button: a horizontal head-shake that decays (6 → 4.5 → 2.5 → 1.5px),
// 360ms. Animates `translate` so it composes with the press `scale`. Run through WAAPI so a repeat click restarts it
// cleanly. Reduced motion gets a quick opacity dip instead — still feedback, no movement.
const SHAKE_KEYFRAMES: Keyframe[] = [
	{ translate: '0' },
	{ translate: '-6px', offset: 0.15 },
	{ translate: '6px', offset: 0.3 },
	{ translate: '-4.5px', offset: 0.45 },
	{ translate: '4.5px', offset: 0.6 },
	{ translate: '-2.5px', offset: 0.75 },
	{ translate: '1.5px', offset: 0.9 },
	{ translate: '0' },
];
const SHAKE_OPTIONS: KeyframeAnimationOptions = { duration: 360, easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)' };
const DIP_KEYFRAMES: Keyframe[] = [{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }];
const DIP_OPTIONS: KeyframeAnimationOptions = { duration: 240, easing: 'ease-out' };

function rejectClick(el: HTMLElement | null) {
	if (!el) return;
	el.getAnimations().forEach((animation) => {
		if (animation instanceof CSSTransition) return;
		animation.cancel();
	});
	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	el.animate(reduceMotion ? DIP_KEYFRAMES : SHAKE_KEYFRAMES, reduceMotion ? DIP_OPTIONS : SHAKE_OPTIONS);
}

const ButtonIcon = ({
	icon,
	className,
	size: _size,
	...props
}: { icon: ButtonProps['leftIcon']; size: ButtonProps['size'] } & ButtonProps['leftIconProps']) => {
	if (!icon) {
		return null;
	}

	return (
		<Icon
			{...props}
			className={cn(
				'size-3.5 text-current',
				// isIconOnly ? 'ml-0' : '-ml-1',
				className,
			)}
			icon={icon}
		/>
	);
};

function Button({
	modifier,
	size,
	leftIcon,
	leftIconProps,
	rightIcon,
	rightIconProps,
	className,
	isLoading,
	loadingLabel = 'Loading',
	isDisabled,
	disabled,
	asChild = false,
	children,
	type = 'button',
	isParentHover,
	onClick,
	...props
}: ButtonParams) {
	// Disabled uses aria-disabled + data-disabled instead of the native `disabled` attribute: a native disabled button
	// swallows clicks, and the shake needs the click. Styles key off data-disabled. Loading keeps the normal styling.
	const disabledState = Boolean(disabled || isDisabled);
	const isBlocked = disabledState || Boolean(isLoading);
	const isIconOnly = Boolean(leftIcon || rightIcon) && !children && !props.title;
	const Comp = asChild ? Slot : 'button';
	const {
		base,
		hoverBorder,
		activeBorder,
		inner: innerClassName,
		hoverGradient,
		activeGradient,
		content,
	} = buttonStyles({
		modifier,
		size,
		disabled: Boolean(isLoading),
		inert: disabledState,
		// Loading shows only the spinner, so it takes the icon-only sizing and becomes the same circle.
		iconOnly: isIconOnly || Boolean(isLoading),
		parentHover: isParentHover,
	});

	const childNode =
		asChild && React.isValidElement(children)
			? ((children.props as { children?: React.ReactNode; title?: React.ReactNode }).children ??
				(children.props as { children?: React.ReactNode; title?: React.ReactNode }).title)
			: children || props.title;

	// Loading morph: CSS can't transition width to/from `auto`, so the width is pinned in px only while it morphs.
	// At rest the width is left to CSS (so `w-full`, wrapping containers and rotation all work). Loading pins the current
	// width, then the height (the circle), and .t-resize tweens between the two; un-loading tweens back to the measured
	// natural width and releases the pin when the tween ends. offsetWidth returns the in-flight value, so reversing
	// mid-way works.
	const rootRef = useRef<HTMLElement>(null);
	const loadingRef = useRef(Boolean(isLoading));
	loadingRef.current = Boolean(isLoading);

	// The loading render already swaps in the icon-only padding, so by the time the layout effect runs the auto width has
	// changed. Track the last rest width (read-only, nothing is pinned) to start the morph from.
	const restWidthRef = useRef(0);
	useEffect(() => {
		const el = rootRef.current;
		if (!el) return;
		const observer = new ResizeObserver(() => {
			if (!loadingRef.current && !el.style.width) restWidthRef.current = el.offsetWidth;
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const isFirstRun = useRef(true);
	useLayoutEffect(() => {
		const el = rootRef.current;
		if (!el) return;
		const animate = !isFirstRun.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		isFirstRun.current = false;
		if (isLoading) {
			// Mid-way back to the text width, the in-flight px width is the start; at rest, the recorded rest width.
			const from = el.style.width ? el.offsetWidth : restWidthRef.current;
			if (animate && from) {
				el.style.width = `${from}px`;
				void el.offsetWidth; // reflow so the auto → px pin doesn't swallow the transition
			}
			el.style.width = `${el.offsetHeight}px`;
			return;
		}
		const from = el.offsetWidth;
		el.style.width = '';
		const natural = el.offsetWidth;
		if (!animate || from === natural) return; // stays auto
		el.style.width = `${from}px`;
		void el.offsetWidth;
		el.style.width = `${natural}px`;
	}, [isLoading]);

	// Release the px pin once the morph back to the text width finishes (or is cut short), so rest width is auto again.
	useEffect(() => {
		const el = rootRef.current;
		if (!el) return;
		const release = (event: TransitionEvent) => {
			if (event.target === el && event.propertyName === 'width' && !loadingRef.current) el.style.width = '';
		};
		el.addEventListener('transitionend', release);
		el.addEventListener('transitioncancel', release);
		return () => {
			el.removeEventListener('transitionend', release);
			el.removeEventListener('transitioncancel', release);
		};
	}, []);

	if (import.meta.env.DEV && isIconOnly && !props['aria-label'] && !props['aria-labelledby']) {
		console.warn('Button: icon-only buttons need an aria-label (the icon is hidden from screen readers).');
	}

	const inner = (
		<>
			<span className={hoverBorder()} />
			<span className={activeBorder()} />
			<div className={cn(innerClassName())} data-state={isLoading ? 'b' : 'a'}>
				<span className={cn(hoverGradient())} />
				<span className={activeGradient()} />
				{/* The label stays readable while loading (it's only faded out), so the name is "<label> Loading". */}
				<div className={cn(content(), 't-icon')} data-icon="a">
					<ButtonIcon {...leftIconProps} className={isIconOnly ? 'ml-0' : '-ml-1'} icon={leftIcon} size={size} />
					{/* Aeonik sits low in its line box (caps ~0.6px under centre); lift the label 1px, like Figma's correct_for_line_height. */}
					{childNode ? <span className="-translate-y-px">{childNode}</span> : null}
					<ButtonIcon {...rightIconProps} className={isIconOnly ? 'mr-0' : '-mr-1'} icon={rightIcon} size={size} />
				</div>
				{/* 14px, the same box as the icons, so it fits the 14px text row. */}
				{isLoading ? <span className="sr-only">{loadingLabel}</span> : null}
				<Spinner
					aria-hidden
					className="grid-stack-item t-icon"
					data-icon="b"
					modifier={modifier as unknown as SpinnerProps['modifier']}
					size={14}
				/>
			</div>
		</>
	);

	return (
		<Comp
			ref={rootRef as React.Ref<HTMLButtonElement>}
			aria-busy={isLoading || undefined}
			aria-disabled={isBlocked}
			className={base({ className })}
			data-disabled={disabledState || undefined}
			type={asChild ? undefined : type}
			// Loading: pointer-events-none stops mouse clicks; this also stops keyboard activation (and form submit).
			// Disabled: the click is swallowed (no onClick, no submit / navigation) and answered with the shake.
			onClick={(event) => {
				if (isLoading || disabledState) {
					event.preventDefault();
					if (disabledState) rejectClick(rootRef.current);
					return;
				}
				onClick?.(event as React.MouseEvent<HTMLButtonElement>);
			}}
			{...props}
		>
			{/* eslint-disable-next-line react/no-clone-element */}
			{asChild && React.isValidElement(children) ? React.cloneElement(children as React.ReactElement, undefined, inner) : inner}
		</Comp>
	);
}

export default Button;
