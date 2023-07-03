import { ReactNode } from 'react';
import { Link, LinkProps } from 'react-router-dom';

export function LoginButton({
  returnTo,
  children,
  className,
  inviteId,
  ...rest
}: {
  returnTo?: string;
  children?: ReactNode;
  inviteId?: string;
} & Omit<LinkProps, 'to'>) {
  return (
    <Link className={className} to={`/join?returnTo=${returnTo}`} {...rest}>
      {children}
    </Link>
  );
}
