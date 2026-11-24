import { useWindowDimensions } from 'react-native';

export const breakpoints = { md: 768, lg: 1024, xl: 1280 } as const;

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';

/** Current width bucket: sm < 768 <= md < 1024 <= lg < 1280 <= xl. */
export function useBreakpoint() {
  const { width } = useWindowDimensions();
  const bp: Breakpoint =
    width >= breakpoints.xl ? 'xl' : width >= breakpoints.lg ? 'lg' : width >= breakpoints.md ? 'md' : 'sm';
  return {
    width,
    bp,
    isPhone: bp === 'sm',
    atLeastMd: width >= breakpoints.md,
    atLeastLg: width >= breakpoints.lg,
    atLeastXl: width >= breakpoints.xl,
  };
}
