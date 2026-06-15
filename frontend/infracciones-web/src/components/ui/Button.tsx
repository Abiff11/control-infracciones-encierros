import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'link';

interface ButtonProps
  extends PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> {
  variant?: ButtonVariant;
}

export function Button({
  children,
  className,
  variant = 'secondary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        variant === 'primary'
          ? 'button-primary'
          : variant === 'link'
            ? 'button-link'
            : 'button-secondary',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
