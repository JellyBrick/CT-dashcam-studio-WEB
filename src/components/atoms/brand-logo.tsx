import { assetUrl } from '@/lib/platform';
import { cn } from '@/lib/utils';

export const BrandLogo = ({ className }: { className?: string }) => {
  return (
    <img
      src={assetUrl('ct-icon-v3-180.png')}
      alt="CT Dash"
      width={180}
      height={180}
      className={cn('size-7 shrink-0 rounded-sm', className)}
    />
  );
};
