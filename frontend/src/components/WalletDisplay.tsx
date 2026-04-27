import { Box, Typography } from '@mui/material';
import type { WalletId } from '../api/types';

const assetLogos = import.meta.glob('../assets/logos/*.{png,jpg,jpeg,svg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const assestsLogos = import.meta.glob('../assests/logos/*.{png,jpg,jpeg,svg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const mergedLogos = { ...assetLogos, ...assestsLogos };
const logoByName = new Map<string, string>();

Object.entries(mergedLogos).forEach(([path, url]) => {
  const fileName = path.split('/').pop() ?? '';
  const baseName = fileName.replace(/\.[^.]+$/, '');
  logoByName.set(baseName.toUpperCase(), url);
});

const walletLogoAliases: Record<WalletId, string[]> = {
  // 依照你提供的支付工具對照，優先匹配這些 LOGO 名稱。
  ALIPAY_MO: ['ALIPAY', 'ALIPAY_MO'],
  BOC_MACAU_MOBILE: ['BOC', 'BOC_MACAU_MOBILE'],
  CGB_WALLET: ['CGB', 'CGB_WALLET'],
  ICBC_EPAY: ['ICBC', 'ICBC_EPAY'],
  LUSO_PAY: ['LUSO', 'LUSO_PAY'],
  MPAY: ['MPAY'],
  FUNG_PAY_BAO: ['FUNG', 'FUNG_PAY_BAO'],
  UEPAY_MO: ['UEPAY', 'UEPAY_MO'],
};

function getWalletLogoUrl(walletId: WalletId): string {
  const aliases = walletLogoAliases[walletId] ?? [];
  for (const alias of aliases) {
    const hit = logoByName.get(alias.toUpperCase());
    if (hit) return hit;
  }
  const id = walletId.toUpperCase();
  const compact = id.replace(/[_\-\s]/g, '');
  // 優先用 src/assets 與 src/assests 內的檔名匹配，其次退回 public/logos 靜態路徑。
  const directMatch = logoByName.get(id) ?? logoByName.get(compact);
  if (directMatch) return directMatch;
  return `/logos/${walletId}.png`;
}

interface WalletDisplayProps {
  walletId: WalletId;
  displayName: string;
  logoSize?: number;
  textVariant?: 'body1' | 'body2' | 'subtitle2';
  showText?: boolean;
}

export function WalletDisplay({
  walletId,
  displayName,
  logoSize = 22,
  textVariant = 'body2',
  showText = true,
}: WalletDisplayProps) {
  const logoUrl = getWalletLogoUrl(walletId);
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <img
        src={logoUrl}
        alt={`${displayName} logo`}
        style={{
          width: logoSize,
          height: logoSize,
          objectFit: 'contain',
          borderRadius: 6,
          background: 'white',
          border: '1px solid rgba(0, 0, 0, 0.12)',
          flexShrink: 0,
        }}
        onError={(event) => {
          // 找不到檔案時隱藏圖示，避免出現破圖圖標。
          event.currentTarget.style.display = 'none';
        }}
      />
      {showText && (
        <Typography variant={textVariant} noWrap sx={{ color: 'inherit' }}>
          {displayName}
        </Typography>
      )}
    </Box>
  );
}
