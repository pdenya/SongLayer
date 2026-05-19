import _AntDesign from '@expo/vector-icons/AntDesign.js';
import { type IconProps } from '@expo/vector-icons/build/createIconSet.js';
import { Tabs } from 'expo-router';
import { fbs } from 'fbtee';
import { type FC } from 'react';
import colors from '../../../ui/colors.ts';

const AntDesign = _AntDesign as unknown as FC<IconProps<string>>;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <AntDesign
              color={focused ? colors.accent : colors.mutedText}
              name="profile"
              size={22}
            />
          ),
          title: String(fbs('Projects', 'Projects tab title')),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <AntDesign
              color={focused ? colors.accent : colors.mutedText}
              name="setting"
              size={22}
            />
          ),
          title: String(fbs('Settings', 'Settings tab title')),
        }}
      />
    </Tabs>
  );
}
