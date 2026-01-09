/**
 * AppNavigator.js
 * ----------------
 * Main navigation stack for the mobile application.
 *
 * This file defines the primary screen flow using React Navigation's
 * createStackNavigator. All app screens are mounted here, and each screen
 * is given a unique route name.
 *
 * The stack uses:
 *   - `headerShown: false` so every screen manages its own custom header UI.
 *   - Simple push-based navigation between form steps and detail screens.
 *
 * Screen Overview:
 *   • Menu       — Main dashboard screen that links to available forms.
 *   • Form1–Form4 — Multi-step form screens used to capture different data sets.
 *   • CardInfo   — A dynamic detail screen for viewing/editing submitted form data.
 *
 * Keeping navigation here ensures the app has a single, centralized routing entry point.
 */

import { createStackNavigator } from '@react-navigation/stack';
import MenuScreen from './MenuTabs';
import Form1Screen from './forms/Form1Screen';
import Form2Screen from './forms/Form2Screen';
import Form3Screen from './forms/Form3Screen';
import Form4Screen from './forms/Form4Screen';
import CardInfo from '../components/CardInfo';
import FilterScreen from '../components/FilterScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main menu / home screen */}
      <Stack.Screen name="Menu" component={MenuScreen} />

      {/* Multi-step form screens */}
      <Stack.Screen name="Form1" component={Form1Screen} />
      <Stack.Screen name="Form2" component={Form2Screen} />
      <Stack.Screen name="Form3" component={Form3Screen} />
      <Stack.Screen name="Form4" component={Form4Screen} />

      {/* Detailed form viewer / editor */}
      <Stack.Screen name="CardInfo" component={CardInfo} />
      <Stack.Screen name="FilterScreen" component={FilterScreen} />

    </Stack.Navigator>
  );
}
