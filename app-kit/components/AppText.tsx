import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, fontSize } from '../theme';

type Variant = 'headline' | 'title' | 'large' | 'body' | 'muted' | 'caption' | 'label' | 'error';

const variants: Record<Variant, TextStyle> = {
  headline: { fontSize: fontSize.headline, fontWeight: '800', color: colors.text },
  title: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  large: { fontSize: fontSize.large, fontWeight: '600', color: colors.text },
  body: { fontSize: fontSize.body, color: colors.text },
  muted: { fontSize: fontSize.body, color: colors.textMuted },
  caption: { fontSize: fontSize.caption, color: colors.textMuted },
  label: { fontSize: fontSize.caption, fontWeight: '600', color: colors.text },
  error: { fontSize: fontSize.caption, color: colors.danger },
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
}

/** Text with the app's type styles. Pass `style` to adjust a single use. */
export function AppText({ variant = 'body', style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[variants[variant], style]} />;
}
