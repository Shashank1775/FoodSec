/**
 * Navigator param lists. Structure:
 *
 *   RootStack (auth gate)
 *   ├─ Login / Register           (signed out)
 *   └─ Main: bottom tabs           (signed in)
 *       ├─ Home
 *       ├─ Scan
 *       └─ Items: ItemsStack
 *           ├─ ItemsList
 *           └─ ItemDetails { itemId }
 */
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type ItemsStackParamList = {
  ItemsList: undefined;
  ItemDetails: { itemId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Scan: undefined;
  Items: NavigatorScreenParams<ItemsStackParamList> | undefined;
};

export type RootStackParamList = AuthStackParamList & {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type ItemsStackScreenProps<T extends keyof ItemsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ItemsStackParamList, T>,
  MainTabScreenProps<'Items'>
>;
