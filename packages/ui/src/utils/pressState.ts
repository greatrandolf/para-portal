import type { PressableStateCallbackType } from 'react-native';

/** react-native-web also reports `hovered`; the native typings omit it. */
export type PressState = PressableStateCallbackType & { hovered?: boolean };
