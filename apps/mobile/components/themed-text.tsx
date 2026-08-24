import { Text, type TextProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

const typeClasses = {
  default: 'text-base/6 font-medium',
  title: 'text-5xl leading-[52px] font-semibold',
  small: 'text-sm/5 font-medium',
  smallBold: 'text-sm/5 font-bold',
  subtitle: 'text-[32px] leading-[44px] font-semibold',
  link: 'text-sm leading-[30px]',
  linkPrimary: 'text-sm leading-[30px]',
  code: 'font-mono text-xs android:font-bold',
} satisfies Record<NonNullable<ThemedTextProps['type']>, string>;

export function ThemedText({
  style,
  className,
  type = 'default',
  themeColor,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const colorKey = themeColor ?? (type === 'linkPrimary' ? 'primary' : 'text');

  return (
    <Text
      className={`${typeClasses[type]} ${className ?? ''}`}
      style={[{ color: theme[colorKey] }, style]}
      {...rest}
    />
  );
}
